"""
レイテンシー計装ミドルウェアのテスト

middleware が 1 リクエスト 1 行の JSON ログを出力し、DB クエリ統計が
正しく集計されることを検証する。
"""

import json
import logging
from typing import Any

import pytest
from httpx import AsyncClient

from app.observability import _logger as latency_logger


def _capture_records(caplog: pytest.LogCaptureFixture) -> list[dict[str, Any]]:
    """tabi_share.latency に流れた JSON 行をパースして返す。"""
    records: list[dict[str, Any]] = []
    for r in caplog.records:
        if r.name != "tabi_share.latency":
            continue
        try:
            records.append(json.loads(r.getMessage()))
        except json.JSONDecodeError:
            continue
    return records


@pytest.fixture
def latency_caplog(caplog: pytest.LogCaptureFixture) -> pytest.LogCaptureFixture:
    """propagate=False の計装 logger を pytest の caplog で拾えるようにする。"""
    caplog.set_level(logging.INFO, logger="tabi_share.latency")
    # _logger 自身に caplog.handler を attach（propagate=False のため）
    latency_logger.addHandler(caplog.handler)
    try:
        yield caplog
    finally:
        latency_logger.removeHandler(caplog.handler)


async def test_latency_log_excludes_health(
    client: AsyncClient,
    latency_caplog: pytest.LogCaptureFixture,
) -> None:
    """/health は計装ログから除外される"""
    response = await client.get("/health")
    assert response.status_code == 200
    assert _capture_records(latency_caplog) == []


async def test_latency_log_emits_for_api_request(
    authed_client: AsyncClient,
    test_create_trip,
    latency_caplog: pytest.LogCaptureFixture,
) -> None:
    """通常 API は 1 行の JSON ログを出し、DB クエリ統計を含む"""
    response = await authed_client.get(f"/trips/{test_create_trip.id}")
    assert response.status_code == 200

    records = _capture_records(latency_caplog)
    assert len(records) == 1
    rec = records[0]
    assert rec["type"] == "request"
    assert rec["method"] == "GET"
    assert rec["path"] == f"/trips/{test_create_trip.id}"
    assert rec["route"] == "/trips/{trip_id}"
    assert rec["status"] == 200
    assert rec["total_ms"] >= 0
    # selectinload で最低 1 クエリ（trips の取得）が走る
    assert rec["db_query_count"] >= 1
    assert rec["db_total_ms"] >= 0
    assert rec["db_max_ms"] >= 0
    assert "db_slowest_sql" in rec


async def test_latency_log_records_no_db_for_404_unauthorized(
    client: AsyncClient,
    latency_caplog: pytest.LogCaptureFixture,
) -> None:
    """Cookie なしの認可失敗 (403) でも JSON ログは出力される"""
    response = await client.get("/trips/9999")
    assert response.status_code == 403

    records = _capture_records(latency_caplog)
    assert len(records) == 1
    rec = records[0]
    assert rec["status"] == 403
    assert rec["db_query_count"] == 0
