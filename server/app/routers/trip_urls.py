"""URL ストック関連の補助エンドポイント

データ永続化はフロント側 IndexedDB で行う方針のため、サーバーは以下 2 つの
ステートレスな機能のみを提供する。

- `POST /trips/{trip_id}/urls/preview`: URL から title / og:image を取得
- `POST /trips/{trip_id}/urls/format`: ユーザー貼付テキストを Gemini で markdown 整形
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import require_trip_access
from app.schemas.trip_url import (
    TripUrlFormatRequest,
    TripUrlFormatResponse,
    TripUrlPreview,
    TripUrlPreviewRequest,
)
from app.services.url_extractor import extract_url_metadata, format_text_with_gemini

router = APIRouter(tags=["TripUrls"])


@router.post(
    "/trips/{trip_id}/urls/preview",
    summary="URL のメタデータ取得",
    operation_id="trip_urls-preview",
    response_model=TripUrlPreview,
)
async def preview_trip_url(
    trip_id: int,
    body: TripUrlPreviewRequest,
    _: int = Depends(require_trip_access),
) -> TripUrlPreview:
    """URL から title / og:image を取得する（保存はしない）"""
    return await extract_url_metadata(url=str(body.url))


@router.post(
    "/trips/{trip_id}/urls/format",
    summary="貼付テキストを AI で markdown 整形",
    operation_id="trip_urls-format",
    response_model=TripUrlFormatResponse,
)
async def format_trip_url_text(
    trip_id: int,
    body: TripUrlFormatRequest,
    _: int = Depends(require_trip_access),
) -> TripUrlFormatResponse:
    """ユーザーが貼り付けたテキストと指示を Gemini で markdown に整形する"""
    markdown = await format_text_with_gemini(
        source_text=body.source_text, intent=body.intent
    )
    if not markdown:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI 整形に失敗しました。時間をおいて再度お試しください。",
        )
    return TripUrlFormatResponse(markdown=markdown)
