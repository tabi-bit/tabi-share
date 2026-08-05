"""通知購読 API (端末 × Trip 単位)。

- POST   /trips/{trip_id}/subscription: 購読作成/更新
- DELETE /trips/{trip_id}/subscription: 購読解除
- GET    /trips/{trip_id}/subscription: 購読状態取得
- POST   /trips/{trip_id}/subscription/test: テスト送信 (1秒 rate limit)

認可は既存の Cookie ベース `require_trip_access` を再利用する。
"""

import logging
import time
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_trip_access
from app.config import get_settings
from app.cruds import notification as notif_cruds
from app.cruds import trips as trips_cruds
from app.db_connection import get_db_session
from app.errors import NotFound
from app.firebase import send_fcm
from app.schemas.notification import DeviceSubscription, DeviceSubscriptionCreate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Notifications"], prefix="/trips/{trip_id}/subscription")

_TEST_SEND_RATE_LIMIT_SECONDS = 1.0
# in-memory rate limiter (fcm_token → last test-send monotonic timestamp).
# Cloud Run は基本 min_instances=1 の単一プロセスで、スパム防止用途としては十分。
# 複数インスタンス起動時にすり抜ける可能性はあるが影響は無視可。
_test_send_last_sent: dict[str, float] = {}


def get_fcm_token_from_header(
    x_fcm_token: Annotated[
        str,
        Header(
            min_length=1,
            max_length=500,
            alias="X-FCM-Token",
            description="FCM registration token. URL クエリではなく header で受け取ることでアクセスログへの露出を避ける",
        ),
    ],
) -> str:
    return x_fcm_token


@router.post(
    "",
    summary="通知購読の作成/更新",
    operation_id="notification-subscribe",
    response_model=DeviceSubscription,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe(
    trip_id: Annotated[int, Depends(require_trip_access)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    payload: DeviceSubscriptionCreate,
) -> DeviceSubscription:
    """指定 Trip に対して端末を購読させる。既存があれば timezone/minutes_before/user_agent を更新。"""
    sub = await notif_cruds.upsert_subscription(db, trip_id=trip_id, payload=payload)
    return DeviceSubscription.model_validate(sub)


@router.delete(
    "",
    summary="通知購読の解除",
    operation_id="notification-unsubscribe",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def unsubscribe(
    fcm_token: Annotated[str, Depends(get_fcm_token_from_header)],
    trip_id: Annotated[int, Depends(require_trip_access)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    """指定 (fcm_token, trip_id) の購読を解除する。存在しなくても 204。"""
    await notif_cruds.delete_subscription(db, trip_id=trip_id, fcm_token=fcm_token)


@router.get(
    "",
    summary="通知購読状態の取得",
    operation_id="notification-get",
    response_model=DeviceSubscription | None,
)
async def get_subscription(
    fcm_token: Annotated[str, Depends(get_fcm_token_from_header)],
    trip_id: Annotated[int, Depends(require_trip_access)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DeviceSubscription | None:
    """指定 (fcm_token, trip_id) の購読レコードを返す。無ければ null。"""
    sub = await notif_cruds.get_subscription(db, trip_id=trip_id, fcm_token=fcm_token)
    if sub is None:
        return None
    return DeviceSubscription.model_validate(sub)


@router.post(
    "/test",
    summary="テスト通知の送信",
    operation_id="notification-test-send",
    status_code=status.HTTP_202_ACCEPTED,
)
async def send_test_notification(
    fcm_token: Annotated[str, Depends(get_fcm_token_from_header)],
    trip_id: Annotated[int, Depends(require_trip_access)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, str]:
    """自端末にテスト通知を即座に送信する (二重クリック防止で 1 秒に 1 回まで)。"""
    sub = await notif_cruds.get_subscription(db, trip_id=trip_id, fcm_token=fcm_token)
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found"
        )

    now = time.monotonic()
    last = _test_send_last_sent.get(fcm_token)
    if last is not None and (now - last) < _TEST_SEND_RATE_LIMIT_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {_TEST_SEND_RATE_LIMIT_SECONDS} seconds between test sends",
        )

    trip = await trips_cruds.get_trip(db, trip_id)
    if trip is None:
        raise NotFound(message="Trip not found")

    settings = get_settings()
    frontend_base = (
        "https://tabishare.net"
        if settings.environment == "production"
        else "https://st.tabishare.net"
    )
    try:
        send_fcm(
            token=fcm_token,
            title="たびしぇあ テスト通知",
            body=f"通知が正常に届いています\n{trip.title}",
            data={"kind": "test", "tripId": str(trip_id), "urlId": trip.url_id},
            icon_url=f"{frontend_base}/icons/notify/test.png",
            badge_url=f"{frontend_base}/icons/notify/badge.png",
            tag=f"test-{trip_id}",
            renotify=True,
        )
    except Exception:
        logger.exception("Test FCM send failed", extra={"trip_id": trip_id})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send test notification",
        ) from None
    # 送信成功時のみタイムスタンプ更新: FCM 失敗や Trip 未検出時に無駄に待たされる UX を回避
    _test_send_last_sent[fcm_token] = now

    return {"status": "sent"}
