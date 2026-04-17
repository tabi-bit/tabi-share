from pydantic import BaseModel, ConfigDict, Field

LOCATION_MAX_NAME_LENGTH = 200


GOOGLE_PLACE_ID_MAX_LENGTH = 255


WEBSITE_URI_MAX_LENGTH = 2048


class LocationBase(BaseModel):
    google_place_id: str | None = Field(default=None, max_length=GOOGLE_PLACE_ID_MAX_LENGTH)
    name: str = Field(min_length=1, max_length=LOCATION_MAX_NAME_LENGTH)
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    website_uri: str | None = Field(default=None, max_length=WEBSITE_URI_MAX_LENGTH)


class LocationCreate(LocationBase):
    pass


class LocationUpdate(LocationBase):
    """
    ブロック更新時に埋め込む場所情報。

    - id が現行の `block.location_id` と一致する場合: 既存行を維持（同一参照）
    - id が None / 異なる id: 旧行を削除して新規作成
    """

    id: int | None = None


class Location(LocationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
