"""
アプリケーション設定管理モジュール

環境変数からの設定読み込みと型安全な管理を提供
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション設定クラス"""

    # データベース設定
    # Neon の DATABASE_URL 形式: postgresql://user:pass@host/dbname
    # ローカル開発では個別の環境変数から構築
    database_url: str | None = None
    postgres_user: str | None = None
    postgres_password: str | None = None
    postgres_host: str = "localhost"
    postgres_port: str = "5432"
    postgres_db: str | None = None

    # テストデータベース設定
    test_postgres_user: str | None = None
    test_postgres_password: str | None = None
    test_postgres_host: str = "localhost"
    test_postgres_port: str = "5432"
    test_postgres_db: str | None = None

    # アプリケーション設定
    environment: str = "development"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    def get_database_url(self) -> str:
        """
        データベースURLを取得

        優先順位:
        1. DATABASE_URL 環境変数 (Neon用)
        2. 個別の POSTGRES_* 環境変数から構築 (ローカル開発用)
        """
        if self.database_url:
            # asyncpg用のURLに変換し、psycopg2固有のパラメータを削除
            # (sslmode, channel_bindingなどはasyncpgで非対応)
            url = self.database_url.replace(
                "postgresql://", "postgresql+asyncpg://"
            )
            # クエリパラメータを削除（asyncpgは自動的にSSLを使用）
            return url.split("?")[0]

        if not all([
            self.postgres_user,
            self.postgres_password,
            self.postgres_db
        ]):
            raise ValueError(
                "DATABASE_URL または POSTGRES_* 環境変数が設定されていません"
            )

        return (
            f"postgresql+asyncpg://{self.postgres_user}:"
            f"{self.postgres_password}@{self.postgres_host}:"
            f"{self.postgres_port}/{self.postgres_db}"
        )

    def get_test_database_url(self) -> str:
        """テストデータベースURLを取得"""
        test_user = self.test_postgres_user or self.postgres_user
        test_password = self.test_postgres_password or self.postgres_password
        test_host = self.test_postgres_host or self.postgres_host
        test_port = self.test_postgres_port or self.postgres_port
        test_db = self.test_postgres_db

        if not all([test_user, test_password, test_db]):
            raise ValueError("テストデータベースの環境変数が不足しています")

        return (
            f"postgresql+asyncpg://{test_user}:"
            f"{test_password}@{test_host}:"
            f"{test_port}/{test_db}"
        )


@lru_cache
def get_settings() -> Settings:
    """
    シングルトンパターンで設定を取得

    Returns:
        Settings: アプリケーション設定インスタンス
    """
    return Settings()
