from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    get_allowed_trip_ids,
    require_page_access,
    require_trip_access,
)
from app.cruds import pages as pages_cruds
from app.db_connection import get_db_session
from app.errors import Forbidden, NotFound
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
    trip_id: int,
    page: PageCreate,
    _: int = Depends(require_trip_access),
    db: AsyncSession = Depends(get_db_session),
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
    trip_id: int,
    _: int = Depends(require_trip_access),
    db: AsyncSession = Depends(get_db_session),
) -> list[Page]:
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
    page_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> Page:
    """
    説明:

    - IDで指定された単一のページを取得する
    - 認可と本体取得を 1 クエリで済ませるため、Page を blocks / locations 込みで
      取得し、その page.trip_id を Cookie で検証する
    """
    db_page = await pages_cruds.get_page(db, page_id=page_id)
    if db_page is None:
        raise NotFound(message="Page not found")
    if db_page.trip_id not in get_allowed_trip_ids(request):
        raise Forbidden()
    return db_page


@router.put(
    "/pages/{page_id}",
    summary="ページ更新",
    operation_id="pages-update",
    response_model=Page,
)
async def update_page(
    page_id: int,
    page: PageUpdate,
    _: int = Depends(require_page_access),
    db: AsyncSession = Depends(get_db_session),
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
    page_id: int,
    _: int = Depends(require_page_access),
    db: AsyncSession = Depends(get_db_session),
):
    """
    説明:

    - IDで指定された単一のページを削除する
    """
    if not await pages_cruds.delete_page(db, page_id=page_id):
        raise NotFound(message="Page not found")

    return
