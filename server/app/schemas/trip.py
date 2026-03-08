from pydantic import BaseModel, ConfigDict
from pydantic.fields import Field

from .page import Page

TRIP_MAX_TITLE_LENGTH = 200
TRIP_MAX_DETAIL_LENGTH = 2000


class TripBase(BaseModel):
    title: str = Field(min_length=1, max_length=TRIP_MAX_TITLE_LENGTH)
    detail: str | None = Field(default=None, max_length=TRIP_MAX_DETAIL_LENGTH)


class TripCreateIn(TripBase):
    pass


class TripCreateOut(BaseModel):
    id: int
    url_id: str

    model_config = ConfigDict(from_attributes=True)


class TripUpdate(TripBase):
    pass


class Trip(TripBase):
    id: int
    url_id: str
    pages: list[Page] = []

    model_config = ConfigDict(from_attributes=True)
