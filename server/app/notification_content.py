"""通知本文のフォーマット。

- Title: `next {block_title}` (5 分前通知の semantic 上、時刻は暗黙で block 名を優先表示)
- Body: 改行区切りの複数行。予定行 (`▶ HH:MM ブロック名`) と場所行を交ぜて構成。
"""

from collections.abc import Iterable
from datetime import datetime
from zoneinfo import ZoneInfo

# 場所行のインデント (docs §5)。U+3000 は ASCII whitespace 判定外で trim されにくい。
_INDENT = "　"


def format_title(block_title: str) -> str:
    """通知 Title `next {block_title}` を組み立てる (docs §5)。"""
    return f"next {block_title}"


def _format_location_line(location_name: str | None, destination_name: str | None) -> str | None:
    """場所行を組み立てる (docs §5)。両方 null なら None。"""
    if destination_name and location_name:
        return f"📍 {location_name} → {destination_name}"
    if destination_name:
        return f"→ {destination_name}"
    if location_name:
        return f"📍 {location_name}"
    return None


def _format_scheduled_line(start_time: datetime, block_title: str, tz: ZoneInfo) -> str:
    """予定 1 行 `▶ HH:MM {title}` を組み立てる (next block / upcoming block 共通)。"""
    local = start_time.astimezone(tz)
    return f"▶ {local.strftime('%H:%M')} {block_title}"


def format_body(
    *,
    block_title: str,
    start_time: datetime,
    location_name: str | None,
    destination_name: str | None,
    subscriber_timezone: str,
    upcoming: Iterable[tuple[datetime, str]] = (),
) -> str:
    """通知 Body を組み立てる (docs §5)。"""
    tz = ZoneInfo(subscriber_timezone)
    lines = [_format_scheduled_line(start_time, block_title, tz)]

    location_line = _format_location_line(location_name, destination_name)
    if location_line:
        lines.append(f"{_INDENT}{location_line}")

    for up_time, up_title in upcoming:
        lines.append(_format_scheduled_line(up_time, up_title, tz))

    return "\n".join(lines)
