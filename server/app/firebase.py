"""
Firebase Admin SDK 初期化と FCM 送信ヘルパー

- Cloud Run 上では Application Default Credentials (ADC) が
  runtime SA (tabi-share-api-runtime) の権限で自動的に使われる。
- ローカルでは NOTIFICATIONS_ENABLED=false で送信をスキップする。
"""

import logging
from typing import Any

import firebase_admin
from firebase_admin import messaging

from app.config import get_settings

logger = logging.getLogger(__name__)


def _webpush_notification(
    icon_url: str | None,
    badge_url: str | None,
    tag: str | None,
    renotify: bool,
) -> messaging.WebpushNotification | None:
    """WebpushNotification を組み立てる (icon/badge は docs §5、tag/renotify は §5b)。

    tag なしなら renotify は強制 False (Web spec で no-op なため)。全部 None/False なら
    None を返して Chrome デフォルト表示にする。
    """
    if not icon_url and not badge_url and not tag:
        return None
    return messaging.WebpushNotification(
        icon=icon_url,
        badge=badge_url,
        tag=tag,
        renotify=bool(tag) and renotify,
    )


def init_firebase_admin() -> None:
    """Firebase Admin SDK を初期化する。既に初期化済みなら no-op。"""
    settings = get_settings()

    if firebase_admin._apps:
        return

    if not settings.notifications_enabled:
        logger.info("Firebase Admin SDK init skipped (NOTIFICATIONS_ENABLED=false)")
        return

    firebase_admin.initialize_app()
    logger.info("Firebase Admin SDK initialized with ADC")


def send_fcm(
    *,
    token: str,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
    link: str | None = None,
    icon_url: str | None = None,
    badge_url: str | None = None,
    tag: str | None = None,
    renotify: bool = False,
) -> str | None:
    """FCM に単発送信する。

    - NOTIFICATIONS_ENABLED=false なら log のみで送信スキップ (返り値 None)。
    - TTL=300 秒必須: デフォルトの 4 週間だとオフライン復帰時に 5 分前通知が今頃届く事故になる。
    - tag/renotify: docs §5b (rolling next indicator)。
    """
    settings = get_settings()

    if not settings.notifications_enabled:
        logger.info(
            "FCM send skipped (NOTIFICATIONS_ENABLED=false)",
            extra={"token_prefix": token[:12], "title": title},
        )
        return None

    message = messaging.Message(
        token=token,
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        webpush=messaging.WebpushConfig(
            headers={"Urgency": "high", "TTL": "300"},
            notification=_webpush_notification(icon_url, badge_url, tag, renotify),
            fcm_options=messaging.WebpushFCMOptions(link=link) if link else None,
        ),
    )
    message_id: str = messaging.send(message)
    return message_id


def _build_message(
    *,
    token: str,
    title: str,
    body: str,
    data: dict[str, str] | None,
    link: str | None,
    icon_url: str | None = None,
    badge_url: str | None = None,
    tag: str | None = None,
    renotify: bool = False,
) -> messaging.Message:
    return messaging.Message(
        token=token,
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        webpush=messaging.WebpushConfig(
            headers={"Urgency": "high", "TTL": "300"},
            notification=_webpush_notification(icon_url, badge_url, tag, renotify),
            fcm_options=messaging.WebpushFCMOptions(link=link) if link else None,
        ),
    )


def send_fcm_multicast(
    payloads: list[dict[str, Any]],
) -> messaging.BatchResponse | None:
    """複数 token に対してまとめて送信する。

    - NOTIFICATIONS_ENABLED=false なら log のみで送信スキップ (返り値 None)。
    - FCM の send_each は最大 500 件/リクエスト。500 件超えたら呼び出し側で分割すること。
    """
    settings = get_settings()

    if not settings.notifications_enabled:
        logger.info(
            "FCM multicast send skipped (NOTIFICATIONS_ENABLED=false)",
            extra={"count": len(payloads)},
        )
        return None

    messages = [_build_message(**p) for p in payloads]
    return messaging.send_each(messages)
