"""現在の session に紐付いた user 個人のリソース一覧 API。

認証済み user の場合、複数デバイスから同じ session_id を持っていなくても
同じ user_id 経由で共通の trip 一覧が返る。これがバックアップ用メール認証の
実効的な同期メカニズム。
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import decode_session_id, set_session_cookie
from app.db_connection import get_db_session
from app.models import Trip, UserSession, UserTripAccess
from app.schemas.trip import TripSummary

router = APIRouter(tags=["Me"], prefix="/me")


@router.get(
    "/trips",
    summary="現在の session に紐付いた user がアクセス可能な trip 一覧",
    operation_id="me-list-trips",
    response_model=list[TripSummary],
)
async def list_my_trips(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    archived: Annotated[bool, Query(description="アーカイブ済みのみを返すか")] = False,
) -> list[Trip]:
    """user がアクセスできる trip を返す (ホーム一覧・デバイス間同期の唯一の取得元)。

    Cookie 無 / セッション無効なら空配列。ホーム一覧しか開かない user でも
    session が 30 日で失効しないよう、ここで Cookie を再発行する。
    """
    session_id = decode_session_id(request)
    if session_id is None:
        return []
    session = await db.get(UserSession, session_id)
    if session is None:
        return []

    result = await db.execute(
        select(Trip)
        .join(UserTripAccess, UserTripAccess.trip_id == Trip.id)
        .where(
            UserTripAccess.user_id == session.user_id,
            UserTripAccess.archived.is_(archived),
        )
    )
    trips = list(result.scalars())

    session.last_seen_at = datetime.now(UTC)
    await db.commit()
    set_session_cookie(request, response, session_id)
    return trips
