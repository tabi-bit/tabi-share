from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict
from pydantic.fields import Field

BLOCK_MAX_TITLE_LENGTH = 200
BLOCK_MAX_DETAIL_LENGTH = 2000


class BlockType(str, Enum):
    EVENT = "event"
    STAY = "stay"
    MOVE = "move"


class BlockBase(BaseModel):
    title: str = Field(min_length=1, max_length=BLOCK_MAX_TITLE_LENGTH)
    start_time: datetime
    end_time: datetime | None = None
    detail: str | None = Field(default=None, max_length=BLOCK_MAX_DETAIL_LENGTH)
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
