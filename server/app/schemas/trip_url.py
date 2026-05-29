"""URL ストック関連の補助エンドポイント用スキーマ

データの永続化はフロント側で行うため、ここでは `/preview` と `/format` の
入出力スキーマのみを定義する。
"""

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator


class TripUrlPreviewRequest(BaseModel):
    """URL からメタデータ（title / og:image）を取得するリクエスト"""

    url: AnyHttpUrl


class TripUrlPreview(BaseModel):
    """URL のメタデータ取得結果。本文要約は別エンドポイント `/format` で行う"""

    title: str | None = None
    thumbnail_url: str | None = None


class TripUrlFormatRequest(BaseModel):
    """ユーザー貼付テキストを AI で markdown に整形するリクエスト"""

    source_text: str = Field(max_length=20_000)
    intent: str | None = Field(default=None, max_length=200)

    @field_validator("source_text")
    @classmethod
    def _non_empty_source_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("source_text must not be empty")
        return value


class TripUrlFormatResponse(BaseModel):
    """AI 整形結果。markdown は呼び出し側で memo に追記される"""

    markdown: str
