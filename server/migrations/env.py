import asyncio
import os
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app import models  # noqa: F401
from app.config import get_settings
from app.db_connection import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

load_dotenv()

settings = get_settings()

# --- 開発データベース (devdb) の設定 ---
# Neon本番環境では DATABASE_URL を使用
# ローカル開発では POSTGRES_* から構築
if os.getenv("DATABASE_URL"):
    # Neon本番環境用
    dev_database_url = os.getenv("DATABASE_URL").replace(
        "postgresql://", "postgresql+asyncpg://"
    )
else:
    # ローカル開発用
    dev_database_url = settings.get_database_url()

# Alembicの設定にデータベースURLをセット
config.set_section_option("devdb", "sqlalchemy.url", dev_database_url)

# --- テストデータベース (testdb) の設定 ---
# testdb セクションで実行する場合のみ URL を解決する（CI/Cloud Run 環境では不要）
try:
    test_database_url = settings.get_test_database_url()
    config.set_section_option("testdb", "sqlalchemy.url", test_database_url)
except ValueError:
    pass

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """実際のマイグレーション実行処理"""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """非同期モードでマイグレーションを実行"""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
