"""DATABASE_URL から asyncpg 用の URL と SSL 設定を組み立てる処理の単体テスト。"""

import ssl

from app.config import Settings

SUPABASE_URL = (
    "postgresql://postgres.ref:pass@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
    "?sslmode=verify-full&sslrootcert=certs/supabase-prod-ca-2021.crt"
)


def test_get_database_url_strips_libpq_only_params() -> None:
    url = Settings(
        database_url=f"{SUPABASE_URL}&channel_binding=require&application_name=api"
    ).get_database_url()

    assert url == (
        "postgresql+asyncpg://postgres.ref:pass@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
        "?application_name=api"
    )


def test_get_database_ssl_is_none_without_database_url() -> None:
    assert Settings(database_url=None).get_database_ssl() is None


def test_get_database_ssl_uses_system_ca_without_sslrootcert() -> None:
    context = Settings(
        database_url="postgresql://u:p@db.example.com/app?sslmode=verify-full"
    ).get_database_ssl()

    assert context is not None
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname
    assert context.verify_flags & ssl.VERIFY_X509_STRICT


def test_get_database_ssl_trusts_only_sslrootcert() -> None:
    context = Settings(database_url=SUPABASE_URL).get_database_ssl()

    assert context is not None
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.check_hostname
    assert not context.verify_flags & ssl.VERIFY_X509_STRICT
    [ca] = context.get_ca_certs()
    assert dict(field[0] for field in ca["subject"])["commonName"] == (
        "Supabase Root 2021 CA"
    )
