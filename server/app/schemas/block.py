from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class BlockType(str, Enum):
    EVENT = "event"
    STAY = "stay"
    MOVE = "move"


class BlockBase(BaseModel):
    title: str
    start_time: datetime
    end_time: datetime | None = None
    detail: str
    block_type: BlockType  # Use the Enum here
    transportation_type: str | None = None


class BlockCreate(BlockBase):
    pass


class BlockUpdate(BlockBase):
    pass


class Block(BlockBase):
    id: int
    page_id: int
    model_config = ConfigDict(from_attributes=True)
