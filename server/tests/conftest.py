from app.schemas.page import Page
import os

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.cruds import pages as pages_cruds
from app.cruds import trips as trips_cruds
from app.db_connection import Base, get_db_session
from app.main import app
from app.schemas.page import PageCreate
from app.schemas.trip import Trip, TripCreateIn

TEST_DB_USER = os.getenv("TEST_POSTGRES_USER", "tabishare_test_user")
TEST_DB_PASSWORD = os.getenv("TEST_POSTGRES_PASSWORD", "tabishare_test_password")
TEST_DB_HOST = os.getenv("TEST_POSTGRES_HOST", "localhost")
TEST_DB_PORT = os.getenv("TEST_POSTGRES_PORT", "5432")
TEST_DB_NAME = os.getenv("TEST_POSTGRES_DB", "tabishare_db_test")

TEST_DATABASE_URL = f"postgresql+psycopg2://{TEST_DB_USER}:{TEST_DB_PASSWORD}@{TEST_DB_HOST}:{TEST_DB_PORT}/{TEST_DB_NAME}"


engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db_session():
    """テスト用のDBセッションを生成する関数"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db_session] = override_get_db_session


@pytest.fixture(scope="function")
def db_session():
    """テストの前後でDBのテーブルを初期化するFixture"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client():
    """テスト用のAPIクライアントを生成するFixture"""
    with TestClient(app) as c:
        yield c


@pytest_asyncio.fixture
async def test_create_trip(db_session: Session) -> Trip:
    """テスト用のTripを作成して、Tripを返すフィクスチャ"""
    trip_in = TripCreateIn(
        title="test trip for fixture", detail="test detail for fixture"
    )
    trip_id = await trips_cruds.create_trip(
        db=db_session, trip=trip_in, url_id="test_url_id_fixture"
    )
    return await trips_cruds.get_trip(db=db_session, trip_id=trip_id)  # type: ignore


@pytest_asyncio.fixture
async def test_create_page(db_session: Session, test_create_trip: Trip) -> Page:
    """前提データとしてPageを作成し、Pageを返すフィクスチャ"""
    page_in = PageCreate(title="test page")
    db_page = await pages_cruds.create_page(
        db=db_session, page=page_in, trip_id=test_create_trip.id
    )
    return await pages_cruds.get_page(db=db_session, page_id=db_page.id)  # type: ignore
