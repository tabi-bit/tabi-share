from pydantic import BaseModel, ConfigDict

from .block import Block


class PageBase(BaseModel):
    title: str


class PageCreate(PageBase):
    pass


class PageUpdate(PageBase):
    pass


class Page(PageBase):
    id: int
    trip_id: int
    blocks: list[Block] = []

    model_config = ConfigDict(from_attributes=True)
