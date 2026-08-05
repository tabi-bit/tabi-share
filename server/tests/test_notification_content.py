"""通知本文フォーマットの単体テスト。

- format_title は block 名を出す (5 分前通知の semantic 上、時刻は暗黙)
- format_body の各パターン (場所有無、後続予定 0/1/2 件、インデント)
"""

from datetime import UTC, datetime

from app.notification_content import format_body, format_title


def test_format_title_returns_next_block_title() -> None:
    assert format_title("昼食") == "next 昼食"
    assert format_title("チェックイン") == "next チェックイン"


def test_format_body_minimal_no_location_no_upcoming() -> None:
    start = datetime(2026, 8, 5, 3, 0, tzinfo=UTC)  # JST 12:00
    body = format_body(
        block_title="昼食",
        start_time=start,
        location_name=None,
        destination_name=None,
        subscriber_timezone="Asia/Tokyo",
    )
    assert body == "▶ 12:00 昼食"


def test_format_body_with_location_only_is_indented() -> None:
    start = datetime(2026, 8, 5, 3, 0, tzinfo=UTC)  # JST 12:00
    body = format_body(
        block_title="昼食",
        start_time=start,
        location_name="湯畑亭",
        destination_name=None,
        subscriber_timezone="Asia/Tokyo",
    )
    # 場所行は全角スペースでインデント
    assert body == "▶ 12:00 昼食\n　📍 湯畑亭"


def test_format_body_move_with_source_and_destination_indented() -> None:
    start = datetime(2026, 8, 5, 5, 30, tzinfo=UTC)  # JST 14:30
    body = format_body(
        block_title="駐車場まで移動",
        start_time=start,
        location_name="湯畑亭",
        destination_name="駐車場",
        subscriber_timezone="Asia/Tokyo",
    )
    assert body == "▶ 14:30 駐車場まで移動\n　📍 湯畑亭 → 駐車場"


def test_format_body_destination_only_omits_pin_but_still_indented() -> None:
    """destination のみ (現状 UI 未実装だが将来対応の互換保持)。📍 なしで行き先のみ、インデントは維持。"""
    start = datetime(2026, 8, 5, 0, 0, tzinfo=UTC)
    body = format_body(
        block_title="到着",
        start_time=start,
        location_name=None,
        destination_name="草津",
        subscriber_timezone="Asia/Tokyo",
    )
    # 場所行 (destination-only) もインデントされる
    lines = body.split("\n")
    assert lines[0].startswith("▶ ")
    assert "到着" in lines[0]
    assert lines[1] == "　→ 草津"


def test_format_body_with_upcoming_two_blocks() -> None:
    start = datetime(2026, 8, 5, 3, 0, tzinfo=UTC)  # JST 12:00
    upcoming = [
        (datetime(2026, 8, 5, 4, 30, tzinfo=UTC), "チェックイン"),  # JST 13:30
        (datetime(2026, 8, 5, 6, 0, tzinfo=UTC), "温泉入湯"),  # JST 15:00
    ]
    body = format_body(
        block_title="昼食",
        start_time=start,
        location_name="湯畑亭",
        destination_name=None,
        subscriber_timezone="Asia/Tokyo",
        upcoming=upcoming,
    )
    expected = "\n".join(
        [
            "▶ 12:00 昼食",
            "　📍 湯畑亭",
            "▶ 13:30 チェックイン",
            "▶ 15:00 温泉入湯",
        ]
    )
    assert body == expected


def test_format_body_with_upcoming_one_block() -> None:
    start = datetime(2026, 8, 5, 5, 30, tzinfo=UTC)  # JST 14:30
    upcoming = [(datetime(2026, 8, 5, 6, 0, tzinfo=UTC), "温泉入湯")]  # JST 15:00
    body = format_body(
        block_title="駐車場まで移動",
        start_time=start,
        location_name="湯畑亭",
        destination_name="駐車場",
        subscriber_timezone="Asia/Tokyo",
        upcoming=upcoming,
    )
    lines = body.split("\n")
    assert lines == [
        "▶ 14:30 駐車場まで移動",
        "　📍 湯畑亭 → 駐車場",
        "▶ 15:00 温泉入湯",
    ]


def test_format_body_time_in_subscriber_tz() -> None:
    """現在予定 / 後続予定ともに subscriber tz で HH:MM 整形される"""
    start = datetime(2026, 8, 5, 3, 0, tzinfo=UTC)  # JST 12:00 / UTC 03:00
    upcoming = [(datetime(2026, 8, 5, 6, 0, tzinfo=UTC), "温泉入湯")]  # JST 15:00 / UTC 06:00
    body_jst = format_body(
        block_title="昼食",
        start_time=start,
        location_name=None,
        destination_name=None,
        subscriber_timezone="Asia/Tokyo",
        upcoming=upcoming,
    )
    assert "▶ 12:00 昼食" in body_jst
    assert "▶ 15:00 温泉入湯" in body_jst

    body_utc = format_body(
        block_title="昼食",
        start_time=start,
        location_name=None,
        destination_name=None,
        subscriber_timezone="UTC",
        upcoming=upcoming,
    )
    assert "▶ 03:00 昼食" in body_utc
    assert "▶ 06:00 温泉入湯" in body_utc


def test_format_body_empty_upcoming_matches_no_upcoming_arg() -> None:
    """upcoming=() は upcoming 引数未指定と同一挙動"""
    start = datetime(2026, 8, 5, 3, 0, tzinfo=UTC)
    common = {
        "block_title": "昼食",
        "start_time": start,
        "location_name": "湯畑亭",
        "destination_name": None,
        "subscriber_timezone": "Asia/Tokyo",
    }
    assert format_body(**common) == format_body(**common, upcoming=())


def test_format_body_no_trip_title_included() -> None:
    """trip 名は body に含めない (rolling next で通知が集約されるため識別不要)。"""
    start = datetime(2026, 8, 5, 3, 0, tzinfo=UTC)
    body = format_body(
        block_title="昼食",
        start_time=start,
        location_name="湯畑亭",
        destination_name=None,
        subscriber_timezone="Asia/Tokyo",
    )
    # ▶ 12:00 昼食 + 　📍 湯畑亭 の 2 行のみ
    assert body.count("\n") == 1
