"""
STG レイテンシー計測スクリプト

代表エンドポイントを Cookie を共有した単一クライアントから直列に N 回叩き、
クライアント側で観測した total_ms を p50 / p95 / avg / min / max で集計する。
Cloud Logging 側の計装ログ（jsonPayload.type="request"）と
突き合わせる用に、サンプル全件を JSONL で書き出すこともできる。

使い方:

    uv run --with httpx scripts/measure_staging.py \
        --base-url https://tabi-share-api-staging-jsmfpzrd6q-an.a.run.app \
        --url-id <STG の url_id> \
        --warmup 5 --iters 30 \
        --jsonl /tmp/staging_latency_samples.jsonl

Issue: #124
"""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

import httpx


@dataclass(frozen=True)
class EndpointSpec:
    """計測対象 1 エンドポイントの仕様。"""

    label: str
    method: str
    path: str


@dataclass
class Sample:
    """1 リクエスト分の計測サンプル。"""

    label: str
    iter: int
    ts: str
    status: int
    total_ms: float


@dataclass
class Stats:
    """エンドポイント単位の集計値。"""

    label: str
    method: str
    path: str
    n: int
    avg_ms: float
    p50_ms: float
    p95_ms: float
    min_ms: float
    max_ms: float
    error_count: int


def _percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    sorted_v = sorted(values)
    k = (len(sorted_v) - 1) * (q / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_v) - 1)
    return sorted_v[f] + (sorted_v[c] - sorted_v[f]) * (k - f)


async def _call_once(
    client: httpx.AsyncClient, method: str, path: str
) -> tuple[int, float]:
    started = time.perf_counter()
    response = await client.request(method, path)
    elapsed_ms = (time.perf_counter() - started) * 1000.0
    return response.status_code, elapsed_ms


async def _bootstrap_context(
    client: httpx.AsyncClient, url_id: str
) -> tuple[int, int, int | None]:
    """url_id から trip_id / page_id / block_id を引いて Cookie を確立する。"""
    r = await client.get(f"/trips/url/{url_id}")
    if r.status_code != 200:
        raise SystemExit(
            f"GET /trips/url/{url_id} が失敗しました: status={r.status_code}, body={r.text}"
        )
    trip = r.json()
    trip_id: int = trip["id"]

    pages_r = await client.get(f"/trips/{trip_id}/pages")
    pages_r.raise_for_status()
    pages = pages_r.json()
    if not pages:
        raise SystemExit(
            "対象 trip にページが 1 件も無いので blocks 計測が出来ません"
        )
    page_id: int = pages[0]["id"]

    blocks_r = await client.get(f"/pages/{page_id}/blocks")
    blocks_r.raise_for_status()
    blocks = blocks_r.json()
    block_id: int | None = blocks[0]["id"] if blocks else None
    return trip_id, page_id, block_id


def _build_endpoints(
    url_id: str, trip_id: int, page_id: int, block_id: int | None
) -> list[EndpointSpec]:
    """副作用の無い GET のみで計測対象を構成する。"""
    specs: list[EndpointSpec] = [
        EndpointSpec("health", "GET", "/health"),
        EndpointSpec("trip_by_url", "GET", f"/trips/url/{url_id}"),
        EndpointSpec("trip_get", "GET", f"/trips/{trip_id}"),
        EndpointSpec("pages_list", "GET", f"/trips/{trip_id}/pages"),
        EndpointSpec("blocks_list", "GET", f"/pages/{page_id}/blocks"),
    ]
    if block_id is not None:
        specs.append(EndpointSpec("block_get", "GET", f"/blocks/{block_id}"))
    return specs


