from datetime import date, datetime
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from pydantic.fields import Field

from .page import Page

TRIP_MAX_TITLE_LENGTH = 200
TRIP_MAX_DETAIL_LENGTH = 2000
TRIP_MAX_WALICA_URL_LENGTH = 2048
WALICA_HOSTNAME = "walica.jp"


class TripBase(BaseModel):
    title: str = Field(min_length=1, max_length=TRIP_MAX_TITLE_LENGTH)
    detail: str | None = Field(default=None, max_length=TRIP_MAX_DETAIL_LENGTH)
    start_date: date | None = None
    end_date: date | None = None
    walica_url: str | None = Field(default=None, max_length=TRIP_MAX_WALICA_URL_LENGTH)

    @field_validator("walica_url", mode="after")
    @classmethod
    def _check_walica_url(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return value
        parsed = urlparse(value)
        if parsed.scheme not in ("http", "https") or parsed.hostname != WALICA_HOSTNAME:
            raise ValueError("walica_url must be an http(s) URL on walica.jp")
        return value

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
    last_edited_at: datetime

    model_config = ConfigDict(from_attributes=True)
