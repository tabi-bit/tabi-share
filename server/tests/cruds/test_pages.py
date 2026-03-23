import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.cruds import pages as pages_cruds
from app.schemas.page import PageCreate, PageUpdate
from app.schemas.trip import Trip


@pytest.mark.asyncio
async def test_create_page(db_session: AsyncSession, test_create_trip: Trip):
    """
    create_page()/正常系
    """
    # arrange
    page_in = PageCreate(title="test page")

    # act
    db_page = await pages_cruds.create_page(
        db=db_session, page=page_in, trip_id=test_create_trip.id
    )

    # assert
    assert db_page.title == page_in.title
    assert db_page.trip_id == test_create_trip.id
    assert db_page.id is not None


@pytest.mark.asyncio
async def test_create_page_non_existent_trip_id(db_session: AsyncSession):
    """
    create_page()/異常系/trip_idが存在しない場合
    """
    # arrange
    page_in = PageCreate(title="test page")
    non_existent_trip_id = 999

    # act & assert
    with pytest.raises(IntegrityError):
        await pages_cruds.create_page(
            db=db_session, page=page_in, trip_id=non_existent_trip_id
        )


@pytest.mark.asyncio
async def test_get_page(db_session: AsyncSession, test_create_trip: Trip):
    """
    get_page()/正常系
    """
    # arrange
    page_in = PageCreate(title="test page")
    created_page = await pages_cruds.create_page(
        db=db_session, page=page_in, trip_id=test_create_trip.id
    )

    # act
    retrieved_page = await pages_cruds.get_page(db=db_session, page_id=created_page.id)

    # assert
    assert retrieved_page is not None
    assert retrieved_page.id == created_page.id
    assert retrieved_page.trip_id == test_create_trip.id
    assert retrieved_page.title == created_page.title
    assert retrieved_page.trip == test_create_trip
    assert retrieved_page.blocks == []

    # act(page_idが存在しない場合)
    non_existent_page = await pages_cruds.get_page(db=db_session, page_id=999)

    # assert
    assert non_existent_page is None


@pytest.mark.asyncio
async def test_find_pages(db_session: AsyncSession, test_create_trip: Trip):
    """
    find_pages()/正常系
    """
    # arrange
    await pages_cruds.create_page(
        db=db_session, page=PageCreate(title="test page 1"), trip_id=test_create_trip.id
    )
    await pages_cruds.create_page(
        db=db_session, page=PageCreate(title="test page 2"), trip_id=test_create_trip.id
    )

    # act
    pages = await pages_cruds.find_pages(db=db_session, trip_id=test_create_trip.id)

    # assert
    assert len(pages) == 2
    assert pages[0].title == "test page 1"
    assert pages[1].title == "test page 2"


@pytest.mark.asyncio
async def test_update_page(db_session: AsyncSession, test_create_trip: Trip):
    """
    update_page()/正常系
    """
    # arrange
    page_in = PageCreate(title="test page")
    created_page = await pages_cruds.create_page(
        db=db_session, page=page_in, trip_id=test_create_trip.id
    )
    update_data = PageUpdate(title="updated title")

    # act
    updated_page = await pages_cruds.update_page(
        db=db_session, page_id=created_page.id, page=update_data
    )

    # assert
    assert updated_page is not None
    assert updated_page.id == created_page.id
    assert updated_page.title == "updated title"

    # act(page_idが存在しない場合)
    non_existent_page = await pages_cruds.update_page(
        db=db_session, page_id=999, page=update_data
    )

    # act
    assert non_existent_page is None


@pytest.mark.asyncio
async def test_delete_page(db_session: AsyncSession, test_create_trip: Trip):
    """
    delete_page()/正常系
    """
    # arrange
    page_in = PageCreate(title="test page")
    created_page = await pages_cruds.create_page(
        db=db_session, page=page_in, trip_id=test_create_trip.id
    )

    # act
    result = await pages_cruds.delete_page(db=db_session, page_id=created_page.id)

    # assert
    assert result is True
    assert await pages_cruds.get_page(db=db_session, page_id=created_page.id) is None

    # act(page_idが存在しない場合)
    non_existent_result = await pages_cruds.delete_page(db=db_session, page_id=999)

    # assert
    assert non_existent_result is False
