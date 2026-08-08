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


def test_collect_upcoming_drops_only_past_blocks() -> None:
    """`< after_utc` を strict にすることで、同時刻の他 block は upcoming に含める。

    end_time null と duration あり block 等で同一 start_time は実運用で発生するため、
    同時刻 A/B が rolling next tag で片方消える場合でも、勝者側の body に他方が
    upcoming として現れて情報損失を防ぐ (docs/notifications.md §5b)。
    """
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
    # 同時刻の "same" と後続 "future" が上限 2 件に収まる。past は除外。
    assert [title for _, title in result] == ["same", "future"]


def test_collect_upcoming_includes_same_time_sibling() -> None:
    """A@01:00 と B@01:00 が同一 page にある場合、A の upcoming に B が入る。"""
    page_blocks = [
        (10, datetime(2000, 1, 1, 1, 0, tzinfo=UTC), "A"),
        (11, datetime(2000, 1, 1, 1, 0, tzinfo=UTC), "B"),
    ]
    result = notif_cruds._collect_upcoming_blocks(
        page_blocks=page_blocks,
        current_block_id=10,  # A
        page_date=date(2026, 8, 5),
        tz_name="UTC",
        after_utc=datetime(2026, 8, 5, 1, 0, tzinfo=UTC),
    )
    assert [title for _, title in result] == ["B"]


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


class TestHasEarlierUpcomingInSameTrip:
    """A@01:00 / B@01:02 (same page) や 23:58/00:01 (cross page) の rolling next 上書き対策。"""

    # trip_blocks の tuple 形式: (block_id, page_date, start_time, title)
    @staticmethod
    def _same_page_blocks() -> list[tuple[int, date, datetime, str]]:
        d = date(2026, 8, 5)
        return [
            (10, d, datetime(2000, 1, 1, 1, 0, tzinfo=UTC), "A"),  # A@01:00
            (11, d, datetime(2000, 1, 1, 1, 2, tzinfo=UTC), "B"),  # B@01:02
        ]

    def test_true_when_earlier_block_is_still_upcoming(self) -> None:
        """00:57 時点で B の候補判定: A (01:00) はまだ start 前 → B は延期"""
        result = notif_cruds._has_earlier_upcoming_in_same_trip(
            trip_blocks=self._same_page_blocks(),
            tz_name="UTC",
            candidate_block_id=11,  # B
            candidate_absolute_start=datetime(2026, 8, 5, 1, 2, tzinfo=UTC),
            now_utc=datetime(2026, 8, 5, 0, 57, tzinfo=UTC),
        )
        assert result is True

    def test_false_when_earlier_block_has_started(self) -> None:
        """01:00 時点で B の候補判定: A の absolute_start は now と同時刻 → 「earlier upcoming」ではない → B 送信"""
        result = notif_cruds._has_earlier_upcoming_in_same_trip(
            trip_blocks=self._same_page_blocks(),
            tz_name="UTC",
            candidate_block_id=11,
            candidate_absolute_start=datetime(2026, 8, 5, 1, 2, tzinfo=UTC),
            now_utc=datetime(2026, 8, 5, 1, 0, tzinfo=UTC),
        )
        assert result is False

    def test_false_for_earliest_candidate(self) -> None:
        """00:55 時点で A の候補判定: A より早い block は存在しない → A 送信"""
        result = notif_cruds._has_earlier_upcoming_in_same_trip(
            trip_blocks=self._same_page_blocks(),
            tz_name="UTC",
            candidate_block_id=10,  # A
            candidate_absolute_start=datetime(2026, 8, 5, 1, 0, tzinfo=UTC),
            now_utc=datetime(2026, 8, 5, 0, 55, tzinfo=UTC),
        )
        assert result is False

    def test_false_when_only_candidate_itself(self) -> None:
        """自身のみが upcoming → 延期しない"""
        d = date(2026, 8, 5)
        result = notif_cruds._has_earlier_upcoming_in_same_trip(
            trip_blocks=[(10, d, datetime(2000, 1, 1, 1, 0, tzinfo=UTC), "A")],
            tz_name="UTC",
            candidate_block_id=10,
            candidate_absolute_start=datetime(2026, 8, 5, 1, 0, tzinfo=UTC),
            now_utc=datetime(2026, 8, 5, 0, 55, tzinfo=UTC),
        )
        assert result is False

    def test_false_when_same_start_time(self) -> None:
        """同一時刻 (A=B=01:00) は「earlier upcoming」に含めない (競合は受容、docstring 参照)"""
        d = date(2026, 8, 5)
        trip_blocks = [
            (10, d, datetime(2000, 1, 1, 1, 0, tzinfo=UTC), "A"),
            (11, d, datetime(2000, 1, 1, 1, 0, tzinfo=UTC), "B"),
        ]
        result = notif_cruds._has_earlier_upcoming_in_same_trip(
            trip_blocks=trip_blocks,
            tz_name="UTC",
            candidate_block_id=11,
            candidate_absolute_start=datetime(2026, 8, 5, 1, 0, tzinfo=UTC),
            now_utc=datetime(2026, 8, 5, 0, 55, tzinfo=UTC),
        )
        assert result is False

    def test_ignores_past_blocks(self) -> None:
        """既に start した block は「earlier upcoming」でない (now より過去)"""
        d = date(2026, 8, 5)
        trip_blocks = [
            (10, d, datetime(2000, 1, 1, 0, 0, tzinfo=UTC), "past"),  # 00:00 (過去)
            (11, d, datetime(2000, 1, 1, 1, 2, tzinfo=UTC), "B"),
        ]
        result = notif_cruds._has_earlier_upcoming_in_same_trip(
            trip_blocks=trip_blocks,
            tz_name="UTC",
            candidate_block_id=11,
            candidate_absolute_start=datetime(2026, 8, 5, 1, 2, tzinfo=UTC),
            now_utc=datetime(2026, 8, 5, 0, 57, tzinfo=UTC),
        )
        assert result is False

    def test_ignores_invalid_tz_blocks(self) -> None:
        d = date(2026, 8, 5)
        trip_blocks = [(10, d, datetime(2000, 1, 1, 1, 0, tzinfo=UTC), "A")]
        result = notif_cruds._has_earlier_upcoming_in_same_trip(
            trip_blocks=trip_blocks,
            tz_name="Not/A_Real_TZ",
            candidate_block_id=11,
            candidate_absolute_start=datetime(2026, 8, 5, 1, 2, tzinfo=UTC),
            now_utc=datetime(2026, 8, 5, 0, 57, tzinfo=UTC),
        )
        assert result is False

    def test_true_cross_page_earlier_upcoming(self) -> None:
        """cross-page: Page A (23:58) と Page B 翌日 (00:01) の候補判定。

        23:56 tick で B の絶対時刻 = 2026-08-06 00:01 UTC。同じ trip の A (2026-08-05 23:58 UTC)
        は now < A.abs < B.abs を満たす earlier upcoming → B は延期。
        """
        trip_blocks = [
            (10, date(2026, 8, 5), datetime(2000, 1, 1, 23, 58, tzinfo=UTC), "A"),
            (11, date(2026, 8, 6), datetime(2000, 1, 1, 0, 1, tzinfo=UTC), "B"),
        ]
        result = notif_cruds._has_earlier_upcoming_in_same_trip(
            trip_blocks=trip_blocks,
            tz_name="UTC",
            candidate_block_id=11,
            candidate_absolute_start=datetime(2026, 8, 6, 0, 1, tzinfo=UTC),
            now_utc=datetime(2026, 8, 5, 23, 56, tzinfo=UTC),
        )
        assert result is True
