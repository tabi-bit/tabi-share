import asyncio
import secrets

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.config import get_settings
from app.errors import (
    ErrorResponseException,
    error_response_exception_handler,
    validation_exception_handler,
)

from .routers import blocks, pages, trips

settings = get_settings()

app = FastAPI(
    title="Tabi Share API",
    version="0.1.0",
    description="国内車旅行の旅程管理API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

_http_basic = HTTPBasic()


def _verify_api_docs_auth(credentials: HTTPBasicCredentials = Depends(_http_basic)) -> None:
    """
    説明:

    - APIドキュメントへのアクセスを Basic 認証で保護する
    - タイミング攻撃を防ぐため secrets.compare_digest で比較する
    - 認証失敗時は 401 を返し、ブラウザに認証ダイアログを表示させる
    """
    valid_username = secrets.compare_digest(
        credentials.username.encode(), settings.api_docs_username.encode()
    )
    valid_password = secrets.compare_digest(
        credentials.password.encode(), settings.api_docs_password.encode()
    )
    if not (valid_username and valid_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました",
            headers={"WWW-Authenticate": "Basic"},
        )


@app.get("/docs", include_in_schema=False)
async def swagger_ui(
    _: None = Depends(_verify_api_docs_auth),
) -> HTMLResponse:
    """
    説明:

    - Basic 認証済みユーザーに Swagger UI を返す
    """
    return get_swagger_ui_html(openapi_url="/openapi.json", title=app.title)


@app.get("/redoc", include_in_schema=False)
async def redoc(
    _: None = Depends(_verify_api_docs_auth),
) -> HTMLResponse:
    """
    説明:

    - Basic 認証済みユーザーに ReDoc UI を返す
    """
    return get_redoc_html(openapi_url="/openapi.json", title=app.title)


@app.get("/openapi.json", include_in_schema=False)
async def openapi_schema(
    _: None = Depends(_verify_api_docs_auth),
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


app.add_exception_handler(ErrorResponseException, error_response_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)


@app.get("/health", tags=["Health"])
async def health_check(delay: float = Query(0, ge=0, le=30, description="デバッグ用: レスポンス遅延(秒)")):
    """Renderのヘルスチェック用エンドポイント"""
    if delay > 0:
        await asyncio.sleep(delay)
    return {"status": "healthy"}
