"""接続元 IP 単位の簡易レート制限。

回数はインスタンスごとのメモリ上で数えるため、上限は「インスタンスあたり」になる。
総当たりや Firestore の読み取りコストの増大を抑える目的には十分で、外部ストアを使わずに済む。
"""

import time
from collections import deque
from collections.abc import Callable

from fastapi import Request

from app.errors import TooManyRequests

# これを超えたら、窓を過ぎて空になったキーを掃除する
_MAX_TRACKED_KEYS = 10_000


def client_ip(request: Request) -> str:
    """接続元の IP を返す。

    Cloud Run の前段は X-Forwarded-For の末尾に接続元の IP を追加する。
    先頭側はクライアントが自由に書けるため使わない。
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.rsplit(",", 1)[-1].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """直近 `window_seconds` 秒の回数が `limit` に達したキーを拒否する。"""

    def __init__(self, limit: int, window_seconds: float) -> None:
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[str, deque[float]] = {}

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        if len(self._hits) > _MAX_TRACKED_KEYS:
            self._hits = {
                k: v for k, v in self._hits.items() if v and now - v[-1] < self._window
            }
        hits = self._hits.setdefault(key, deque())
        while hits and now - hits[0] >= self._window:
            hits.popleft()
        if len(hits) >= self._limit:
            return False
        hits.append(now)
        return True

    def dependency(self) -> Callable[[Request], None]:
        """FastAPI の Depends に渡す、接続元 IP ごとの判定関数を返す。"""

        def _check(request: Request) -> None:
            if not self.allow(client_ip(request)):
                raise TooManyRequests()

        return _check
