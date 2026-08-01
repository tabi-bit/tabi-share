from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.cruds import notification as notification_cruds
from app.models import Block, Page
from app.schemas.page import PageCreate, PageUpdate


def _page_with_relations():
    return select(Page).options(
        selectinload(Page.blocks).options(
            selectinload(Block.location),
            selectinload(Block.destination_location),
        )
    )


async def create_page(db: AsyncSession, page: PageCreate, trip_id: int) -> Page:
    """
    ページをデータベースに作成する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        page (PageCreate): ページ作成用のスキーマ
        trip_id (int): 旅行プランのID

    Returns:
        Page: 作成されたページ
    """
    db_page = Page(**page.model_dump(), trip_id=trip_id)
    db.add(db_page)
    await db.commit()
    return db_page


async def find_pages(db: AsyncSession, trip_id: int) -> list[Page]:
    """
    特定の旅行プランに関連するすべてのページを取得する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        trip_id (int): 旅行プランのID

    Returns:
        list[Page]: ページリスト
    """
    result = await db.execute(_page_with_relations().where(Page.trip_id == trip_id))
    return list(result.scalars().all())


async def get_page(db: AsyncSession, page_id: int) -> Page | None:
    """
    特定のページを取得する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        page_id (int): ページのID

    Returns:
        Page | None: 特定のページ、見つからない場合はNone
    """
    result = await db.execute(_page_with_relations().where(Page.id == page_id))
    return result.scalar_one_or_none()


async def update_page(db: AsyncSession, page_id: int, page: PageUpdate) -> Page | None:
    """
    特定のページを更新する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        page_id (int): 更新するページのID
        page (PageUpdate): 更新内容

    Returns:
        Page | None: 更新されたページ、見つからない場合はNone
    """
    db_page = await get_page(db, page_id)
    if db_page:
        # Page.date が変わると配下 block の絶対日時が全て動くため、既送信予約を削除して再通知させる
        date_changed = db_page.date != page.date
        for key, value in page.model_dump().items():
            setattr(db_page, key, value)
        if date_changed:
            await notification_cruds.delete_sent_notifications_for_page(
                db, page_id=page_id
            )
        await db.commit()

    return db_page


async def delete_page(db: AsyncSession, page_id: int) -> bool:
    """
    特定のページを削除する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        page_id (int): 削除するページのID

    Returns:
        bool: 削除が成功した場合はTrue、失敗した場合はFalse
    """
    result = await db.execute(select(Page).where(Page.id == page_id))
    db_page = result.scalar_one_or_none()
    if db_page:
        await db.delete(db_page)
        await db.commit()
        return True

    return False
