from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.cruds import blocks as blocks_cruds
from app.cruds import pages as pages_cruds
from app.db_connection import get_db_session
from app.schemas.block import Block, BlockCreate, BlockUpdate

router = APIRouter(tags=["Blocks"])


@router.post(
    "/pages/{page_id}/blocks",
    summary="ブロック作成",
    operation_id="blocks-create",
    response_model=Block,
)
async def create_block(
    page_id: int, block: BlockCreate, db: Session = Depends(get_db_session)
) -> Block:
    """
    説明:

    - 新しいブロックを作成する
    """
    db_page = await pages_cruds.get_page(db, page_id=page_id)
    if db_page is None:
        raise HTTPException(status_code=404, detail="Page not found")

    return await blocks_cruds.create_block(db=db, block=block, page_id=page_id)


@router.get(
    "/pages/{page_id}/blocks",
    summary="ブロック一覧取得",
    operation_id="blocks-list",
    response_model=list[Block],
)
async def get_blocks(
    page_id: int, db: Session = Depends(get_db_session)
) -> list[Block]:
    """
    説明:

    - 特定のページに関連するすべてのブロックを取得する
    """
    return await blocks_cruds.find_blocks(db=db, page_id=page_id)  # type: ignore


@router.get(
    "/blocks/{block_id}",
    summary="ブロック取得",
    operation_id="blocks-get",
    response_model=Block,
)
async def get_block(block_id: int, db: Session = Depends(get_db_session)) -> Block:
    """
    説明:

    - IDで指定された単一のブロックを取得する
    """
    db_block = await blocks_cruds.get_block(db, block_id=block_id)
    if db_block is None:
        raise HTTPException(status_code=404, detail="Block not found")

    return db_block


@router.put(
    "/blocks/{block_id}",
    summary="ブロック更新",
    operation_id="blocks-update",
    response_model=Block,
)
async def update_block(
    block_id: int, block: BlockUpdate, db: Session = Depends(get_db_session)
) -> Block:
    """
    説明:

    - IDで指定された単一のブロックを更新する
    """
    db_block = await blocks_cruds.update_block(db, block_id=block_id, block=block)
    if db_block is None:
        raise HTTPException(status_code=404, detail="Block not found")

    return db_block


@router.delete(
    "/blocks/{block_id}",
    summary="ブロック削除",
    operation_id="blocks-delete",
    status_code=204,
)
async def delete_block(block_id: int, db: Session = Depends(get_db_session)) -> None:
    """
    説明:

    - IDで指定された単一のブロックを削除する
    """
    if not await blocks_cruds.delete_block(db, block_id=block_id):
        raise HTTPException(status_code=404, detail="Block not found")

    return
