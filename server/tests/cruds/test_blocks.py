from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.cruds import blocks as blocks_cruds
from app.models import Location
from app.schemas.block import BlockCreate, BlockUpdate
from app.schemas.location import LocationUpdate
from app.schemas.page import Page


def _location_input(name: str = "test location") -> LocationUpdate:
    """テスト用の LocationUpdate (id 未指定 = 新規作成相当) を組み立てるヘルパー"""
    return LocationUpdate(
        name=name,
        google_place_id=None,
        address=None,
        latitude=None,
        longitude=None,
    )


@pytest.mark.asyncio
async def test_create_block(db_session: AsyncSession, test_create_page: Page):
    """
    create_block()/正常系
    """
    # arrange
    block_in = BlockCreate(
        title="test block",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 1, 1, 12, 0, tzinfo=timezone.utc),
        detail="test detail",
        block_type="event",
    )

    # act
    db_block = await blocks_cruds.create_block(
        db=db_session, block=block_in, page_id=test_create_page.id
    )

    # assert
    assert db_block is not None
    assert db_block.id == 1
    assert db_block.title == block_in.title
    assert db_block.start_time == block_in.start_time
    assert db_block.end_time == block_in.end_time
    assert db_block.page_id == test_create_page.id
    assert db_block.detail == block_in.detail
    assert db_block.block_type == block_in.block_type
    assert db_block.transportation_type is None
    assert db_block.page == test_create_page


@pytest.mark.asyncio
async def test_create_block_non_existent_page_id(db_session: AsyncSession):
    """
    create_block()/異常系/page_idが存在しない場合
    """
    # arrange
    block_in = BlockCreate(
        title="test block",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 1, 1, 12, 0, tzinfo=timezone.utc),
        detail="test detail",
        block_type="event",
    )
    non_existent_page_id = 999

    # act & assert
    with pytest.raises(IntegrityError):
        await blocks_cruds.create_block(
            db=db_session, block=block_in, page_id=non_existent_page_id
        )


@pytest.mark.asyncio
async def test_create_block_with_location(
    db_session: AsyncSession, test_create_page: Page
):
    """
    create_block()/正常系/location付き
    """
    # arrange
    block_in = BlockCreate(
        title="with location",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        block_type="event",
        location=_location_input("草津温泉"),
    )

    # act
    db_block = await blocks_cruds.create_block(
        db=db_session, block=block_in, page_id=test_create_page.id
    )

    # assert
    assert db_block.location_id is not None
    assert db_block.location is not None
    assert db_block.location.name == "草津温泉"
    # locations テーブルに1行だけ
    rows = (await db_session.execute(select(Location))).scalars().all()
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_create_block_rolls_back_orphan_location(db_session: AsyncSession):
    """
    create_block()/異常系/存在しないpage_idで失敗したとき、location もロールバックされる
    """
    # arrange
    block_in = BlockCreate(
        title="orphan check",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        block_type="event",
        location=_location_input("orphan"),
    )

    # act
    with pytest.raises(IntegrityError):
        await blocks_cruds.create_block(
            db=db_session, block=block_in, page_id=999
        )
    # 失敗後はセッションをロールバックして確認
    await db_session.rollback()

    # assert: locations 行が残っていない
    rows = (await db_session.execute(select(Location))).scalars().all()
    assert rows == []


@pytest.mark.asyncio
async def test_create_transportation_block_with_destination(
    db_session: AsyncSession, test_create_page: Page
):
    """
    create_block()/正常系/move ブロックに destination_location を紐づけ
    """
    block_in = BlockCreate(
        title="drive",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        block_type="move",
        transportation_type="car",
        location=_location_input("出発地"),
        destination_location=_location_input("目的地"),
    )

    db_block = await blocks_cruds.create_block(
        db=db_session, block=block_in, page_id=test_create_page.id
    )

    assert db_block.location is not None and db_block.location.name == "出発地"
    assert (
        db_block.destination_location is not None
        and db_block.destination_location.name == "目的地"
    )


