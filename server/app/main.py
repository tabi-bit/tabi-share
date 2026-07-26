import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse, JSONResponse

from app.auth import require_basic_auth
from app.config import get_settings
from app.db_connection import engine
from app.errors import (
    ErrorResponseException,
    error_response_exception_handler,
    validation_exception_handler,
)
from app.firebase import init_firebase_admin
from app.middleware.legacy_cookie_migration import LegacyCookieMigrationMiddleware
from app.observability import setup_observability

from .routers import blocks, notification, notification_internal, pages, trips

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """アプリケーション起動時と終了時のフック。

    起動時: Firebase Admin SDK を ADC で初期化する。
    NOTIFICATIONS_ENABLED=false の場合は初期化スキップ (log のみ)。
    """
    init_firebase_admin()
    yield


app = FastAPI(
    title="Tabi Share API",
    version="0.1.0",
    description="国内車旅行の旅程管理API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


@app.get("/docs", include_in_schema=False)
async def swagger_ui(
    _: Annotated[None, Depends(require_basic_auth)],
) -> HTMLResponse:
    """
    説明:

    - Basic 認証済みユーザーに Swagger UI を返す
    """
    return get_swagger_ui_html(openapi_url="/openapi.json", title=app.title)


@app.get("/redoc", include_in_schema=False)
async def redoc(
    _: Annotated[None, Depends(require_basic_auth)],
) -> HTMLResponse:
    """
    説明:

    - Basic 認証済みユーザーに ReDoc UI を返す
    """
    return get_redoc_html(openapi_url="/openapi.json", title=app.title)


@app.get("/openapi.json", include_in_schema=False)
async def openapi_schema(
    _: Annotated[None, Depends(require_basic_auth)],
) -> JSONResponse:
    """
    説明:

    - Basic 認証済みユーザーに OpenAPI スキーマを返す
    """
    return JSONResponse(
        get_openapi(title=app.title, version=app.version, routes=app.routes)
    )


# issue #194 の移行期間限定のミドルウェア。旧形式 (trip_ids 配列) の Cookie を
# 検出したら透過的に新形式 (session_id) へ移行する。CORS より内側 (inner) に
# 置くことで preflight (Cookie 無) はスルーされる。
# 削除タイミング: リリース 2-3 ヶ月後を目安に、この 1 行とファイル一式を削除する。
app.add_middleware(LegacyCookieMigrationMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://tabi-share-8ef6b--[a-z0-9-]+\.web\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_observability(app, engine)

app.include_router(trips.router)
app.include_router(pages.router)
app.include_router(blocks.router)
app.include_router(notification.router)
app.include_router(notification_internal.router)


app.add_exception_handler(ErrorResponseException, error_response_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)


@app.get("/health", tags=["Health"])
async def health_check(
    delay: Annotated[
        float, Query(ge=0, le=30, description="デバッグ用: レスポンス遅延(秒)")
    ] = 0,
):
    """Renderのヘルスチェック用エンドポイント"""
    if delay > 0:
        await asyncio.sleep(delay)
    return {"status": "healthy"}
