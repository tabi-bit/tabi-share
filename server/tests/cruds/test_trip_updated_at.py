"""親 Trip.updated_at が配下 Page/Block の変更で bump されることを検証するテスト。"""

import asyncio
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.cruds import blocks as blocks_cruds
from app.cruds import pages as pages_cruds
from app.cruds import trips as trips_cruds
from app.schemas.block import Block as BlockSchema
from app.schemas.block import BlockCreate, BlockUpdate
from app.schemas.page import Page, PageCreate, PageUpdate
from app.schemas.trip import Trip, TripUpdate


async def _reload_trip_updated_at(db: AsyncSession, trip_id: int) -> datetime:
    """DBから最新の trip.updated_at を再取得する。"""
    db.expire_all()
    trip = await trips_cruds.get_trip(db=db, trip_id=trip_id)
    assert trip is not None
    return trip.updated_at


@pytest.mark.asyncio
async def test_trip_updated_at_bumped_on_trip_update(
    db_session: AsyncSession, test_create_trip: Trip
):
    """Trip 自身の update で updated_at が更新される（onupdate=func.now()）"""
    before = test_create_trip.updated_at
    await asyncio.sleep(0.01)  # DB now() の差分が生じる程度に待つ

    await trips_cruds.update_trip(
        db=db_session,
        trip_id=test_create_trip.id,
        trip=TripUpdate(title="renamed", detail=None),
    )

    after = await _reload_trip_updated_at(db_session, test_create_trip.id)
    assert after > before


@pytest.mark.asyncio
async def test_trip_updated_at_bumped_on_page_create(
    db_session: AsyncSession, test_create_trip: Trip
):
    """Page 作成で親 Trip.updated_at が bump される"""
    before = test_create_trip.updated_at
    await asyncio.sleep(0.01)

    await pages_cruds.create_page(
        db=db_session, page=PageCreate(title="new page"), trip_id=test_create_trip.id
    )

    after = await _reload_trip_updated_at(db_session, test_create_trip.id)
    assert after > before


@pytest.mark.asyncio
async def test_trip_updated_at_bumped_on_page_update(
    db_session: AsyncSession, test_create_page: Page
):
    """Page 更新で親 Trip.updated_at が bump される"""
    trip_id = test_create_page.trip_id
    before = await _reload_trip_updated_at(db_session, trip_id)
    await asyncio.sleep(0.01)

    await pages_cruds.update_page(
        db=db_session,
        page_id=test_create_page.id,
        page=PageUpdate(title="updated page"),
    )

    after = await _reload_trip_updated_at(db_session, trip_id)
    assert after > before


@pytest.mark.asyncio
async def test_trip_updated_at_bumped_on_page_delete(
    db_session: AsyncSession, test_create_page: Page
):
    """Page 削除で親 Trip.updated_at が bump される"""
    trip_id = test_create_page.trip_id
    before = await _reload_trip_updated_at(db_session, trip_id)
    await asyncio.sleep(0.01)

    await pages_cruds.delete_page(db=db_session, page_id=test_create_page.id)

    after = await _reload_trip_updated_at(db_session, trip_id)
    assert after > before


@pytest.mark.asyncio
async def test_trip_updated_at_bumped_on_block_create(
    db_session: AsyncSession, test_create_page: Page
):
    """Block 作成で親 Trip.updated_at が bump される"""
    trip_id = test_create_page.trip_id
    before = await _reload_trip_updated_at(db_session, trip_id)
    await asyncio.sleep(0.01)

    await blocks_cruds.create_block(
        db=db_session,
        block=BlockCreate(
            title="new block",
            start_time=datetime(2026, 7, 1, 10, 0, 0, tzinfo=UTC),
            detail=None,
            block_type="event",
        ),
        page_id=test_create_page.id,
    )

    after = await _reload_trip_updated_at(db_session, trip_id)
    assert after > before


@pytest.mark.asyncio
async def test_trip_updated_at_bumped_on_block_update(
    db_session: AsyncSession, test_create_block: BlockSchema, test_create_page: Page
):
    """Block 更新で親 Trip.updated_at が bump される"""
    trip_id = test_create_page.trip_id
    before = await _reload_trip_updated_at(db_session, trip_id)
    await asyncio.sleep(0.01)

    await blocks_cruds.update_block(
        db=db_session,
        block_id=test_create_block.id,
        block=BlockUpdate(
            title="updated block",
            start_time=datetime(2026, 7, 1, 11, 0, 0, tzinfo=UTC),
            end_time=None,
            detail=None,
            block_type="event",
            transportation_type=None,
            location=None,
            destination_location=None,
        ),
    )

    after = await _reload_trip_updated_at(db_session, trip_id)
    assert after > before


@pytest.mark.asyncio
async def test_trip_updated_at_bumped_on_block_delete(
    db_session: AsyncSession, test_create_block: BlockSchema, test_create_page: Page
):
    """Block 削除で親 Trip.updated_at が bump される"""
    trip_id = test_create_page.trip_id
    before = await _reload_trip_updated_at(db_session, trip_id)
    await asyncio.sleep(0.01)

    await blocks_cruds.delete_block(db=db_session, block_id=test_create_block.id)

    after = await _reload_trip_updated_at(db_session, trip_id)
    assert after > before
