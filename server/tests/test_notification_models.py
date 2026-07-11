"""通知機能の DB スキーマに対する smoke test。

まだ CRUD 層は無いので、モデルの INSERT / 制約 / Pydantic スキーマの往復のみを確認する。
"""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DeviceSubscription, SentNotification
from app.schemas.block import Block as BlockSchema
from app.schemas.notification import (
    DeviceSubscription as DeviceSubscriptionSchema,
)
from app.schemas.notification import (
    DeviceSubscriptionCreate,
    SentNotificationCreate,
)
from app.schemas.notification import (
    SentNotification as SentNotificationSchema,
)
from app.schemas.trip import Trip


@pytest.mark.asyncio
async def test_device_subscription_insert_and_defaults(
    db_session: AsyncSession, test_create_trip: Trip
) -> None:
    """DeviceSubscription を INSERT すると DB 側で minutes_before/created_at がデフォルト値になる"""
    sub = DeviceSubscription(
        fcm_token="token-abc",
        trip_id=test_create_trip.id,
        timezone="Asia/Tokyo",
    )
    db_session.add(sub)
    await db_session.commit()
    await db_session.refresh(sub)

    assert sub.id is not None
    assert sub.minutes_before == 5
    assert sub.timezone == "Asia/Tokyo"
    assert sub.user_agent is None
    assert sub.created_at is not None
    assert sub.last_seen_at is not None


@pytest.mark.asyncio
async def test_device_subscription_unique_token_trip(
    db_session: AsyncSession, test_create_trip: Trip
) -> None:
    """同じ (fcm_token, trip_id) の二重購読は UNIQUE 制約で弾かれる"""
    db_session.add(
        DeviceSubscription(
            fcm_token="token-dup",
            trip_id=test_create_trip.id,
            timezone="Asia/Tokyo",
        )
    )
    await db_session.commit()

    db_session.add(
        DeviceSubscription(
            fcm_token="token-dup",
            trip_id=test_create_trip.id,
            timezone="Asia/Tokyo",
        )
    )
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_device_subscription_cascade_on_trip_delete(
    db_session: AsyncSession, test_create_trip: Trip
) -> None:
    """Trip 削除で device_subscriptions は CASCADE 削除される"""
    db_session.add(
        DeviceSubscription(
            fcm_token="token-cascade",
            trip_id=test_create_trip.id,
            timezone="Asia/Tokyo",
        )
    )
    await db_session.commit()

    from app.cruds import trips as trips_cruds

    await trips_cruds.delete_trip(db=db_session, trip_id=test_create_trip.id)

    remaining = (
        (
            await db_session.execute(
                select(DeviceSubscription).where(
                    DeviceSubscription.trip_id == test_create_trip.id
                )
            )
        )
        .scalars()
        .all()
    )
    assert remaining == []


@pytest.mark.asyncio
async def test_sent_notification_insert_and_pk_duplicate(
    db_session: AsyncSession, test_create_block: BlockSchema
) -> None:
    """SentNotification は複合 PK で二重送信をブロックする"""
    db_session.add(
        SentNotification(
            block_id=test_create_block.id,
            fcm_token="token-x",
            kind="before_5min",
        )
    )
    await db_session.commit()

    db_session.add(
        SentNotification(
            block_id=test_create_block.id,
            fcm_token="token-x",
            kind="before_5min",
        )
    )
    with pytest.raises(IntegrityError):
        await db_session.commit()


def test_device_subscription_create_schema_defaults() -> None:
    """DeviceSubscriptionCreate: minutes_before 未指定でデフォルト 5、user_agent は None"""
    payload = DeviceSubscriptionCreate(fcm_token="token", timezone="Asia/Tokyo")
    assert payload.minutes_before == 5
    assert payload.user_agent is None


def test_device_subscription_create_schema_rejects_out_of_range() -> None:
    """minutes_before の範囲外は ValidationError"""
    with pytest.raises(ValidationError):
        DeviceSubscriptionCreate(
            fcm_token="token", timezone="Asia/Tokyo", minutes_before=0
        )
    with pytest.raises(ValidationError):
        DeviceSubscriptionCreate(
            fcm_token="token", timezone="Asia/Tokyo", minutes_before=1000
        )


def test_device_subscription_schema_from_attributes() -> None:
    """ORM モデル → Pydantic 変換の smoke"""
    now = datetime.now(UTC)
    sub = DeviceSubscription(
        id=1,
        fcm_token="token",
        trip_id=42,
        minutes_before=5,
        timezone="Asia/Tokyo",
        user_agent=None,
        created_at=now,
        last_seen_at=now,
    )
    schema = DeviceSubscriptionSchema.model_validate(sub)
    assert schema.id == 1
    assert schema.trip_id == 42
    assert schema.minutes_before == 5


def test_sent_notification_schema_from_attributes() -> None:
    """SentNotification: ORM → Pydantic 変換"""
    now = datetime.now(UTC)
    row = SentNotification(block_id=1, fcm_token="t", kind="before_5min", sent_at=now)
    schema = SentNotificationSchema.model_validate(row)
    assert schema.block_id == 1
    assert schema.kind == "before_5min"


def test_sent_notification_create_schema_smoke() -> None:
    """SentNotificationCreate: フィールド構築の smoke"""
    payload = SentNotificationCreate(block_id=1, fcm_token="t", kind="before_5min")
    assert payload.block_id == 1
    assert payload.kind == "before_5min"
