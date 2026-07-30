from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

FCM_TOKEN_MAX_LENGTH = 500
TIMEZONE_MAX_LENGTH = 64
USER_AGENT_MAX_LENGTH = 500
NOTIFICATION_KIND_MAX_LENGTH = 30

MINUTES_BEFORE_MIN = 1
MINUTES_BEFORE_MAX = 120
MINUTES_BEFORE_DEFAULT = 5


class DeviceSubscriptionBase(BaseModel):
    fcm_token: str = Field(min_length=1, max_length=FCM_TOKEN_MAX_LENGTH)
    timezone: str = Field(min_length=1, max_length=TIMEZONE_MAX_LENGTH)
    minutes_before: int = Field(
        default=MINUTES_BEFORE_DEFAULT,
        ge=MINUTES_BEFORE_MIN,
        le=MINUTES_BEFORE_MAX,
    )
    user_agent: str | None = Field(default=None, max_length=USER_AGENT_MAX_LENGTH)


class DeviceSubscriptionCreate(DeviceSubscriptionBase):
    """クライアントからの購読リクエスト。

    trip_id は URL パスから取り、リクエストボディには含めない前提。
    """

    pass


class DeviceSubscription(DeviceSubscriptionBase):
    id: int
    trip_id: int
    created_at: datetime
    last_seen_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SentNotificationBase(BaseModel):
    block_id: int
    fcm_token: str = Field(min_length=1, max_length=FCM_TOKEN_MAX_LENGTH)
    kind: str = Field(min_length=1, max_length=NOTIFICATION_KIND_MAX_LENGTH)


class SentNotificationCreate(SentNotificationBase):
    pass


class SentNotification(SentNotificationBase):
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)
