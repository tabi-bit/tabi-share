"""
リクエストレイテンシー計装モジュール

各 HTTP リクエストの総処理時間と DB クエリ統計（件数 / 累積時間 / 最遅クエリ）を
ContextVar 経由で集計し、Cloud Logging で集計しやすい JSON 構造化ログとして
stdout へ 1 リクエスト 1 行で出力する。

Issue: #124 ボトルネック特定のための計装。
"""

from __future__ import annotations

import contextvars
import json
import logging
import sys
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI, Request, Response
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine

# Cloud Run が拾う stdout の JSON ログ専用 logger
_logger = logging.getLogger("tabi_share.latency")

# 計装ログ出力対象外のパス（ヘルスチェック等の高頻度ノイズ）
_EXCLUDED_PATHS: frozenset[str] = frozenset({"/health"})

# SQLAlchemy connection.info にクエリ開始時刻を保存するキー
_QUERY_START_KEY = "tabi_share_query_start"

# DB ログに保持する SQL の最大文字数（ログ肥大防止）
_SLOW_SQL_MAX_LEN = 200


@dataclass
class RequestStats:
    """1 リクエストあたりの DB 統計"""

    db_query_count: int = 0
    db_total_ms: float = 0.0
    db_max_ms: float = 0.0
    db_slowest_statement: str = ""


_request_stats: contextvars.ContextVar[RequestStats | None] = contextvars.ContextVar(
    "tabi_share_request_stats", default=None
)


def _ensure_logger_configured() -> None:
    """計装 logger に handler を 1 つだけ設定する。再設定では何もしない。"""
    if _logger.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(handler)
    _logger.setLevel(logging.INFO)
    _logger.propagate = False


def _on_before_cursor_execute(
    conn: Any,
    cursor: Any,
    statement: str,
    parameters: Any,
    context: Any,
    executemany: bool,
) -> None:
    conn.info[_QUERY_START_KEY] = time.perf_counter()


def _on_after_cursor_execute(
    conn: Any,
    cursor: Any,
    statement: str,
    parameters: Any,
    context: Any,
    executemany: bool,
) -> None:
    started = conn.info.pop(_QUERY_START_KEY, None)
    if started is None:
        return
    stats = _request_stats.get()
    if stats is None:
        return
    elapsed_ms = (time.perf_counter() - started) * 1000.0
    stats.db_query_count += 1
    stats.db_total_ms += elapsed_ms
    if elapsed_ms > stats.db_max_ms:
        stats.db_max_ms = elapsed_ms
        stats.db_slowest_statement = statement.replace("\n", " ").strip()[
            :_SLOW_SQL_MAX_LEN
        ]


def setup_sqlalchemy_instrumentation(engine: AsyncEngine | Engine) -> None:
    """SQLAlchemy engine にクエリ計装の event を登録する。

    AsyncEngine の場合は `sync_engine` 側に listen する必要がある。
    """
    sync_engine = engine.sync_engine if isinstance(engine, AsyncEngine) else engine
    event.listen(sync_engine, "before_cursor_execute", _on_before_cursor_execute)
    event.listen(sync_engine, "after_cursor_execute", _on_after_cursor_execute)


def _route_template(request: Request) -> str | None:
    """マッチしたルートのパステンプレート（例: /trips/{trip_id}）を返す。"""
    route = request.scope.get("route")
    return getattr(route, "path", None)


def _build_log_payload(
    request: Request,
    status_code: int,
    total_ms: float,
    stats: RequestStats,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "type": "request",
        "method": request.method,
        "path": request.url.path,
        "route": _route_template(request),
        "status": status_code,
        "total_ms": round(total_ms, 2),
        "db_query_count": stats.db_query_count,
        "db_total_ms": round(stats.db_total_ms, 2),
        "db_max_ms": round(stats.db_max_ms, 2),
    }
    if stats.db_slowest_statement:
        payload["db_slowest_sql"] = stats.db_slowest_statement
    return payload


async def latency_logging_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """1 リクエスト 1 行で総処理時間と DB 統計を JSON ログ出力する。"""
    if request.url.path in _EXCLUDED_PATHS:
        return await call_next(request)

    stats = RequestStats()
    token = _request_stats.set(stats)
    started = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        total_ms = (time.perf_counter() - started) * 1000.0
        _request_stats.reset(token)
        _logger.info(
            json.dumps(
                _build_log_payload(request, status_code, total_ms, stats),
                ensure_ascii=False,
            )
        )


def setup_observability(app: FastAPI, engine: AsyncEngine | Engine) -> None:
    """計装 logger / SQL イベント / HTTP middleware を一括設定する。"""
    _ensure_logger_configured()
    setup_sqlalchemy_instrumentation(engine)
    app.middleware("http")(latency_logging_middleware)
