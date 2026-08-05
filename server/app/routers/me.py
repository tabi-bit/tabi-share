"""現在の session に紐付いた user 個人のリソース一覧 API。

認証済み user の場合、複数デバイスから同じ session_id を持っていなくても
同じ user_id 経由で共通の trip 一覧が返る。これがバックアップ用メール認証の
実効的な同期メカニズム。
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import decode_session_id
from app.db_connection import get_db_session
from app.models import Trip, UserSession, UserTripAccess

router = APIRouter(tags=["Me"], prefix="/me")


class MyTripsOut(BaseModel):
    url_ids: list[str]


@router.get(
    "/trips",
    summary="現在の session に紐付いた user がアクセス可能な trip の url_id 一覧",
    operation_id="me-list-trip-url-ids",
    response_model=MyTripsOut,
)
async def list_my_trip_url_ids(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> MyTripsOut:
    """認証済み user がアクセスできる trip の url_id を返す (デバイス間同期用)。

    - Cookie 無 / セッション無効 → 空配列
    - `archived = true` な trip は含めない (アーカイブは別 issue でフィルタ UI 追加予定)
    """
    session_id = decode_session_id(request)
    if session_id is None:
        return MyTripsOut(url_ids=[])
    result = await db.execute(
        select(Trip.url_id)
        .join(UserTripAccess, UserTripAccess.trip_id == Trip.id)
        .join(UserSession, UserSession.user_id == UserTripAccess.user_id)
        .where(
            UserSession.id == session_id,
            UserTripAccess.archived.is_(False),
        )
    )
    return MyTripsOut(url_ids=list(result.scalars()))