async def _measure_endpoint(
    client: httpx.AsyncClient,
    spec: EndpointSpec,
    warmup: int,
    iters: int,
    samples_out: list[Sample],
    log: Callable[[str], None],
) -> Stats:
    # ウォームアップ（集計対象外）
    for _ in range(warmup):
        await _call_once(client, spec.method, spec.path)

    times: list[float] = []
    errors = 0
    for i in range(iters):
        ts = datetime.now(UTC).isoformat()
        status, elapsed_ms = await _call_once(client, spec.method, spec.path)
        times.append(elapsed_ms)
        if status >= 400:
            errors += 1
        samples_out.append(
            Sample(
                label=spec.label,
                iter=i,
                ts=ts,
                status=status,
                total_ms=elapsed_ms,
            )
        )

    log(
        f"[done] {spec.label:<16} n={len(times)} "
        f"avg={statistics.fmean(times):.1f}ms p95={_percentile(times, 95):.1f}ms"
        f" errors={errors}"
    )
    return Stats(
        label=spec.label,
        method=spec.method,
        path=spec.path,
        n=len(times),
        avg_ms=round(statistics.fmean(times), 2),
        p50_ms=round(_percentile(times, 50), 2),
        p95_ms=round(_percentile(times, 95), 2),
        min_ms=round(min(times), 2),
        max_ms=round(max(times), 2),
        error_count=errors,
    )


def _print_table(stats: list[Stats]) -> None:
    header = (
        f"{'endpoint':<16} {'n':>4} {'avg_ms':>9} {'p50_ms':>9} "
        f"{'p95_ms':>9} {'min_ms':>9} {'max_ms':>9} {'errors':>7}"
    )
    print(header)
    print("-" * len(header))
    for s in stats:
        print(
            f"{s.label:<16} {s.n:>4} {s.avg_ms:>9.1f} {s.p50_ms:>9.1f} "
            f"{s.p95_ms:>9.1f} {s.min_ms:>9.1f} {s.max_ms:>9.1f} {s.error_count:>7}"
        )


async def _run(args: argparse.Namespace) -> None:
    base_url = args.base_url.rstrip("/")
    started_at = datetime.now(UTC).isoformat()
    log = lambda msg: print(msg, file=sys.stderr)  # noqa: E731

    async with httpx.AsyncClient(
        base_url=base_url,
        timeout=30.0,
        follow_redirects=False,
    ) as client:
        log(f"[bootstrap] url_id={args.url_id} 経由でコンテキストを確立中 ...")
        trip_id, page_id, block_id = await _bootstrap_context(client, args.url_id)
        log(
            f"[bootstrap] trip_id={trip_id} page_id={page_id} "
            f"block_id={block_id}"
        )

        specs = _build_endpoints(args.url_id, trip_id, page_id, block_id)
        samples: list[Sample] = []
        stats: list[Stats] = []
        for spec in specs:
            log(f"[run] {spec.label} {spec.method} {spec.path} ...")
            stats.append(
                await _measure_endpoint(
                    client, spec, args.warmup, args.iters, samples, log
                )
            )

    print("")
    _print_table(stats)

    if args.jsonl:
        with open(args.jsonl, "w", encoding="utf-8") as f:
            for sample in samples:
                f.write(
                    json.dumps(
                        {
                            "label": sample.label,
                            "iter": sample.iter,
                            "ts": sample.ts,
                            "status": sample.status,
                            "total_ms": round(sample.total_ms, 2),
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )
        log(f"[saved] {len(samples)} samples -> {args.jsonl}")

    summary = {
        "started_at": started_at,
        "finished_at": datetime.now(UTC).isoformat(),
        "base_url": base_url,
        "url_id": args.url_id,
        "trip_id": trip_id,
        "page_id": page_id,
        "block_id": block_id,
        "warmup": args.warmup,
        "iters": args.iters,
        "stats": [s.__dict__ for s in stats],
    }
    print("")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="STG レイテンシー計測スクリプト (#124)"
    )
    parser.add_argument(
        "--base-url",
        required=True,
        help="STG ベース URL (例: https://tabi-share-api-staging-...run.app)",
    )
    parser.add_argument(
        "--url-id", required=True, help="計測対象 Trip の url_id"
    )
    parser.add_argument(
        "--warmup", type=int, default=5, help="集計対象外のウォームアップ回数"
    )
    parser.add_argument(
        "--iters", type=int, default=30, help="集計対象の本計測回数"
    )
    parser.add_argument(
        "--jsonl",
        default=None,
        help="サンプル全件を書き出す JSONL ファイルパス (省略時は書き出さない)",
    )
    args = parser.parse_args()
    asyncio.run(_run(args))


if __name__ == "__main__":
    main()
