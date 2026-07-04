from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, model_validator
from pydantic.fields import Field

from .page import Page

TRIP_MAX_TITLE_LENGTH = 200
TRIP_MAX_DETAIL_LENGTH = 2000


class TripBase(BaseModel):
    title: str = Field(min_length=1, max_length=TRIP_MAX_TITLE_LENGTH)
    detail: str | None = Field(default=None, max_length=TRIP_MAX_DETAIL_LENGTH)
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def _check_date_range(self) -> "TripBase":
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.start_date > self.end_date
        ):
            raise ValueError("start_date must be on or before end_date")
        return self


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
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
