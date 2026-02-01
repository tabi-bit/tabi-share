"""
データベース接続管理モジュール

非同期データベース接続とセッション管理を提供
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from app.config import get_settings

settings = get_settings()

# 非同期エンジンの作成
engine: AsyncEngine = create_async_engine(
    settings.get_database_url(),
    echo=False,  # 本番環境では False
    pool_pre_ping=True,  # 接続の健全性チェック
    pool_size=5,  # 接続プールサイズ
    max_overflow=10,  # 最大オーバーフロー接続数
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
