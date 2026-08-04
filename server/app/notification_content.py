"""通知本文のフォーマット。

- Title: `next {block_title}` (5 分前通知の semantic 上、時刻は暗黙で block 名を優先表示)
- Body: 改行区切りの複数行。予定行 (`▶ HH:MM ブロック名`) と場所行を交ぜて構成。
"""

from collections.abc import Iterable
from datetime import datetime
from zoneinfo import ZoneInfo

# 場所行を「現在の予定の詳細」として視覚的にぶら下げるためのインデント (docs/notifications.md §5)。
# U+3000 (Ideographic Space) は ASCII whitespace 判定に引っかかりにくく、trim される可能性が
# 半角スペースより低い。
_INDENT = "　"


def format_title(block_title: str) -> str:
    """`next {block_title}` を返す。

    5 分前通知は「これから直近で始まる予定」の意味論なので、時刻より block 名の情報量を優先する。
    通知プレビュー (Body 見えない状態) や lock screen で「何の予定か」が即座に判るようにする。
    """
    return f"next {block_title}"


def _format_location_line(location_name: str | None, destination_name: str | None) -> str | None:
    """場所行を組み立て。両方 null なら None を返して省略する。

    現状 UI では destination_name は常に null (destination_location を設定する UI 未実装) だが、
    将来対応時は `📍 {location} → {destination}` の遷移表示に自動で切り替わる。
    location なしで destination のみのケースは 📍 を付けず `→ {destination}` (行き先のみ)。
    """
    if destination_name and location_name:
        return f"📍 {location_name} → {destination_name}"
    if destination_name:
        return f"→ {destination_name}"
    if location_name:
        return f"📍 {location_name}"
    return None


def _format_scheduled_line(start_time: datetime, block_title: str, tz: ZoneInfo) -> str:
    """予定 1 行 (`▶ HH:MM ブロック名`) を組み立て。現在の予定と後続予定で共通利用。"""
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
    """Body を改行区切りで組み立てる。

    - 1 行目: `▶ HH:MM {block_title}` (現在の予定、時刻付き)
    - 2 行目: 場所行 (両方 null なら省略)。1 行目の詳細を示すため全角スペースでインデント
    - 3 行目以降: 後続予定 (`▶ HH:MM ブロック名`)。同一 page 内の未来 block を最大 N 件
      (docs/notifications.md §5 参照)

    全予定を `▶` で統一。場所行はインデントで「現在の予定の詳細」であることを視覚的に示す。
    trip 名は body に含めない (tag=trip-{tripId} で通知が 1 通に集約されるため識別不要、
    docs/notifications.md §5 参照)。
    """
    tz = ZoneInfo(subscriber_timezone)
    lines = [_format_scheduled_line(start_time, block_title, tz)]

    location_line = _format_location_line(location_name, destination_name)
    if location_line:
        lines.append(f"{_INDENT}{location_line}")

    for up_time, up_title in upcoming:
        lines.append(_format_scheduled_line(up_time, up_title, tz))

    return "\n".join(lines)
