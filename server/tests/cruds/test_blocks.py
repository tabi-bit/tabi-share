from app.schemas.block import BlockType
from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.cruds import blocks as blocks_cruds
from app.schemas.block import BlockCreate, BlockUpdate
from app.schemas.page import Page


@pytest.mark.asyncio
async def test_create_block(db_session: Session, test_create_page: Page):
    """
    create_block()/正常系
    """
    # arrange
    block_in = BlockCreate(
        title="test block",
        start_time=datetime(2023, 1, 1, 10, 0),
        end_time=datetime(2023, 1, 1, 12, 0),
        detail="test detail",
        block_type=BlockType.EVENT,
        transportation_type="car",
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
    assert db_block.transportation_type == block_in.transportation_type
    assert db_block.page == test_create_page


@pytest.mark.asyncio
async def test_create_block_non_existent_page_id(db_session: Session):
    """
    create_block()/異常系/page_idが存在しない場合
    """
    # arrange
    block_in = BlockCreate(
        title="test block",
        start_time=datetime(2023, 1, 1, 10, 0),
        end_time=datetime(2023, 1, 1, 12, 0),
        detail="test detail",
        block_type=BlockType.EVENT,
    )
    non_existent_page_id = 999

    # act & assert
    with pytest.raises(IntegrityError):
        await blocks_cruds.create_block(
            db=db_session, block=block_in, page_id=non_existent_page_id
        )


@pytest.mark.asyncio
async def test_get_block(db_session: Session, test_create_page: Page):
    """
    get_block()/正常系
    """
    # arrange
    block_in = BlockCreate(
        title="test block",
        start_time=datetime(2023, 1, 1, 10, 0),
        end_time=datetime(2023, 1, 1, 12, 0),
        detail="test detail",
        block_type=BlockType.EVENT,
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
async def test_find_blocks(db_session: Session, test_create_page: Page):
    """
    find_blocks()/正常系
    """
    # arrange
    await blocks_cruds.create_block(
        db=db_session,
        block=BlockCreate(
            title="b1",
            start_time=datetime(2023, 1, 1, 10, 0),
            detail="d",
            block_type=BlockType.EVENT,
        ),
        page_id=test_create_page.id,
    )
    await blocks_cruds.create_block(
        db=db_session,
        block=BlockCreate(
            title="b2",
            start_time=datetime(2023, 1, 1, 11, 0),
            detail="d",
            block_type=BlockType.EVENT,
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
async def test_update_block(db_session: Session, test_create_page: Page):
    """
    update_block()/正常系
    """
    # arrange
    block_in = BlockCreate(
        title="before",
        start_time=datetime(2023, 1, 1, 10, 0),
        detail="d",
        block_type=BlockType.EVENT,
    )
    created_block = await blocks_cruds.create_block(
        db=db_session, block=block_in, page_id=test_create_page.id
    )
    update_data = BlockUpdate(
        title="after",
        start_time=datetime(2023, 1, 1, 10, 0),
        detail="d",
        block_type=BlockType.EVENT,
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
async def test_delete_block(db_session: Session, test_create_page: Page):
    """
    delete_block()/正常系
    """
    # arrange
    block_in = BlockCreate(
        title="delete",
        start_time=datetime(2023, 1, 1, 10, 0),
        detail="d",
        block_type=BlockType.EVENT,
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
