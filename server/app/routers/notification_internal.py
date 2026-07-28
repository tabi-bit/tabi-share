"""通知 tick エンドポイント (Cloud Scheduler から 1 分ごとに叩かれる)。

- Cloud Scheduler 用 SA (tabi-share-notify-scheduler) の OIDC トークンを検証
- device_subscriptions を scan して未送信 & 未来 & minutes_before 以内の候補を取得
- INSERT-first (ON CONFLICT DO NOTHING) で送信ロックを取り、成功したものだけ FCM 送信
- 失効 token (Unregistered / InvalidRegistration / MismatchSenderId) は DB から削除
"""

import logging
import time

from fastapi import APIRouter, Depends
from firebase_admin import exceptions as firebase_exceptions
from firebase_admin import messaging
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.cruds import notification as notif_cruds
from app.db_connection import get_db_session
from app.firebase import send_fcm
from app.notification_content import format_body, format_title
from app.oidc import verify_cloud_scheduler_oidc

logger = logging.getLogger(__name__)

router = APIRouter(tags=["NotificationInternal"], prefix="/internal/notify")

# FCM 側の「token が失効した」ことが確実なエラーコード集合。
# 注意: `invalid-argument` はここに入れない。payload エラー (Title/Body 実装バグ等) でも
# 返り、それを token 失効と誤判定して全 trip 分の購読を消してしまう事故を防ぐため。
# `registration-token-not-registered` は messaging.UnregisteredError と重複するが念のため保持。
_UNREGISTERED_ERROR_CODES = {
    "registration-token-not-registered",
    "mismatched-credential",
    "invalid-registration-token",
}


def _is_token_expired_error(exc: Exception) -> bool:
    """FCM から token 失効系のエラーが返ったか判定する。

    `invalid-argument` (payload エラーとの区別不能) は判定に含めない。
    """
    if isinstance(exc, messaging.UnregisteredError):
        return True
    if isinstance(exc, firebase_exceptions.FirebaseError):
        code = getattr(exc, "code", None)
        if code in _UNREGISTERED_ERROR_CODES:
            return True
    return False


def _frontend_base() -> str:
    """フロントの base URL を環境で切り替え。厳密には環境変数で明示すべきだが、MVP は environment を見て判定。"""
    settings = get_settings()
    return "https://tabishare.net" if settings.environment == "production" else "https://st.tabishare.net"


def _build_link(url_id: str, block_id: int) -> str:
    """通知タップで開く deep link。"""
    return f"{_frontend_base()}/trip/{url_id}?focusBlock={block_id}"


_TRANSPORTATION_ICONS = {"car", "train", "shinkansen", "bus", "walk", "bicycle", "ship", "flight"}


def _icon_name(block_type: str, transportation_type: str | None) -> str:
    """block_type / transportation_type から `frontend/public/icons/notify/<name>.png` の basename を返す。

    - move + 既知の transportation_type → 該当交通アイコン
    - それ以外 (event/stay や未知の交通手段) → schedule (地図ピン)
    """
    if block_type == "move" and transportation_type in _TRANSPORTATION_ICONS:
        return transportation_type
    return "schedule"


def _build_icon_url(block_type: str, transportation_type: str | None) -> str:
    return f"{_frontend_base()}/icons/notify/{_icon_name(block_type, transportation_type)}.png"


def _build_badge_url() -> str:
    """Android status bar 用のモノクロ小アイコン (紙飛行機シルエット)。全通知で共通。"""
    return f"{_frontend_base()}/icons/notify/badge.png"


@router.post(
    "/tick",
    summary="通知 tick (Cloud Scheduler 用)",
    operation_id="notification-tick",
    dependencies=[Depends(verify_cloud_scheduler_oidc)],
)
async def tick(db: AsyncSession = Depends(get_db_session)) -> dict[str, int]:
    """通知候補をスキャンし、送信ロックを取ったものだけ FCM に送信する。

    Cloud Scheduler から 1 分ごとに叩かれる想定。
    処理時間は elapsed_ms として構造化ログに出す。45 秒超で警告 (docs Section 11.2 参照)。
    """
    started_at = time.monotonic()
    candidates = await notif_cruds.list_notification_candidates(db)
    if not candidates:
        elapsed_ms = int((time.monotonic() - started_at) * 1000)
        logger.info(
            "notification_tick_completed",
            extra={
                "event": "notification_tick_completed",
                "candidates_count": 0,
                "sent_count": 0,
                "failed_count": 0,
                "expired_tokens_removed": 0,
                "elapsed_ms": elapsed_ms,
            },
        )
        return {"scanned": 0, "sent": 0, "expired_tokens_removed": 0}

    sent_count = 0
    failed_count = 0
    expired_tokens: set[str] = set()

    for cand in candidates:
        reserved = await notif_cruds.try_reserve_send_slot(
            db, block_id=cand.block_id, fcm_token=cand.fcm_token
        )
        if not reserved:
            continue

        title = format_title(cand.start_time, cand.timezone)
        body = format_body(
            block_title=cand.block_title,
            location_name=cand.location_name,
            destination_name=cand.destination_name,
            trip_title=cand.trip_title,
        )
        link = _build_link(cand.trip_url_id, cand.block_id)
        icon_url = _build_icon_url(cand.block_type, cand.transportation_type)
        badge_url = _build_badge_url()

        try:
            send_fcm(
                token=cand.fcm_token,
                title=title,
                body=body,
                data={
                    "urlId": cand.trip_url_id,
                    "blockId": str(cand.block_id),
                    "kind": "before_5min",
                },
                link=link,
                icon_url=icon_url,
                badge_url=badge_url,
            )
            sent_count += 1
        except Exception as exc:
            # FCM 失敗はロスト受容 (次 tick で再送されない: sent_notifications に既に入っているため)
            failed_count += 1
            logger.warning(
                "FCM send failed (loss accepted): block_id=%s token_prefix=%s: %s",
                cand.block_id,
                cand.fcm_token[:12],
                exc,
            )
            if _is_token_expired_error(exc):
                expired_tokens.add(cand.fcm_token)

    removed_total = 0
    for token in expired_tokens:
        removed_total += await notif_cruds.delete_all_subscriptions_by_fcm_token(
            db, fcm_token=token
        )

    elapsed_ms = int((time.monotonic() - started_at) * 1000)
    # 45 秒超は warning。60 秒に近づくと次 tick と重なるため要注意。
    log_level = logging.WARNING if elapsed_ms >= 45_000 else logging.INFO
    logger.log(
        log_level,
        "notification_tick_completed",
        extra={
            "event": "notification_tick_completed",
            "candidates_count": len(candidates),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "expired_tokens_removed": len(expired_tokens),
            "subscriptions_removed": removed_total,
            "elapsed_ms": elapsed_ms,
        },
    )
    return {
        "scanned": len(candidates),
        "sent": sent_count,
        "expired_tokens_removed": len(expired_tokens),
        "subscriptions_removed": removed_total,
    }
