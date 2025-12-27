from fastapi import APIRouter, Depends, HTTPException
from nanoid import generate
from sqlalchemy.orm.session import Session

from app.cruds import trips as trips_cruds
from app.db_connection import get_db_session
from app.schemas.trip import Trip, TripCreateIn, TripCreateOut, TripUpdate

router = APIRouter(tags=["Trips"], prefix="/trips")

URL_ID_SIZE = 16


@router.post(
    "/",
    summary="旅行作成",
    operation_id="trips-create",
    response_model=TripCreateOut,
)
async def create_trip(
    trip_in: TripCreateIn, db: Session = Depends(get_db_session)
) -> TripCreateOut:
    """
    説明:

    - 新しい旅行プランを作成する
    - サーバー側でユニークな共有ID(url_id)を自動生成する
    """
    url_id: str = generate(size=URL_ID_SIZE)
    trip_id: int = await trips_cruds.create_trip(db=db, trip=trip_in, url_id=url_id)

    return TripCreateOut(id=trip_id, url_id=url_id)


@router.get(
    "/",
    summary="旅行一覧取得",
    operation_id="trips-list",
    response_model=list[Trip],
)
async def list_trips(db: Session = Depends(get_db_session)) -> list[Trip]:
    """
    説明:

    - すべての旅行プランを取得する
    """
    return await trips_cruds.list_trips(db=db)


@router.get(
    "/{trip_id}",
    summary="旅行詳細取得",
    operation_id="trips-get",
    response_model=Trip,
)
async def get_trip(trip_id: int, db: Session = Depends(get_db_session)) -> Trip:
    """
    説明:

    - IDで指定された単一の旅行プランを取得する
    """
    db_trip = await trips_cruds.get_trip(db, trip_id=trip_id)
    if db_trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")

    return db_trip


@router.get(
    "/url/{url_id}",
    summary="URL IDで旅行取得",
    operation_id="trips-get-by-url-id",
    response_model=Trip,
)
async def get_trip_by_url_id(
    url_id: str, db: Session = Depends(get_db_session)
) -> Trip:
    """
    説明:

    - URL IDで指定された単一の旅行プランを取得する
    """
    db_trip = await trips_cruds.get_trip_by_url_id(db, url_id=url_id)
    if db_trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")

    return db_trip


@router.put(
    "/{trip_id}",
    summary="旅行更新",
    operation_id="trips-update",
    response_model=Trip,
)
async def update_trip(
    trip_id: int, trip_in: TripUpdate, db: Session = Depends(get_db_session)
) -> Trip:
    """
    説明:

    - IDで指定された単一の旅行プランを更新する
    """
    db_trip = await trips_cruds.update_trip(db, trip_id=trip_id, trip=trip_in)
    if db_trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")

    return db_trip


@router.delete(
    "/{trip_id}",
    summary="旅行削除",
    operation_id="trips-delete",
    status_code=204,
)
async def delete_trip(trip_id: int, db: Session = Depends(get_db_session)) -> None:
    """
    説明:

    - IDで指定された単一の旅行プランを削除する
    """
    if not await trips_cruds.delete_trip(db, trip_id=trip_id):
        raise HTTPException(status_code=404, detail="Trip not found")

    return
