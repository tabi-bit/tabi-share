from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_trip_access, require_page_access
from app.cruds import pages as pages_cruds
from app.db_connection import get_db_session
from app.errors import NotFound
from app.schemas.page import Page, PageCreate, PageCreateResponse, PageUpdate

# /trips/{trip_id}/pages で作成と一覧取得
# /pages/{page_id} で取得、更新、削除
router = APIRouter(tags=["Pages"])


@router.post(
    "/trips/{trip_id}/pages",
    summary="ページ作成",
    operation_id="pages-create",
    response_model=PageCreateResponse,
)
async def create_page(
    _: Annotated[int, Depends(require_trip_access)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    trip_id: int,
    page: PageCreate,
) -> PageCreateResponse:
    """
    説明:

    - 新しいページを作成する
    """
    return await pages_cruds.create_page(db=db, page=page, trip_id=trip_id)


@router.get(
    "/trips/{trip_id}/pages",
    summary="ページ一覧取得",
    operation_id="pages-list",
    response_model=list[Page],
)
async def get_pages(
    _: Annotated[int, Depends(require_trip_access)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    trip_id: int,
) -> Sequence[Page]:
    """
    説明:

    - 特定の旅行プランに関連するすべてのページを取得する
    """
    return await pages_cruds.find_pages(db=db, trip_id=trip_id)


@router.get(
    "/pages/{page_id}",
    summary="ページ取得",
    operation_id="pages-get",
    response_model=Page,
)
async def get_page(
    _: Annotated[int, Depends(require_page_access)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    page_id: int,
) -> Page:
    """
    説明:

    - IDで指定された単一のページを取得する
    """
    db_page = await pages_cruds.get_page(db, page_id=page_id)
    if db_page is None:
        raise NotFound(message="Page not found")

    return db_page


@router.put(
    "/pages/{page_id}",
    summary="ページ更新",
    operation_id="pages-update",
    response_model=Page,
)
async def update_page(
    _: Annotated[int, Depends(require_page_access)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    page_id: int,
    page: PageUpdate,
) -> Page:
    """
    説明:

    - IDで指定された単一のページを更新する
    """
    db_page = await pages_cruds.update_page(db, page_id=page_id, page=page)
    if db_page is None:
        raise NotFound(message="Page not found")

    return db_page


@router.delete(
    "/pages/{page_id}",
    summary="ページ削除",
    operation_id="pages-delete",
    status_code=204,
)
async def delete_page(
    _: Annotated[int, Depends(require_page_access)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    page_id: int,
):
    """
    説明:

    - IDで指定された単一のページを削除する
    """
    if not await pages_cruds.delete_page(db, page_id=page_id):
        raise NotFound(message="Page not found")

    return
