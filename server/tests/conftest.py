import logging
from datetime import UTC, datetime, timedelta

import jwt as pyjwt
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

from app import db_connection
from app.auth import SESSION_COOKIE_NAME, generate_session_id
from app.config import get_settings
from app.cruds import blocks as blocks_cruds
from app.cruds import pages as pages_cruds
from app.cruds import trips as trips_cruds
from app.db_connection import Base, get_db_session
from app.main import app
from app.models import User, UserSession, UserTripAccess
from app.observability import setup_sqlalchemy_instrumentation
from app.schemas.block import Block as BlockSchema
from app.schemas.block import BlockCreate
from app.schemas.page import Page, PageCreate
from app.schemas.trip import Trip, TripCreateIn

settings = get_settings()

# テスト用の非同期エンジン
test_engine: AsyncEngine = create_async_engine(
    settings.get_test_database_url(),
    echo=False,
    poolclass=NullPool,
)

# 計装 SQL イベントをテスト engine にも attach し、ミドルウェア出力が
# 本番と同じ統計を持つようにする
setup_sqlalchemy_instrumentation(test_engine)

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

# LegacyCookieMigrationMiddleware は Depends を経由せず db_connection.AsyncSessionLocal を
# 属性 lookup で参照している。テスト用エンジンで動かすため、ここで factory を差し替える。
db_connection.AsyncSessionLocal = TestingAsyncSessionLocal


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_database():
    """テストの前後でDBのテーブルを初期化する非同期Fixture"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield

    try:
        async with test_engine.begin() as conn:
            await conn.execute(
                text(
                    "TRUNCATE TABLE user_trip_access, sessions, users, "
                    "blocks, locations, pages, trips "
                    "RESTART IDENTITY CASCADE"
                )
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


def _make_session_cookie_value(session_id: str) -> str:
    """テスト用: session_id を持つ署名付きセッション Cookie (JWT) の値を生成する"""
    payload = {
        "session_id": session_id,
        "exp": datetime.now(UTC) + timedelta(seconds=settings.cookie_max_age),
    }
    return pyjwt.encode(payload, settings.cookie_secret_key, algorithm="HS256")


async def _create_session_with_trip_access(db: AsyncSession, trip_id: int) -> str:
    """テスト用: 匿名 user + session + user_trip_access を作成して session_id を返す"""
    user = User()
    db.add(user)
    await db.flush()

    session_id = generate_session_id()
    db.add(UserSession(id=session_id, user_id=user.id))
    db.add(UserTripAccess(user_id=user.id, trip_id=trip_id))
    await db.commit()
    return session_id


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


@pytest_asyncio.fixture
async def test_create_block(
    db_session: AsyncSession, test_create_page: Page
) -> BlockSchema:
    """テスト用のBlockを作成して返すフィクスチャ"""
    block_in = BlockCreate(
        title="test block",
        start_time=datetime(2023, 1, 1, 10, 0, 0, tzinfo=UTC),
        detail="test detail",
        block_type="event",
    )
    db_block = await blocks_cruds.create_block(
        db=db_session, block=block_in, page_id=test_create_page.id
    )
    return await blocks_cruds.get_block(db=db_session, block_id=db_block.id)


@pytest_asyncio.fixture
async def authed_client(
    client: AsyncClient, db_session: AsyncSession, test_create_trip: Trip
) -> AsyncClient:
    """test_create_trip で作成された Trip へのアクセス権を持つ session Cookie を発行"""
    session_id = await _create_session_with_trip_access(db_session, test_create_trip.id)
    client.cookies.set(
        SESSION_COOKIE_NAME,
        _make_session_cookie_value(session_id),
    )
    return client
