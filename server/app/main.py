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
from app.middleware.origin_check import origin_check_middleware
from app.observability import setup_observability

from .routers import (
    auth as auth_router,
    blocks,
    me,
    notification,
    notification_internal,
    pages,
    pair,
    trips,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """アプリケーション起動時と終了時のフック。

    起動時: Firebase Admin SDK を ADC で初期化する。
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


# CORS より内側に置き、拒否した応答にも CORS の判定が通常どおり掛かるようにする
app.middleware("http")(origin_check_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=settings.allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_observability(app, engine)

app.include_router(trips.router)
app.include_router(pages.router)
app.include_router(blocks.router)
app.include_router(auth_router.router)
app.include_router(me.router)
app.include_router(pair.router)
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
    # 本番では無効: 認証なしで接続を最大 30 秒占有でき、スケールアウトを誘発できるため
    if delay > 0 and settings.environment != "production":
        await asyncio.sleep(delay)
    return {"status": "healthy"}
