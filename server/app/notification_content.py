"""通知本文のフォーマット (docs/memo/notification_design.md Section 3.3 準拠)。

- Title: `next HH:MM` (常に固定形式、日本語 UI 内で英字プレフィックスで視認性を上げる)
- Body: `{block名 or →destination} · {場所名} · {trip名}` を中黒で連結
"""

from datetime import datetime
from zoneinfo import ZoneInfo

_MOVE_BLOCK_TYPE = "move"


def format_title(start_time: datetime, subscriber_timezone: str) -> str:
    """`next HH:MM` を購読端末のタイムゾーンで整形して返す。"""
    tz = ZoneInfo(subscriber_timezone)
    local = start_time.astimezone(tz)
    return f"next {local.strftime('%H:%M')}"


def format_body(
    *,
    block_type: str,
    block_title: str,
    location_name: str | None,
    destination_name: str | None,
    trip_title: str,
) -> str:
    """Body を組み立てる。

    - move ブロックは `→{destination_name}` を先頭に (destination がなければ block_title fallback)
    - schedule 系は block_title を先頭に
    - location_name があれば中黒で挿入、なければ省略
    """
    if block_type == _MOVE_BLOCK_TYPE:
        head = f"→{destination_name}" if destination_name else block_title
        parts = [head, trip_title]
    else:
        parts = [p for p in (block_title, location_name, trip_title) if p]

    return " · ".join(parts)
