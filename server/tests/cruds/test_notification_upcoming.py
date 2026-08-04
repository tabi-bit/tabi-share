"""同一 page 内の後続 block 抽出ロジック (_collect_upcoming_blocks) の単体テスト。"""

from datetime import UTC, date, datetime

from app.cruds import notification as notif_cruds


def test_collect_upcoming_excludes_current_block() -> None:
    page_blocks = [
        (10, datetime(2000, 1, 1, 12, 0, tzinfo=UTC), "A"),
        (11, datetime(2000, 1, 1, 13, 0, tzinfo=UTC), "B"),
    ]
    result = notif_cruds._collect_upcoming_blocks(
        page_blocks=page_blocks,
        current_block_id=10,
        page_date=date(2026, 8, 5),
        tz_name="UTC",
        after_utc=datetime(2026, 8, 5, 12, 0, tzinfo=UTC),
    )
    # 12:00 UTC より後の block B (13:00) のみが残る
    assert len(result) == 1
    assert result[0][1] == "B"


def test_collect_upcoming_orders_by_absolute_time() -> None:
    page_blocks = [
        (1, datetime(2000, 1, 1, 15, 0, tzinfo=UTC), "later"),
        (2, datetime(2000, 1, 1, 13, 0, tzinfo=UTC), "sooner"),
    ]
    result = notif_cruds._collect_upcoming_blocks(
        page_blocks=page_blocks,
        current_block_id=999,
        page_date=date(2026, 8, 5),
        tz_name="UTC",
        after_utc=datetime(2026, 8, 5, 12, 0, tzinfo=UTC),
    )
    assert [title for _, title in result] == ["sooner", "later"]


def test_collect_upcoming_limits_to_max() -> None:
    page_blocks = [
        (i, datetime(2000, 1, 1, 13 + i, 0, tzinfo=UTC), f"block_{i}")
        for i in range(5)
    ]
    result = notif_cruds._collect_upcoming_blocks(
        page_blocks=page_blocks,
        current_block_id=999,
        page_date=date(2026, 8, 5),
        tz_name="UTC",
        after_utc=datetime(2026, 8, 5, 12, 0, tzinfo=UTC),
    )
    # 上限 (_MAX_UPCOMING_BLOCKS=2) を守る
    assert len(result) == 2


def test_collect_upcoming_drops_blocks_at_or_before_current() -> None:
    page_blocks = [
        (1, datetime(2000, 1, 1, 11, 0, tzinfo=UTC), "past"),
        (2, datetime(2000, 1, 1, 12, 0, tzinfo=UTC), "same"),
        (3, datetime(2000, 1, 1, 13, 0, tzinfo=UTC), "future"),
    ]
    result = notif_cruds._collect_upcoming_blocks(
        page_blocks=page_blocks,
        current_block_id=999,
        page_date=date(2026, 8, 5),
        tz_name="UTC",
        after_utc=datetime(2026, 8, 5, 12, 0, tzinfo=UTC),
    )
    assert [title for _, title in result] == ["future"]


def test_collect_upcoming_uses_subscriber_tz_for_absolute_time() -> None:
    """time-of-day を subscriber tz で解釈するため、tz が違うと絶対時刻も変わる。"""
    page_blocks = [
        (1, datetime(2000, 1, 1, 13, 0, tzinfo=UTC), "13時"),
    ]
    result_jst = notif_cruds._collect_upcoming_blocks(
        page_blocks=page_blocks,
        current_block_id=999,
        page_date=date(2026, 8, 5),
        tz_name="Asia/Tokyo",
        after_utc=datetime(2026, 8, 4, 0, 0, tzinfo=UTC),
    )
    # JST 22:00 (2000-01-01 13:00 UTC) → 2026-08-05 JST 22:00 = 2026-08-05 13:00 UTC
    assert len(result_jst) == 1
    assert result_jst[0][0] == datetime(2026, 8, 5, 13, 0, tzinfo=UTC)


def test_collect_upcoming_returns_empty_for_invalid_tz() -> None:
    page_blocks = [
        (1, datetime(2000, 1, 1, 13, 0, tzinfo=UTC), "any"),
    ]
    result = notif_cruds._collect_upcoming_blocks(
        page_blocks=page_blocks,
        current_block_id=999,
        page_date=date(2026, 8, 5),
        tz_name="Not/A_Real_TZ",
        after_utc=datetime(2000, 1, 1, 0, 0, tzinfo=UTC),
    )
    assert result == []
