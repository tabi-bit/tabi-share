"""
認証・認可モジュール

- Basic 認証: APIドキュメントや管理系エンドポイントの保護
- Cookie 認可: urlId 付き Trip ページへのアクセスを起点として署名付き Cookie (JWT) を発行し、
  以降のリクエストで Cookie 内の許可済み trip_id リストを検証して認可を行う。
"""

import secrets
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db_connection import get_db_session
from app.errors import Forbidden, NotFound
from app.models import Block, Page

# ---- Basic 認証 ----

def require_basic_auth(
    credentials: HTTPBasicCredentials = Depends(HTTPBasic()),
) -> None:
    """Basic 認証で保護する。APIドキュメントや管理系エンドポイントで使用。"""
    settings = get_settings()
    valid_username = secrets.compare_digest(
        credentials.username.encode(), settings.api_docs_username.encode()
    )
    valid_password = secrets.compare_digest(
        credentials.password.encode(), settings.api_docs_password.encode()
    )
    if not (valid_username and valid_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました",
            headers={"WWW-Authenticate": "Basic"},
        )

COOKIE_PREFIX = "tabishare_trip_"


def get_allowed_trip_ids(request: Request) -> set[int]:
    """Cookie から許可済み trip_id のセットを取得する。

    tabishare_trip_{id} 形式の各Cookieを検証し、有効なtrip_idを収集する。
    """
    trip_ids: set[int] = set()
    settings = get_settings()
    for name, raw in request.cookies.items():
        if not name.startswith(COOKIE_PREFIX):
            continue
        try:
            payload = jwt.decode(raw, settings.cookie_secret_key, algorithms=["HS256"])
            tid = payload.get("trip_id")
            if isinstance(tid, int):
                trip_ids.add(tid)
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
            continue
    return trip_ids


def _set_trip_cookie(response: Response, trip_id: int) -> None:
    """単一のtrip_id用の署名付きCookieを発行する。"""
    settings = get_settings()
    payload = {
        "trip_id": trip_id,
        "exp": datetime.now(UTC) + timedelta(seconds=settings.cookie_max_age),
    }
    token = jwt.encode(payload, settings.cookie_secret_key, algorithm="HS256")

    is_production = settings.environment != "development"
    response.set_cookie(
        key=f"{COOKIE_PREFIX}{trip_id}",
        value=token,
        max_age=settings.cookie_max_age,
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        path="/",
    )


def grant_trip_access(response: Response, trip_id: int) -> None:
    """指定したtrip_idへのアクセス権をCookieで付与する。"""
    _set_trip_cookie(response, trip_id)


# ---- FastAPI Depends 用の認可関数 ----


def require_trip_access(trip_id: int, request: Request) -> int:
    """パスパラメータの trip_id へのアクセス権を Cookie で検証する。"""
    allowed = get_allowed_trip_ids(request)
    if trip_id not in allowed:
        raise Forbidden()
    return trip_id


async def require_page_access(
    page_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> int:
    """page_id から trip_id を解決し、アクセス権を検証する。"""
    result = await db.execute(select(Page.trip_id).where(Page.id == page_id))
    trip_id = result.scalar_one_or_none()
    if trip_id is None:
        raise NotFound(message="Page not found")

    allowed = get_allowed_trip_ids(request)
    if trip_id not in allowed:
        raise Forbidden()
    return trip_id


async def require_block_access(
    block_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> int:
    """block_id から trip_id を解決し、アクセス権を検証する。"""
    result = await db.execute(
        select(Page.trip_id)
        .join(Block, Block.page_id == Page.id)
        .where(Block.id == block_id)
    )
    trip_id = result.scalar_one_or_none()
    if trip_id is None:
        raise NotFound(message="Block not found")

    allowed = get_allowed_trip_ids(request)
    if trip_id not in allowed:
        raise Forbidden()
    return trip_id
