from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Location
from app.schemas.location import LocationCreate


async def create_location(db: AsyncSession, location: LocationCreate) -> Location:
    """
    場所をセッションに追加して flush する関数

    各ブロックが独自の場所レコードを持つため、常に新規作成する。
    呼び出し側でトランザクション（commit）を管理すること。

    Args:
        db: 非同期データベースセッション
        location: 場所作成用のスキーマ

    Returns:
        id が払い出された場所オブジェクト（未 commit）
    """
    db_location = Location(**location.model_dump())
    db.add(db_location)
    await db.flush()
    return db_location


async def get_location(db: AsyncSession, location_id: int) -> Location | None:
    """
    特定の場所を取得する関数

    Args:
        db: 非同期データベースセッション
        location_id: 場所のID

    Returns:
        特定の場所、見つからない場合はNone
    """
    result = await db.execute(select(Location).where(Location.id == location_id))
    return result.scalar_one_or_none()


async def delete_location(db: AsyncSession, location_id: int) -> None:
    """
    場所を削除する関数

    呼び出し側でトランザクション（commit）を管理すること。

    Args:
        db: 非同期データベースセッション
        location_id: 場所のID
    """
    db_location = await get_location(db, location_id)
    if db_location is not None:
        await db.delete(db_location)
