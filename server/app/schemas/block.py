from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, ConfigDict, field_validator


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

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_timezone(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return None
        if v.tzinfo is not None:
            v = v.astimezone(timezone.utc).replace(tzinfo=None)
        return v


class BlockCreate(BlockBase):
    pass


class BlockUpdate(BlockBase):
    pass


class Block(BlockBase):
    id: int
    page_id: int
    model_config = ConfigDict(from_attributes=True)
