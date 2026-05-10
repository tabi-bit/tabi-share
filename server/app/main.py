import asyncio

from fastapi import Depends, FastAPI, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse, JSONResponse

from app.auth import require_basic_auth
from app.config import get_settings
from app.errors import (
    ErrorResponseException,
    error_response_exception_handler,
    validation_exception_handler,
)

from .routers import blocks, pages, trip_urls, trips

settings = get_settings()

app = FastAPI(
    title="Tabi Share API",
    version="0.1.0",
    description="国内車旅行の旅程管理API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.get("/docs", include_in_schema=False)
async def swagger_ui(
    _: None = Depends(require_basic_auth),
) -> HTMLResponse:
    """
    説明:

    - Basic 認証済みユーザーに Swagger UI を返す
    """
    return get_swagger_ui_html(openapi_url="/openapi.json", title=app.title)


@app.get("/redoc", include_in_schema=False)
async def redoc(
    _: None = Depends(require_basic_auth),
) -> HTMLResponse:
    """
    説明:

    - Basic 認証済みユーザーに ReDoc UI を返す
    """
    return get_redoc_html(openapi_url="/openapi.json", title=app.title)


@app.get("/openapi.json", include_in_schema=False)
async def openapi_schema(
    _: None = Depends(require_basic_auth),
) -> JSONResponse:
    """
    説明:

    - Basic 認証済みユーザーに OpenAPI スキーマを返す
    """
    return JSONResponse(
        get_openapi(title=app.title, version=app.version, routes=app.routes)
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://tabi-share-8ef6b--[a-z0-9-]+\.web\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trips.router)
app.include_router(pages.router)
app.include_router(blocks.router)
app.include_router(trip_urls.router)


app.add_exception_handler(ErrorResponseException, error_response_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)


@app.get("/health", tags=["Health"])
async def health_check(
    delay: float = Query(0, ge=0, le=30, description="デバッグ用: レスポンス遅延(秒)"),
):
    """Renderのヘルスチェック用エンドポイント"""
    if delay > 0:
        await asyncio.sleep(delay)
    return {"status": "healthy"}
