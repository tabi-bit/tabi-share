from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

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
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
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
async def health_check():
    """Renderのヘルスチェック用エンドポイント"""
    return {"status": "healthy"}
