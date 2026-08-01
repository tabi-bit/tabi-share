"""
Cloud Scheduler → Cloud Run の OIDC 認証検証

Cloud Scheduler は HTTP ターゲット呼び出し時に、指定した SA から発行された OIDC トークンを
`Authorization: Bearer <id_token>` ヘッダに付与する。Cloud Run 側 (このアプリケーション)
では以下を検証する:

1. Google の公開鍵で署名を検証
2. audience が自身の Cloud Run サービス URL と一致
3. issuer が `https://accounts.google.com`
4. email クレームが `tabi-share-notify-scheduler` SA と一致
"""

import logging

from fastapi import HTTPException, Request, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.config import get_settings

logger = logging.getLogger(__name__)

_ALLOWED_ISSUERS = ("https://accounts.google.com", "accounts.google.com")


def verify_cloud_scheduler_oidc(request: Request) -> None:
    """Cloud Scheduler が発行した OIDC トークンを検証する FastAPI 依存性。

    設定値 (Cloud Run で環境変数から供給):
    - `NOTIFY_TICK_ALLOWED_AUDIENCE`: Cloud Run サービス URL
    - `NOTIFY_TICK_ALLOWED_SA_EMAIL`: Cloud Scheduler 用 SA のメールアドレス
    - `NOTIFY_TICK_DEV_BYPASS_OIDC`: development でのみ検証をスキップ (staging / production は強制無効)
    """
    settings = get_settings()

    if settings.notify_tick_dev_bypass_oidc and settings.environment == "development":
        logger.warning(
            "OIDC verification bypassed (dev flag): environment=%s",
            settings.environment,
        )
        return

    if (
        not settings.notify_tick_allowed_audience
        or not settings.notify_tick_allowed_sa_email
    ):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OIDC verification is not configured on the server",
        )

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing OIDC token",
        )

    token = auth_header.removeprefix("Bearer ").strip()

    try:
        claims = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=settings.notify_tick_allowed_audience,
        )
    except ValueError as exc:
        logger.warning("OIDC verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OIDC token",
        ) from exc

    if claims.get("iss") not in _ALLOWED_ISSUERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unexpected issuer",
        )

    if claims.get("email") != settings.notify_tick_allowed_sa_email:
        logger.warning(
            "OIDC token email mismatch: %s (expected %s)",
            claims.get("email"),
            settings.notify_tick_allowed_sa_email,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized service account",
        )

    if not claims.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Service account email is not verified",
        )
