from sqlalchemy.orm import Session

from app.models import Block
from app.schemas.block import BlockCreate, BlockUpdate


async def create_block(db: Session, block: BlockCreate, page_id: int) -> Block:
    """
    ブロックをデータベースに作成する関数

    Args:
        db (Session): データベースセッション
        block (BlockCreate): ブロック作成用のスキーマ
        page_id (int): ページのID

    Returns:
        Block: 作成されたブロック
    """
    db_block = Block(**block.model_dump(), page_id=page_id)
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block


async def find_blocks(db: Session, page_id: int) -> list[Block]:
    """
    特定のページに関連するすべてのブロックを取得する関数

    Args:
        db (Session): データベースセッション
        page_id (int): ページのID

    Returns:
        list[Block]: ブロックリスト
    """
    return db.query(Block).filter(Block.page_id == page_id).all()


async def get_block(db: Session, block_id: int) -> Block | None:
    """
    特定のブロックを取得する関数

    Args:
        db (Session): データベースセッション
        block_id (int): ブロックのID

    Returns:
        Block | None: 特定のブロック、見つからない場合はNone
    """
    return db.query(Block).filter(Block.id == block_id).first()


async def update_block(db: Session, block_id: int, block: BlockUpdate) -> Block | None:
    """
    特定のブロックを更新する関数

    Args:
        db (Session): データベースセッション
        block_id (int): 更新するブロックのID
        block (BlockUpdate): 更新内容

    Returns:
        Block | None: 更新されたブロック、見つからない場合はNone
    """
    db_block = await get_block(db, block_id)
    if db_block:
        for key, value in block.model_dump().items():
            setattr(db_block, key, value)
        db.commit()
        db.refresh(db_block)

    return db_block


async def delete_block(db: Session, block_id: int) -> bool:
    """
    特定のブロックを削除する関数

    Args:
        db (Session): データベースセッション
        block_id (int): 削除するブロックのID

    Returns:
        bool: 削除が成功した場合はTrue、失敗した場合はFalse
    """
    db_block = await get_block(db, block_id)
    if db_block:
        db.delete(db_block)
        db.commit()
        return True

    return False
