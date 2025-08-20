import os

import pytest
from app.db_connection import Base, get_db_session
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_USER = os.getenv("TEST_POSTGRES_USER", "tabishare_test_user")
TEST_DB_PASSWORD = os.getenv("TEST_POSTGRES_PASSWORD", "tabishare_test_password")
TEST_DB_HOST = os.getenv("TEST_POSTGRES_HOST", "localhost")
TEST_DB_PORT = os.getenv("TEST_POSTGRES_PORT", "5432")
TEST_DB_NAME = os.getenv("TEST_POSTGRES_DB", "tabishare_db_test")

TEST_DATABASE_URL = f"postgresql+psycopg2://{TEST_DB_USER}:{TEST_DB_PASSWORD}@{TEST_DB_HOST}:{TEST_DB_PORT}/{TEST_DB_NAME}"


# 2. テスト用のDBエンジンとセッションを作成
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# 3. テスト中は、DBへの接続(get_db)をテスト用のものに書き換える
def override_get_db_session():
    """テスト用のDBセッションを生成する関数"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


# FastAPIアプリケーションのDI(依存性注入)をオーバーライド
app.dependency_overrides[get_db_session] = override_get_db_session


# 4. 各テストで使用するDBセッションを提供するFixture
@pytest.fixture(scope="function")
def db_session():
    """テストの前後でDBのテーブルを初期化するFixture"""
    # --- セットアップ: テスト前にテーブルを全て作成 ---
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # ★ 2. 作成したセッションをテスト関数に渡す
        yield db
    finally:
        # ★ 3. テスト終了後、セッションを必ず閉じる
        db.close()

    # --- ティアダウン: テスト後にテーブルを全て削除 ---
    Base.metadata.drop_all(bind=engine)


# 5. 各テストで使用するAPIクライアントを提供するFixture
@pytest.fixture(scope="module")
def client():
    """テスト用のAPIクライアントを生成するFixture"""
    with TestClient(app) as c:
        yield c