@pytest.mark.asyncio
async def test_get_block(db_session: AsyncSession, test_create_page: Page):
    """
    get_block()/正常系
    """
    # arrange
    block_in = BlockCreate(
        title="test block",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 1, 1, 12, 0, tzinfo=timezone.utc),
        detail="test detail",
        block_type="move",
        transportation_type="car",
    )
    created_block = await blocks_cruds.create_block(
        db=db_session, block=block_in, page_id=test_create_page.id
    )

    # act
    retrieved_block = await blocks_cruds.get_block(
        db=db_session, block_id=created_block.id
    )

    # assert
    assert retrieved_block is not None
    assert retrieved_block.id == created_block.id
    assert retrieved_block.title == created_block.title
    assert retrieved_block.start_time == created_block.start_time
    assert retrieved_block.end_time == created_block.end_time
    assert retrieved_block.page_id == test_create_page.id
    assert retrieved_block.detail == created_block.detail
    assert retrieved_block.block_type == created_block.block_type
    assert retrieved_block.transportation_type == created_block.transportation_type
    assert retrieved_block.page == test_create_page

    # act(block_idが存在しない場合)
    non_existent_block = await blocks_cruds.get_block(db=db_session, block_id=999)

    # assert
    assert non_existent_block is None


@pytest.mark.asyncio
async def test_find_blocks(db_session: AsyncSession, test_create_page: Page):
    """
    find_blocks()/正常系
    """
    # arrange
    await blocks_cruds.create_block(
        db=db_session,
        block=BlockCreate(
            title="b1",
            start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
            detail="d",
            block_type="event",
        ),
        page_id=test_create_page.id,
    )
    await blocks_cruds.create_block(
        db=db_session,
        block=BlockCreate(
            title="b2",
            start_time=datetime(2023, 1, 1, 11, 0, tzinfo=timezone.utc),
            detail="d",
            block_type="event",
        ),
        page_id=test_create_page.id,
    )

    # act
    blocks = await blocks_cruds.find_blocks(db=db_session, page_id=test_create_page.id)

    # assert
    assert len(blocks) == 2
    assert blocks[0].title == "b1"
    assert blocks[1].title == "b2"


@pytest.mark.asyncio
async def test_update_block(db_session: AsyncSession, test_create_page: Page):
    """
    update_block()/正常系
    """
    # arrange
    block_in = BlockCreate(
        title="before",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        detail="d",
        block_type="event",
    )
    created_block = await blocks_cruds.create_block(
        db=db_session, block=block_in, page_id=test_create_page.id
    )
    update_data = BlockUpdate(
        title="after",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        detail="d",
        block_type="event",
    )

    # act
    updated_block = await blocks_cruds.update_block(
        db=db_session, block_id=created_block.id, block=update_data
    )

    # assert
    assert updated_block is not None
    assert updated_block.id == created_block.id
    assert updated_block.title == "after"

    # act(block_idが存在しない場合)
    non_existent_block = await blocks_cruds.update_block(
        db=db_session, block_id=999, block=update_data
    )
    # assert
    assert non_existent_block is None


@pytest.mark.asyncio
async def test_update_block_add_location(
    db_session: AsyncSession, test_create_page: Page
):
    """
    update_block()/正常系/location 無しから location 付与
    """
    created_block = await blocks_cruds.create_block(
        db=db_session,
        block=BlockCreate(
            title="no location",
            start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
            block_type="event",
        ),
        page_id=test_create_page.id,
    )
    assert created_block.location_id is None

    updated = await blocks_cruds.update_block(
        db=db_session,
        block_id=created_block.id,
        block=BlockUpdate(
            title="no location",
            start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
            block_type="event",
            location=_location_input("新規"),
        ),
    )

    assert updated is not None
    assert updated.location_id is not None
    assert updated.location is not None and updated.location.name == "新規"


@pytest.mark.asyncio
async def test_update_block_replace_location(
    db_session: AsyncSession, test_create_page: Page
):
    """
    update_block()/正常系/location を別の location で上書きすると旧行が削除される
    """
    created_block = await blocks_cruds.create_block(
        db=db_session,
        block=BlockCreate(
            title="t",
            start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
            block_type="event",
            location=_location_input("旧"),
        ),
        page_id=test_create_page.id,
    )
    old_location_id = created_block.location_id
    assert old_location_id is not None

    updated = await blocks_cruds.update_block(
        db=db_session,
        block_id=created_block.id,
        block=BlockUpdate(
            title="t",
            start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
            block_type="event",
            location=_location_input("新"),
        ),
    )

    assert updated is not None
    assert updated.location_id is not None
    assert updated.location_id != old_location_id
    assert updated.location is not None and updated.location.name == "新"

    # 旧 location 行は削除されている
    old_row = await db_session.get(Location, old_location_id)
    assert old_row is None


