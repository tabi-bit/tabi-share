"""親 Trip.last_edited_at / updated_at のセマンティクスを検証するテスト。

- last_edited_at: Trip 自身 + 配下 Page/Block の CRUD で bump される
- updated_at: Trip 自身のカラム変更でのみ bump される（配下変更では触られない）
"""

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.cruds import blocks as blocks_cruds
from app.cruds import pages as pages_cruds
from app.cruds import trips as trips_cruds
from app.schemas.block import Block as BlockSchema
from app.schemas.block import BlockCreate, BlockUpdate
from app.schemas.page import Page, PageCreate, PageUpdate
from app.schemas.trip import Trip, TripUpdate


@dataclass(frozen=True)
class TripTimestamps:
    updated_at: datetime
    last_edited_at: datetime


async def _fetch_timestamps(db: AsyncSession, trip_id: int) -> TripTimestamps:
    """trips 行から updated_at / last_edited_at をスナップショットとして返す。

    ORM を通すと identity map の同一インスタンスが返り、before/after が同一
    オブジェクトになって属性リフレッシュ後は同じ値を見てしまうため、
    生 SQL で毎回新しい値を取得する。
    """
    result = await db.execute(
        text("SELECT updated_at, last_edited_at FROM trips WHERE id = :id"),
        {"id": trip_id},
    )
    row = result.one()
    return TripTimestamps(updated_at=row.updated_at, last_edited_at=row.last_edited_at)


# ---------------------------------------------------------------------------
# last_edited_at: 配下変更でも bump される
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_last_edited_at_bumped_on_trip_update(
    db_session: AsyncSession, test_create_trip: Trip
):
    """Trip 自身の update で last_edited_at が更新される"""
    before = await _fetch_timestamps(db_session, test_create_trip.id)
    await asyncio.sleep(0.01)

    await trips_cruds.update_trip(
        db=db_session,
        trip_id=test_create_trip.id,
        trip=TripUpdate(title="renamed", detail=None),
    )

    after = await _fetch_timestamps(db_session, test_create_trip.id)
    assert after.last_edited_at > before.last_edited_at


@pytest.mark.asyncio
async def test_last_edited_at_bumped_on_page_create(
    db_session: AsyncSession, test_create_trip: Trip
):
    """Page 作成で親 Trip.last_edited_at が bump される"""
    before = await _fetch_timestamps(db_session, test_create_trip.id)
    await asyncio.sleep(0.01)

    await pages_cruds.create_page(
        db=db_session, page=PageCreate(title="new page"), trip_id=test_create_trip.id
    )

    after = await _fetch_timestamps(db_session, test_create_trip.id)
    assert after.last_edited_at > before.last_edited_at


@pytest.mark.asyncio
async def test_last_edited_at_bumped_on_page_update(
    db_session: AsyncSession, test_create_page: Page
):
    """Page 更新で親 Trip.last_edited_at が bump される"""
    before = await _fetch_timestamps(db_session, test_create_page.trip_id)
    await asyncio.sleep(0.01)

    await pages_cruds.update_page(
        db=db_session,
        page_id=test_create_page.id,
        page=PageUpdate(title="updated page"),
    )

    after = await _fetch_timestamps(db_session, test_create_page.trip_id)
    assert after.last_edited_at > before.last_edited_at


@pytest.mark.asyncio
async def test_last_edited_at_bumped_on_page_delete(
    db_session: AsyncSession, test_create_page: Page
):
    """Page 削除で親 Trip.last_edited_at が bump される"""
    before = await _fetch_timestamps(db_session, test_create_page.trip_id)
    await asyncio.sleep(0.01)

    await pages_cruds.delete_page(db=db_session, page_id=test_create_page.id)

    after = await _fetch_timestamps(db_session, test_create_page.trip_id)
    assert after.last_edited_at > before.last_edited_at


@pytest.mark.asyncio
async def test_last_edited_at_bumped_on_block_create(
    db_session: AsyncSession, test_create_page: Page
):
    """Block 作成で親 Trip.last_edited_at が bump される"""
    before = await _fetch_timestamps(db_session, test_create_page.trip_id)
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

    after = await _fetch_timestamps(db_session, test_create_page.trip_id)
    assert after.last_edited_at > before.last_edited_at


@pytest.mark.asyncio
async def test_last_edited_at_bumped_on_block_update(
    db_session: AsyncSession, test_create_block: BlockSchema, test_create_page: Page
):
    """Block 更新で親 Trip.last_edited_at が bump される"""
    before = await _fetch_timestamps(db_session, test_create_page.trip_id)
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

    after = await _fetch_timestamps(db_session, test_create_page.trip_id)
    assert after.last_edited_at > before.last_edited_at


@pytest.mark.asyncio
async def test_last_edited_at_bumped_on_block_delete(
    db_session: AsyncSession, test_create_block: BlockSchema, test_create_page: Page
):
    """Block 削除で親 Trip.last_edited_at が bump される"""
    before = await _fetch_timestamps(db_session, test_create_page.trip_id)
    await asyncio.sleep(0.01)

    await blocks_cruds.delete_block(db=db_session, block_id=test_create_block.id)

    after = await _fetch_timestamps(db_session, test_create_page.trip_id)
    assert after.last_edited_at > before.last_edited_at


# ---------------------------------------------------------------------------
# updated_at: 配下変更では bump されない（Trip 自身の変更でのみ更新）
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_updated_at_bumped_on_trip_update(
    db_session: AsyncSession, test_create_trip: Trip
):
    """Trip 自身の update で updated_at が bump される"""
    before = await _fetch_timestamps(db_session, test_create_trip.id)
    await asyncio.sleep(0.01)

    await trips_cruds.update_trip(
        db=db_session,
        trip_id=test_create_trip.id,
        trip=TripUpdate(title="renamed", detail=None),
    )

    after = await _fetch_timestamps(db_session, test_create_trip.id)
    assert after.updated_at > before.updated_at


@pytest.mark.asyncio
async def test_updated_at_not_bumped_on_page_change(
    db_session: AsyncSession, test_create_page: Page
):
    """Page の CRUD では親 Trip.updated_at は変わらない"""
    before = await _fetch_timestamps(db_session, test_create_page.trip_id)
    await asyncio.sleep(0.01)

    await pages_cruds.update_page(
        db=db_session,
        page_id=test_create_page.id,
        page=PageUpdate(title="updated page"),
    )

    after = await _fetch_timestamps(db_session, test_create_page.trip_id)
    assert after.updated_at == before.updated_at
    assert after.last_edited_at > before.last_edited_at


@pytest.mark.asyncio
async def test_updated_at_not_bumped_on_block_change(
    db_session: AsyncSession, test_create_block: BlockSchema, test_create_page: Page
):
    """Block の CRUD では親 Trip.updated_at は変わらない"""
    before = await _fetch_timestamps(db_session, test_create_page.trip_id)
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

    after = await _fetch_timestamps(db_session, test_create_page.trip_id)
    assert after.updated_at == before.updated_at
    assert after.last_edited_at > before.last_edited_at
