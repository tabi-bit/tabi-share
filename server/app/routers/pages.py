from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.cruds import pages as pages_cruds
from app.cruds import trips as trips_cruds
from app.db_connection import get_db_session
from app.errors import NotFound
from app.schemas.page import Page, PageCreate, PageUpdate

# /trips/{trip_id}/pages で作成と一覧取得
# /pages/{page_id} で取得、更新、削除
router = APIRouter(tags=["Pages"])


@router.post(
    "/trips/{trip_id}/pages",
    summary="ページ作成",
    operation_id="pages-create",
    response_model=Page,
)
async def create_page(
    trip_id: int, page: PageCreate, db: AsyncSession = Depends(get_db_session)
) -> Page:
    """
    説明:

    - 新しいページを作成する
    """
    db_trip = await trips_cruds.get_trip(db, trip_id=trip_id)
    if db_trip is None:
        raise NotFound(message="Trip not found")

    return await pages_cruds.create_page(db=db, page=page, trip_id=trip_id)


@router.get(
    "/trips/{trip_id}/pages",
    summary="ページ一覧取得",
    operation_id="pages-list",
    response_model=list[Page],
)
async def get_pages(trip_id: int, db: AsyncSession = Depends(get_db_session)) -> list[Page]:
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
async def get_page(page_id: int, db: AsyncSession = Depends(get_db_session)) -> Page:
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
    page_id: int, page: PageUpdate, db: AsyncSession = Depends(get_db_session)
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
async def delete_page(page_id: int, db: AsyncSession = Depends(get_db_session)):
    """
    説明:

    - IDで指定された単一のページを削除する
    """
    if not await pages_cruds.delete_page(db, page_id=page_id):
        raise NotFound(message="Page not found")

    return
