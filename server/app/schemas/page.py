import datetime

from pydantic import BaseModel, ConfigDict

from .block import Block


class PageBase(BaseModel):
    title: str
    date: datetime.date | None = None


class PageCreate(PageBase):
    pass


class PageUpdate(PageBase):
    pass


class Page(PageBase):
    id: int
    trip_id: int
    blocks: list[Block] = []

    model_config = ConfigDict(from_attributes=True)


class PageCreateResponse(PageBase):
    id: int
    trip_id: int

    model_config = ConfigDict(from_attributes=True)
