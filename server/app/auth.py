"""
Cookie ベースの認可モジュール

urlId 付き Trip ページへのアクセスを起点として署名付き Cookie (JWT) を発行し、
以降のリクエストで Cookie 内の許可済み trip_id リストを検証して認可を行う。
"""

from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db_connection import get_db_session
from app.errors import Forbidden, NotFound
from app.models import Block, Page

COOKIE_NAME = "tabishare_access"


def get_allowed_trip_ids(request: Request) -> set[int]:
    """Cookie から許可済み trip_id のセットを取得する。

    Cookie がない、署名が無効、有効期限切れの場合は空セットを返す。
    """
    raw = request.cookies.get(COOKIE_NAME)
    if not raw:
        return set()
    try:
        settings = get_settings()
        payload = jwt.decode(raw, settings.cookie_secret_key, algorithms=["HS256"])
        return set(payload.get("trip_ids", []))
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return set()


def set_access_cookie(response: Response, trip_ids: set[int]) -> None:
    """JWT を生成してレスポンスに署名付き Cookie をセットする。"""
    settings = get_settings()
    payload = {
        "trip_ids": sorted(trip_ids),
        "exp": datetime.now(UTC) + timedelta(seconds=settings.cookie_max_age),
    }
    token = jwt.encode(payload, settings.cookie_secret_key, algorithm="HS256")

    is_production = settings.environment != "development"
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=settings.cookie_max_age,
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        path="/",
    )


def add_trip_to_access_cookie(
    request: Request, response: Response, trip_id: int
) -> None:
    """既存 Cookie の trip_ids に新しい trip_id を追加して再発行する。"""
    existing = get_allowed_trip_ids(request)
    existing.add(trip_id)
    set_access_cookie(response, existing)


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
