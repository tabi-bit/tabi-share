from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict
from pydantic.fields import Field

from app.schemas.location import Location, LocationUpdate

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
    location: LocationUpdate | None = None
    destination_location: LocationUpdate | None = None


class BlockUpdate(BlockBase):
    """
    PUT による全体置換を前提とする。未指定フィールドは null 扱い（後勝ち）。

    - location / destination_location が None: 場所解除
    - id が現行と一致: 既存行を維持
    - id が None / 異なる id: 旧行を削除して新規作成
    """

    location: LocationUpdate | None = None
    destination_location: LocationUpdate | None = None


class Block(BlockBase):
    id: int
    page_id: int
    location_id: int | None = None
    location: Location | None = None
    destination_location_id: int | None = None
    destination_location: Location | None = None
    model_config = ConfigDict(from_attributes=True)
