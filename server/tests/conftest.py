import logging

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config import get_settings
from app.cruds import pages as pages_cruds
from app.cruds import trips as trips_cruds
from app.db_connection import Base, get_db_session
from app.main import app
from app.schemas.page import Page, PageCreate
from app.schemas.trip import Trip, TripCreateIn

settings = get_settings()

# テスト用の非同期エンジン
test_engine: AsyncEngine = create_async_engine(
    settings.get_test_database_url(),
    echo=False,
    poolclass=NullPool,
)

# テスト用の非同期セッションファクトリ
TestingAsyncSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=True,
    autocommit=False,
)


async def override_get_db_session():
    """テスト用の非同期DBセッションを生成する関数"""
    async with TestingAsyncSessionLocal() as session:
        yield session


app.dependency_overrides[get_db_session] = override_get_db_session


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_database():
    """テストの前後でDBのテーブルを初期化する非同期Fixture"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    try:
        async with test_engine.begin() as conn:
            await conn.execute(
                text("TRUNCATE TABLE blocks, pages, trips RESTART IDENTITY CASCADE")
            )
    except Exception as e:
        logging.warning("テーブルのクリーンアップ中にエラーが発生しました: %s", e)


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """テスト用の非同期DBセッションを提供するFixture"""
    async with TestingAsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client():
    """テスト用の非同期APIクライアントを生成するFixture"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest_asyncio.fixture
async def test_create_trip(db_session: AsyncSession) -> Trip:
    """テスト用のTripを作成して、Tripを返すフィクスチャ"""
    trip_in = TripCreateIn(
        title="test trip for fixture", detail="test detail for fixture"
    )
    trip_id = await trips_cruds.create_trip(
        db=db_session, trip=trip_in, url_id="test_url_id_fixture"
    )
    return await trips_cruds.get_trip(db=db_session, trip_id=trip_id)


@pytest_asyncio.fixture
async def test_create_page(db_session: AsyncSession, test_create_trip: Trip) -> Page:
    """前提データとしてPageを作成し、Pageを返すフィクスチャ"""
    page_in = PageCreate(title="test page")
    db_page = await pages_cruds.create_page(
        db=db_session, page=page_in, trip_id=test_create_trip.id
    )
    return await pages_cruds.get_page(db=db_session, page_id=db_page.id)
