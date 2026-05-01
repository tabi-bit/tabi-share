from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cruds import locations as locations_cruds
from app.models import Block
from app.schemas.block import BlockCreate, BlockUpdate
from app.schemas.location import LocationCreate, LocationUpdate


async def create_block(db: AsyncSession, block: BlockCreate, page_id: int) -> Block:
    """
    ブロックをデータベースに作成する関数

    location / destination_location が含まれている場合は先にセッションへ追加（flush）してから
    block を作成し、最後に一度だけ commit する（部分失敗時のオーファンを防ぐ）。

    Args:
        db (AsyncSession): 非同期データベースセッション
        block (BlockCreate): ブロック作成用のスキーマ
        page_id (int): ページのID

    Returns:
        Block: 作成されたブロック
    """
    block_data = block.model_dump(exclude={"location", "destination_location"})

    if block.location is not None:
        db_location = await locations_cruds.create_location(
            db, LocationCreate(**block.location.model_dump(exclude={"id"}))
        )
        block_data["location_id"] = db_location.id

    if block.destination_location is not None:
        db_dest = await locations_cruds.create_location(
            db,
            LocationCreate(**block.destination_location.model_dump(exclude={"id"})),
        )
        block_data["destination_location_id"] = db_dest.id

    db_block = Block(**block_data, page_id=page_id)
    db.add(db_block)
    await db.commit()
    await db.refresh(db_block)
    return db_block


async def find_blocks(db: AsyncSession, page_id: int) -> list[Block]:
    """
    特定のページに関連するすべてのブロックを取得する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        page_id (int): ページのID

    Returns:
        list[Block]: ブロックリスト
    """
    result = await db.execute(select(Block).where(Block.page_id == page_id))
    return list(result.scalars().all())


async def get_block(db: AsyncSession, block_id: int) -> Block | None:
    """
    特定のブロックを取得する関数

    Args:
        db (AsyncSession): 非同期データベースセッション
        block_id (int): ブロックのID

    Returns:
        Block | None: 特定のブロック、見つからない場合はNone
    """
    result = await db.execute(select(Block).where(Block.id == block_id))
    return result.scalar_one_or_none()


async def _replace_block_location(
    db: AsyncSession,
    db_block: Block,
    fk_attr: str,
    new: LocationUpdate | None,
) -> None:
    """
    ブロックの location / destination_location FK を後勝ちで置換するヘルパー

    id が現行 FK と一致する場合は既存行のフィールドを上書きする（名前・住所等の変更に対応）。
    それ以外は旧 location 行を削除し、新規作成して紐づける。

    Args:
        db: 非同期データベースセッション
        db_block: 対象ブロック
        fk_attr: "location_id" または "destination_location_id"
        new: 新しい location 情報（None なら解除）
    """
    old_id: int | None = getattr(db_block, fk_attr)

    if new is None:
        new_id = None
    elif new.id is not None and new.id == old_id:
        # 同じ id: 既存行のフィールドを上書き（名前や住所の変更に対応）
        db_location = await locations_cruds.get_location(db, old_id)
        if db_location is not None:
            for key, value in new.model_dump(exclude={"id"}).items():
                setattr(db_location, key, value)
        return
    else:
        created = await locations_cruds.create_location(
            db, LocationCreate(**new.model_dump(exclude={"id"}))
        )
        new_id = created.id

    setattr(db_block, fk_attr, new_id)
    # FK 更新を DB に反映してから旧 location を削除（FK 参照の順序保証）
    await db.flush()

    if old_id is not None and old_id != new_id:
        await locations_cruds.delete_location(db, old_id)


async def update_block(
    db: AsyncSession, block_id: int, block: BlockUpdate
) -> Block | None:
    """
    特定のブロックを後勝ちで置換する関数（PUT セマンティクス）

    スカラーフィールドは全て上書き。location / destination_location は
    `_replace_block_location` で id 一致判定に基づき維持／新規作成。

    Args:
        db (AsyncSession): 非同期データベースセッション
        block_id (int): 更新するブロックのID
        block (BlockUpdate): 更新内容

    Returns:
        Block | None: 更新されたブロック、見つからない場合はNone
    """
    db_block = await get_block(db, block_id)
    if db_block is None:
        return None

    scalar_data = block.model_dump(exclude={"location", "destination_location"})
    for key, value in scalar_data.items():
        setattr(db_block, key, value)

    await _replace_block_location(db, db_block, "location_id", block.location)
    await _replace_block_location(
        db, db_block, "destination_location_id", block.destination_location
    )

    await db.commit()
    await db.refresh(db_block)
    return db_block


async def delete_block(db: AsyncSession, block_id: int) -> bool:
    """
    特定のブロックとそれが所有する location 行を削除する関数

    location の FK は ON DELETE SET NULL だが、各ブロックが独自の location を
    持つためブロック削除時に孤立する。ここで明示的に削除する。

    Args:
        db (AsyncSession): 非同期データベースセッション
        block_id (int): 削除するブロックのID

    Returns:
        bool: 削除が成功した場合はTrue、見つからない場合はFalse
    """
    db_block = await get_block(db, block_id)
    if db_block is None:
        return False

    loc_id = db_block.location_id
    dest_id = db_block.destination_location_id

    await db.delete(db_block)
    # block 削除を DB に反映（ON DELETE SET NULL で FK が切れる）してから location を削除
    await db.flush()
    if loc_id is not None:
        await locations_cruds.delete_location(db, loc_id)
    if dest_id is not None:
        await locations_cruds.delete_location(db, dest_id)

    await db.commit()
    return True
