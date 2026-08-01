"""通知本文のフォーマット。

- Title: `next HH:MM` (常に固定形式、日本語 UI 内で英字プレフィックスで視認性を上げる)
- Body: 改行区切りの複数行。省略表示でも block 名が最上部で残るように block_title を先頭に置く。
"""

from datetime import datetime
from zoneinfo import ZoneInfo


def format_title(start_time: datetime, subscriber_timezone: str) -> str:
    """`next HH:MM` を購読端末のタイムゾーンで整形して返す。"""
    tz = ZoneInfo(subscriber_timezone)
    local = start_time.astimezone(tz)
    return f"next {local.strftime('%H:%M')}"


def _format_location_line(
    location_name: str | None, destination_name: str | None
) -> str | None:
    """場所行 (body の 2 行目) を組み立て。両方 null なら None を返して省略する。

    現状 UI では destination_name は常に null (destination_location を設定する UI 未実装) だが、
    将来対応時は `{location} → {destination}` の遷移表示に自動で切り替わる。
    """
    if destination_name and location_name:
        return f"{location_name} → {destination_name}"
    if destination_name:
        return f"→ {destination_name}"
    if location_name:
        return f"場所: {location_name}"
    return None


def format_body(
    *,
    block_title: str,
    location_name: str | None,
    destination_name: str | None,
    trip_title: str,
) -> str:
    """Body を改行区切りで組み立てる。

    - 1 行目: block_title (schedule / move 共通で block 名を先頭に)
    - 2 行目: 場所行 (`_format_location_line` 参照、両方 null なら省略)
    - 3 行目: trip 名

    Chrome / iOS の通知は 2〜3 行までしか展開表示しないので、重要度順に並べる。
    """
    lines = [block_title]
    location_line = _format_location_line(location_name, destination_name)
    if location_line:
        lines.append(location_line)
    lines.append(trip_title)
    return "\n".join(lines)
