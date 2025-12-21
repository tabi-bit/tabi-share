import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.cruds import trips as trips_cruds
from app.schemas.trip import TripCreateIn, TripUpdate


@pytest.mark.asyncio
async def test_create_trip(db_session: Session):
    """
    create_trip()/正常系
    """
    # arrange
    trip_in = TripCreateIn(title="test trip", detail="test detail")
    url_id = "test_url_id"

    # act
    trip_id = await trips_cruds.create_trip(db=db_session, trip=trip_in, url_id=url_id)
    db_trip = await trips_cruds.get_trip(db=db_session, trip_id=trip_id)

    # assert
    assert db_trip is not None
    assert db_trip.id == trip_id
    assert db_trip.title == trip_in.title
    assert db_trip.detail == trip_in.detail
    assert db_trip.url_id == url_id


@pytest.mark.asyncio
async def test_create_trip_duplicate_url_id(db_session: Session):
    """
    create_trip()/異常系/url_id重複 (IntegrityError)
    """
    # arrange
    url_id = "duplicate_url_id"
    trip_in_1 = TripCreateIn(title="trip 1", detail="detail 1")
    await trips_cruds.create_trip(db=db_session, trip=trip_in_1, url_id=url_id)

    trip_in_2 = TripCreateIn(title="trip 2", detail="detail 2")

    # act & assert
    with pytest.raises(IntegrityError):
        # 重複するurl_idでtripを作成しようとするとIntegrityErrorが発生することを期待
        await trips_cruds.create_trip(db=db_session, trip=trip_in_2, url_id=url_id)


@pytest.mark.asyncio
async def test_get_trip(db_session: Session):
    """
    get_trip()/正常系
    """
    # arrange
    trip_in = TripCreateIn(title="test trip", detail="test detail")
    test_url_id = "test_url"
    created_trip_id = await trips_cruds.create_trip(
        db=db_session, trip=trip_in, url_id=test_url_id
    )

    # act
    retrieved_trip = await trips_cruds.get_trip(db=db_session, trip_id=created_trip_id)

    # assert
    assert retrieved_trip is not None
    assert retrieved_trip.id == created_trip_id
    assert retrieved_trip.url_id == test_url_id
    assert retrieved_trip.title == trip_in.title
    assert retrieved_trip.detail == trip_in.detail
    assert retrieved_trip.pages == []

    # act(存在しないIDの場合)
    non_existent_trip = await trips_cruds.get_trip(db=db_session, trip_id=999)

    # assert
    assert non_existent_trip is None


@pytest.mark.asyncio
async def test_get_trip_by_url_id(db_session: Session):
    """
    get_trip_by_url_id()/正常系
    """
    # arrange
    test_url_id = "test_url_id_get"
    trip_in = TripCreateIn(title="test trip", detail="test detail")
    created_trip_id = await trips_cruds.create_trip(
        db=db_session, trip=trip_in, url_id=test_url_id
    )

    # act
    retrieved_trip = await trips_cruds.get_trip_by_url_id(
        db=db_session, url_id=test_url_id
    )

    # assert
    assert retrieved_trip is not None
    assert retrieved_trip.id == created_trip_id
    assert retrieved_trip.url_id == test_url_id
    assert retrieved_trip.title == trip_in.title
    assert retrieved_trip.detail == trip_in.detail
    assert retrieved_trip.pages == []

    # act(存在しないurl_idの場合)
    non_existent_trip = await trips_cruds.get_trip_by_url_id(
        db=db_session, url_id="non_existent"
    )

    # assert
    assert non_existent_trip is None


@pytest.mark.asyncio
async def test_list_trips(db_session: Session):
    """
    list_trips()/正常系
    """
    # arrange
    await trips_cruds.create_trip(
        db_session, TripCreateIn(title="trip 1", detail="d1"), "url1"
    )
    await trips_cruds.create_trip(
        db_session, TripCreateIn(title="trip 2", detail="d2"), "url2"
    )

    # act
    trips = await trips_cruds.list_trips(db=db_session)

    # assert
    assert len(trips) == 2
    assert trips[0].title == "trip 1"
    assert trips[1].title == "trip 2"


@pytest.mark.asyncio
async def test_update_trip(db_session: Session):
    """
    update_trip()/正常系
    """
    # arrange
    trip_in = TripCreateIn(title="before update", detail="before detail")
    created_trip_id = await trips_cruds.create_trip(
        db=db_session, trip=trip_in, url_id="test_url"
    )
    update_data = TripUpdate(title="after update", detail="after detail")

    # act
    updated_trip = await trips_cruds.update_trip(
        db=db_session, trip_id=created_trip_id, trip=update_data
    )

    # assert
    assert updated_trip is not None
    assert updated_trip.id == created_trip_id
    assert updated_trip.title == "after update"
    assert updated_trip.detail == "after detail"

    # act(存在しないtrip_idの場合)
    non_existent_trip = await trips_cruds.update_trip(
        db=db_session, trip_id=999, trip=update_data
    )

    # assert
    assert non_existent_trip is None


@pytest.mark.asyncio
async def test_delete_trip(db_session: Session):
    """
    delete_trip()/正常系
    """
    # arrange
    trip_in = TripCreateIn(title="to be deleted", detail="delete")
    created_trip_id = await trips_cruds.create_trip(
        db=db_session, trip=trip_in, url_id="test_url"
    )

    # act
    result = await trips_cruds.delete_trip(db=db_session, trip_id=created_trip_id)

    # assert
    assert result is True
    assert await trips_cruds.get_trip(db=db_session, trip_id=created_trip_id) is None

    # act(存在しないtrip_idの場合)
    non_existent_result = await trips_cruds.delete_trip(db=db_session, trip_id=999)

    # assert
    assert non_existent_result is False