@pytest.mark.asyncio
async def test_update_block_remove_location(
    db_session: AsyncSession, test_create_page: Page
):
    """
    update_block()/正常系/location=None で解除 + 旧行削除
    """
    created_block = await blocks_cruds.create_block(
        db=db_session,
        block=BlockCreate(
            title="t",
            start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
            block_type="event",
            location=_location_input("解除対象"),
        ),
        page_id=test_create_page.id,
    )
    old_location_id = created_block.location_id
    assert old_location_id is not None

    updated = await blocks_cruds.update_block(
        db=db_session,
        block_id=created_block.id,
        block=BlockUpdate(
            title="t",
            start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
            block_type="event",
            location=None,
        ),
    )

    assert updated is not None
    assert updated.location_id is None

    old_row = await db_session.get(Location, old_location_id)
    assert old_row is None


@pytest.mark.asyncio
async def test_update_block_preserve_location_by_id(
    db_session: AsyncSession, test_create_page: Page
):
    """
    update_block()/正常系/同じ id を渡すと既存行が維持され、フィールドが更新される
    """
    created_block = await blocks_cruds.create_block(
        db=db_session,
        block=BlockCreate(
            title="t",
            start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
            block_type="event",
            location=_location_input("旧名称"),
        ),
        page_id=test_create_page.id,
    )
    location_id = created_block.location_id
    assert location_id is not None

    updated = await blocks_cruds.update_block(
        db=db_session,
        block_id=created_block.id,
        block=BlockUpdate(
            title="t changed",
            start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
            block_type="event",
            location=LocationUpdate(id=location_id, name="新名称"),
        ),
    )

    assert updated is not None
    assert updated.location_id == location_id  # 同じ id のまま（行の入れ替わりなし）
    # フィールドは更新されている
    existing = await db_session.get(Location, location_id)
    assert existing is not None
    assert existing.name == "新名称"


@pytest.mark.asyncio
async def test_delete_block(db_session: AsyncSession, test_create_page: Page):
    """
    delete_block()/正常系
    """
    # arrange
    block_in = BlockCreate(
        title="delete",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        detail="d",
        block_type="event",
    )
    created_block = await blocks_cruds.create_block(
        db=db_session, block=block_in, page_id=test_create_page.id
    )

    # act
    result = await blocks_cruds.delete_block(db=db_session, block_id=created_block.id)

    # assert
    assert result is True
    assert (
        await blocks_cruds.get_block(db=db_session, block_id=created_block.id) is None
    )

    # act(block_idが存在しない場合)
    non_existent_result = await blocks_cruds.delete_block(db=db_session, block_id=999)

    # assert
    assert non_existent_result is False


@pytest.mark.asyncio
async def test_delete_block_cascades_locations(
    db_session: AsyncSession, test_create_page: Page
):
    """
    delete_block()/正常系/所有する location / destination_location も削除される
    """
    created_block = await blocks_cruds.create_block(
        db=db_session,
        block=BlockCreate(
            title="drive",
            start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
            block_type="move",
            transportation_type="car",
            location=_location_input("出発"),
            destination_location=_location_input("到着"),
        ),
        page_id=test_create_page.id,
    )
    loc_id = created_block.location_id
    dest_id = created_block.destination_location_id
    assert loc_id is not None and dest_id is not None

    result = await blocks_cruds.delete_block(
        db=db_session, block_id=created_block.id
    )
    assert result is True

    # locations 行が両方消えている
    rows = (await db_session.execute(select(Location))).scalars().all()
    assert rows == []


@pytest.mark.asyncio
async def test_transportation_type_constraint(
    db_session: AsyncSession, test_create_page: Page
):
    """
    Block CheckConstraint/event ブロックに transportation_type は入らない
    """
    block_in = BlockCreate(
        title="invalid",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        block_type="event",
        transportation_type="car",
    )

    with pytest.raises(IntegrityError):
        await blocks_cruds.create_block(
            db=db_session, block=block_in, page_id=test_create_page.id
        )


@pytest.mark.asyncio
async def test_destination_location_only_for_move(
    db_session: AsyncSession, test_create_page: Page
):
    """
    Block CheckConstraint/event ブロックに destination_location は入らない
    """
    block_in = BlockCreate(
        title="invalid",
        start_time=datetime(2023, 1, 1, 10, 0, tzinfo=timezone.utc),
        block_type="event",
        destination_location=_location_input("不正"),
    )

    with pytest.raises(IntegrityError):
        await blocks_cruds.create_block(
            db=db_session, block=block_in, page_id=test_create_page.id
        )
