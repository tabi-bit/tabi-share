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
# pool_pre_ping は使わない: DB (Neon us-east-1) との RTT が大きく、checkout ごとの
# SELECT 1 が 1 往復分のレイテンシーになるため。stale 接続は pool_recycle で防ぐ
# （接続先は Neon の pgbouncer pooler なので、コンピュートが suspend しても
# クライアント側接続は原則有効なまま）
engine: AsyncEngine = create_async_engine(
    settings.get_database_url(),
    echo=False,  # 本番環境では False
    pool_recycle=300,  # 古い接続を作り直して stale 接続を回避
    pool_size=5,  # 接続プールサイズ
    max_overflow=10,  # 最大オーバーフロー接続数
    connect_args={"ssl": True} if settings.ssl_required else {},
)

# 読み取り専用エンジン: AUTOCOMMIT でトランザクションを張らず、
# BEGIN / ROLLBACK の 2 往復分のレイテンシーを削減する（プールは engine と共有）
read_engine: AsyncEngine = engine.execution_options(isolation_level="AUTOCOMMIT")

# 非同期セッションファクトリ
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # コミット後もオブジェクトを使用可能
    autoflush=True,
    autocommit=False,
)

# 読み取り専用セッションファクトリ（SELECT のみのエンドポイント用）
ReadAsyncSessionLocal = async_sessionmaker(
    read_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,  # 読み取り専用のため flush 不要
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


async def get_read_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    読み取り専用（AUTOCOMMIT）セッションを生成する依存性注入用関数

    SELECT のみのエンドポイントで使用し、BEGIN / ROLLBACK の往復を省略する。

    Yields:
        AsyncSession: 読み取り専用の非同期データベースセッション
    """
    async with ReadAsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
