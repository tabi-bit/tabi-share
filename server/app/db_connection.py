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
    echo=False,
    # チェックアウト時の SELECT 1 を省略 (1 RTT 削減)。代わりに pool_recycle で
    # 古い接続を破棄し、まれな切断は SQLAlchemy の自動 reconnect に任せる。
    pool_pre_ping=False,
    pool_size=5,
    max_overflow=10,
    # 10 分以上経った接続は次回 checkout 時に破棄して再確立。Neon Pooler 側の
    # 接続切断やネットワーク中断を握り潰さないための保険。
    pool_recycle=600,
    connect_args={"ssl": True} if settings.ssl_required else {},
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
