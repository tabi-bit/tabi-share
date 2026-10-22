"""状態を変えるリクエストの送信元を検証するミドルウェア (CSRF 対策、issue #242)。

ブラウザは POST などに Origin ヘッダを付けるため、許可していない Origin を拒否すれば
第三者サイトからのリクエストを止められる。FastAPI は Content-Type のない JSON ボディも
受け付けるため、CORS のプリフライトだけでは防げない。

Origin を付けないサーバー間通信 (Cloud Scheduler の通知 tick など) は通し、
ブラウザが cross-site と申告したもの (Sec-Fetch-Site) だけを拒否する。
"""

from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.errors import Forbidden

_UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _is_allowed_source(request: Request) -> bool:
    origin = request.headers.get("origin")
    if origin is None:
        return request.headers.get("sec-fetch-site") != "cross-site"
    return get_settings().is_allowed_origin(origin)


async def origin_check_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    if request.method in _UNSAFE_METHODS and not _is_allowed_source(request):
        error = Forbidden(
            message="許可されていない送信元からのリクエストです",
            code="forbidden_origin",
        )
        return JSONResponse(
            status_code=error.response_status,
            content=jsonable_encoder(error.response()),
        )
    return await call_next(request)
