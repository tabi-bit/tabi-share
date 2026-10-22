"""
アプリケーション設定管理モジュール

環境変数からの設定読み込みと型安全な管理を提供
"""

import re
import ssl
from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_ROOT = Path(__file__).resolve().parent.parent

PRODUCTION_FRONTEND_ORIGIN = "https://tabishare.net"
PREVIEW_ORIGIN_REGEX = r"https://tabi-share-8ef6b--[a-z0-9-]+\.web\.app"


class Settings(BaseSettings):
    """アプリケーション設定クラス"""

    # データベース設定
    # DATABASE_URL 形式: postgresql://user:pass@host:port/dbname?sslrootcert=<CA ファイル>
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

    # APIドキュメント Basic 認証設定
    api_docs_username: str = "admin"
    api_docs_password: str = "admin"

    # Cookie署名用シークレットキー（本番では環境変数 COOKIE_SECRET_KEY で設定）
    cookie_secret_key: str = "change-me-in-production"
    # Cookie有効期限（秒）デフォルト30日
    cookie_max_age: int = 60 * 60 * 24 * 30

    # アプリケーション設定
    environment: str = "development"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:3000",
        "https://tabishare.net",
        "https://st.tabishare.net",
    ]

    # 通知機能 (FCM)
    # デフォルト False (FCM 送信スキップ、log 出力のみ)。ローカルで実 FCM を試す場合は
    # `.env` で true に切替 (docs/notifications.md §10.4)。Cloud Run では deploy-backend.yml で設定する。
    notifications_enabled: bool = False
    # Firebase Admin SDK が `create_custom_token` で使う SA email。
    # 空文字なら SDK のメタデータサーバー経由での自動検出に任せる (Cloud Run 上の通常経路)。
    # 明示指定するとメタデータ経由の SA 検出を skip して IAM SignBlob API を使うため、
    # ローカルで自分の user credentials に `iam.serviceAccountTokenCreator` を SA に対して
    # 付与すれば手元で signBlob 経由で試せる。
    firebase_admin_sa_email: str = ""
    # Cloud Scheduler → Cloud Run tick エンドポイントの OIDC 検証用
    notify_tick_allowed_audience: str = ""
    notify_tick_allowed_sa_email: str = ""
    # development でのみ OIDC 検証をスキップする (staging / production では強制無効化される)
    notify_tick_dev_bypass_oidc: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        """CORS と送信元の検証で許可する Origin。本番は本番フロントエンドだけに絞る。"""
        if self.environment == "production":
            return [PRODUCTION_FRONTEND_ORIGIN]
        return self.cors_origins

    @property
    def allowed_origin_regex(self) -> str | None:
        """Firebase Hosting のプレビューチャンネル。プレビューはステージング API を使うため本番では許可しない。"""
        if self.environment == "production":
            return None
        return PREVIEW_ORIGIN_REGEX

    def is_allowed_origin(self, origin: str) -> bool:
        if origin in self.allowed_origins:
            return True
        regex = self.allowed_origin_regex
        return regex is not None and re.fullmatch(regex, origin) is not None

    def get_database_ssl(self) -> ssl.SSLContext | None:
        """DATABASE_URL 接続用の SSL 設定。証明書チェーンとホスト名を検証する (verify-full 相当)

        sslrootcert (SERVER_ROOT からの相対パス) があればその CA で検証する。
        Supabase の中間 CA は Key Usage 拡張を持たず、Python 3.13 既定の
        VERIFY_X509_STRICT で拒否されるため、strict 検証だけを外す。
        """
        if not self.database_url:
            return None
        params = parse_qs(urlparse(self.database_url).query)
        if "sslrootcert" not in params:
            return ssl.create_default_context()
        context = ssl.create_default_context(
            cafile=str(SERVER_ROOT / params["sslrootcert"][0])
        )
        context.verify_flags &= ~ssl.VERIFY_X509_STRICT
        return context

    def get_database_url(self) -> str:
        """
        データベースURLを取得

        優先順位:
        1. DATABASE_URL 環境変数 (stg / prod)
        2. 個別の POSTGRES_* 環境変数から構築 (ローカル開発用)
        """
        if self.database_url:
            # asyncpg 用に URL スキームを変換
            url = self.database_url.replace("postgresql://", "postgresql+asyncpg://")
            # libpq 専用のパラメータは asyncpg が受け付けないため除去する
            # (SSL は get_database_ssl() で connect_args に渡す)
            parsed = urlparse(url)
            params = {
                k: v[0]
                for k, v in parse_qs(parsed.query).items()
                if k not in ("sslmode", "sslrootcert", "channel_binding")
            }
            return urlunparse(parsed._replace(query=urlencode(params)))

        if not all([self.postgres_user, self.postgres_password, self.postgres_db]):
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
