"""
データベース接続管理モジュール

非同期データベース接続とセッション管理を提供
"""

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from app.config import get_settings

settings = get_settings()


def get_connect_args() -> dict[str, Any]:
    """asyncpg への接続引数

    Supavisor の transaction mode は prepared statement を保持できないため、
    asyncpg と SQLAlchemy の両方のキャッシュを無効にして、名前なしの statement で実行させる。
    """
    connect_args: dict[str, Any] = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
    ssl_context = settings.get_database_ssl()
    if ssl_context is not None:
        connect_args["ssl"] = ssl_context
    return connect_args


# 非同期エンジンの作成
engine: AsyncEngine = create_async_engine(
    settings.get_database_url(),
    echo=False,  # 本番環境では False
    pool_pre_ping=True,  # 接続の健全性チェック
    pool_size=5,  # 接続プールサイズ
    max_overflow=10,  # 最大オーバーフロー接続数
    connect_args=get_connect_args(),
)

# 非同期セッションファクトリ
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # コミット後もオブジェクトを使用可能
    autoflush=True,
    autocommit=False,
)

# SQLAlchemy Base クラス
Base = declarative_base()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    非同期データベースセッションを生成する依存性注入用関数

    Yields:
        AsyncSession: 非同期データベースセッション
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
