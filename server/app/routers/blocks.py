from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    get_allowed_trip_ids,
    require_block_access,
    require_page_access,
)
from app.cruds import blocks as blocks_cruds
from app.cruds import pages as pages_cruds
from app.db_connection import get_db_session
from app.errors import Forbidden, NotFound
from app.schemas.block import Block, BlockCreate, BlockUpdate

router = APIRouter(tags=["Blocks"])


@router.post(
    "/pages/{page_id}/blocks",
    summary="ブロック作成",
    operation_id="blocks-create",
    response_model=Block,
)
async def create_block(
    page_id: int,
    block: BlockCreate,
    _: int = Depends(require_page_access),
    db: AsyncSession = Depends(get_db_session),
) -> Block:
    """
    説明:

    - 新しいブロックを作成する
    - `location` / `destination_location` を含める場合は同一トランザクションで作成する
    """
    return await blocks_cruds.create_block(db=db, block=block, page_id=page_id)


@router.get(
    "/pages/{page_id}/blocks",
    summary="ブロック一覧取得",
    operation_id="blocks-list",
    response_model=list[Block],
)
async def get_blocks(
    page_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> list[Block]:
    """
    説明:

    - 特定のページに関連するすべてのブロックを取得する
    - 認可と本体取得を 1 クエリで済ませるため、Page を blocks 込みで取得し
      その page.trip_id を Cookie で検証する
    """
    db_page = await pages_cruds.get_page(db=db, page_id=page_id)
    if db_page is None:
        raise NotFound(message="Page not found")
    if db_page.trip_id not in get_allowed_trip_ids(request):
        raise Forbidden()
    return db_page.blocks


@router.get(
    "/blocks/{block_id}",
    summary="ブロック取得",
    operation_id="blocks-get",
    response_model=Block,
)
async def get_block(
    block_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> Block:
    """
    説明:

    - IDで指定された単一のブロックを取得する
    - 認可と本体取得を 1 クエリで済ませるため、Block を Page (trip_id 取得用) と
      locations 込みで取得し、その page.trip_id を Cookie で検証する
    """
    db_block = await blocks_cruds.get_block_with_page(db=db, block_id=block_id)
    if db_block is None:
        raise NotFound(message="Block not found")
    if db_block.page.trip_id not in get_allowed_trip_ids(request):
        raise Forbidden()
    return db_block


@router.put(
    "/blocks/{block_id}",
    summary="ブロック更新",
    operation_id="blocks-update",
    response_model=Block,
)
async def update_block(
    block_id: int,
    block: BlockUpdate,
    _: int = Depends(require_block_access),
    db: AsyncSession = Depends(get_db_session),
) -> Block:
    """
    説明:

    - IDで指定された単一のブロックを後勝ちで置換する（PUT セマンティクス）
    - `location` / `destination_location` は id 一致で既存行維持、それ以外は
      旧行削除 + 新規作成
    """
    db_block = await blocks_cruds.update_block(db, block_id=block_id, block=block)
    if db_block is None:
        raise NotFound(message="Block not found")

    return db_block


@router.delete(
    "/blocks/{block_id}",
    summary="ブロック削除",
    operation_id="blocks-delete",
    status_code=204,
)
async def delete_block(
    block_id: int,
    _: int = Depends(require_block_access),
    db: AsyncSession = Depends(get_db_session),
) -> None:
    """
    説明:

    - IDで指定された単一のブロックを削除する
    - 所有する location / destination_location の行も同時に削除する
    """
    if not await blocks_cruds.delete_block(db, block_id=block_id):
        raise NotFound(message="Block not found")

    return
