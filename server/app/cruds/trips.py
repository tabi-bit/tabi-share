from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Trip
from app.schemas.trip import TripCreateIn, TripUpdate


async def create_trip(db: AsyncSession, trip: TripCreateIn, url_id: str) -> int:
    """
    旅行オブジェクトをデータベースに作成する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        trip (TripCreateIn): 旅行プラン作成用のスキーマ
        url_id (str): サーバーで生成されたユニークID

    Returns:
        int: 作成された旅行プランのID
    """
    db_trip = Trip(**trip.model_dump(), url_id=url_id)
    db.add(db_trip)
    await db.commit()
    await db.refresh(db_trip)
    return db_trip.id


async def list_trips(db: AsyncSession) -> list[Trip]:
    """
    すべての旅行プランを取得する関数

    Args:
        db (AsyncSession): 非同期データベースセッション

    Returns:
        list[Trip]: すべての旅行プラン
    """
    result = await db.execute(select(Trip))
    return list(result.scalars().all())


async def get_trip(db: AsyncSession, trip_id: int) -> Trip | None:
    """
    特定の旅行プランを取得する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        trip_id (int): 旅行プランのID

    Returns:
        Trip | None: 特定の旅行プラン、見つからない場合はNone
    """
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    return result.scalar_one_or_none()


async def get_trip_by_url_id(db: AsyncSession, url_id: str) -> Trip | None:
    """
    URL IDで特定の旅行プランを取得する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        url_id (str): 旅行プランのURL ID

    Returns:
        Trip | None: 特定の旅行プラン、見つからない場合はNone
    """
    result = await db.execute(select(Trip).where(Trip.url_id == url_id))
    return result.scalar_one_or_none()


async def update_trip(db: AsyncSession, trip_id: int, trip: TripUpdate) -> Trip | None:
    """
    特定の旅行プランを更新する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        trip_id (int): 更新する旅行プランのID
        trip (TripUpdate): 更新内容

    Returns:
        Trip | None: 更新された旅行プラン、見つからない場合はNone
    """
    db_trip = await get_trip(db, trip_id)
    if db_trip:
        for key, value in trip.model_dump().items():
            setattr(db_trip, key, value)
        await db.commit()
        await db.refresh(db_trip)

    return db_trip


async def delete_trip(db: AsyncSession, trip_id: int) -> bool:
    """
    特定の旅行プランを削除する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        trip_id (int): 削除する旅行プランのID

    Returns:
        bool: 削除が成功した場合はTrue、失敗した場合はFalse
    """
    db_trip = await get_trip(db, trip_id)
    if db_trip:
        await db.delete(db_trip)
        await db.commit()
        return True

    return False
