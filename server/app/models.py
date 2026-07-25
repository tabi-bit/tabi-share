"""
Add Trip, Page, Block, and Location models with relationships.
"""

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Connection,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    event,
    func,
    text,
)
from sqlalchemy.orm import Mapped, Mapper, mapped_column, relationship

from .db_connection import Base


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    google_place_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Google Places API の place_id",
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="場所名")
    address: Mapped[str | None] = mapped_column(Text, nullable=True, comment="住所")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, comment="緯度")
    longitude: Mapped[float | None] = mapped_column(
        Float, nullable=True, comment="経度"
    )
    website_uri: Mapped[str | None] = mapped_column(
        String(2048), nullable=True, comment="公式サイトURL"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="作成日時",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="更新日時",
    )


class Trip(Base):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint(
            "start_date IS NULL OR end_date IS NULL OR start_date <= end_date",
            name="ck_trips_start_date_le_end_date",
        ),
    )
    # onupdate=func.now() でセットされた updated_at / last_edited_at をコミット
    # 直後の応答でそのまま参照できるよう、UPDATE 時に RETURNING で取得させる
    __mapper_args__ = {"eager_defaults": True}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    url_id: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique identifier for the trip in the URL",
    )
    title: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="Title of the trip"
    )
    detail: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Detailed description of the trip"
    )
    start_date: Mapped[date | None] = mapped_column(
        Date, nullable=True, comment="旅程開始日"
    )
    end_date: Mapped[date | None] = mapped_column(
        Date, nullable=True, comment="旅程終了日"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="作成日時",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="更新日時（trips 行自身のカラム変更時刻）",
    )
    last_edited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="最終編集日時（配下 Page/Block の変更も含む）",
    )
    # Relationships
    pages: Mapped[list["Page"]] = relationship(
        "Page",
        back_populates="trip",
        cascade="all, delete-orphan",
        lazy="raise",
        passive_deletes=True,
    )


class Page(Base):
    __tablename__ = "pages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the associated trip",
    )
    title: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="Title of the page"
    )
    date: Mapped[date | None] = mapped_column(
        Date, nullable=True, comment="ページの単日程"
    )
    # Relationships
    trip: Mapped["Trip"] = relationship(
        "Trip",
        back_populates="pages",
    )
    blocks: Mapped[list["Block"]] = relationship(
        "Block",
        back_populates="page",
        cascade="all, delete-orphan",
        lazy="raise",
        passive_deletes=True,
    )


class Block(Base):
    __tablename__ = "blocks"
    __table_args__ = (
        CheckConstraint(
            "block_type = 'move' OR destination_location_id IS NULL",
            name="ck_blocks_destination_only_for_move",
        ),
        CheckConstraint(
            "transportation_type IS NULL OR block_type = 'move'",
            name="ck_blocks_transportation_type_only_for_move",
        ),
        # 通知 tick スキャンで WHERE start_time > now() AND start_time <= now() + interval
        # を毎分実行するため
        Index("idx_blocks_start_time", "start_time"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="Title of the block"
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="Start time of the block(UTC)"
    )
    end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="End time of the block(UTC)"
    )
    page_id: Mapped[int] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the associated page",
    )
    detail: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Detailed description of the block"
    )
    block_type: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="Type of the block defined in app as enum"
    )
    transportation_type: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Type of transportation"
    )
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="場所（Schedule: この場所, Transportation: 出発地）",
    )
    destination_location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="目的地（Transportationのみ使用）",
    )
    # Relationships
    page: Mapped["Page"] = relationship(
        "Page",
        back_populates="blocks",
    )
    location: Mapped["Location | None"] = relationship(
        "Location",
        foreign_keys=[location_id],
        lazy="raise",
    )
    destination_location: Mapped["Location | None"] = relationship(
        "Location",
        foreign_keys=[destination_location_id],
        lazy="raise",
    )


class DeviceSubscription(Base):
    """FCM プッシュ通知の端末 × Trip 単位の購読レコード。

    Firebase Auth 未導入のため user_id ではなく fcm_token を主キー相当として扱う。
    """

    __tablename__ = "device_subscriptions"
    __table_args__ = (
        # (fcm_token, trip_id) の順序は fcm_token 単体クエリ (token リフレッシュ /
        # 失効時に全 trip 分削除) でも B-tree の左端 prefix match が効くよう意図的
        UniqueConstraint(
            "fcm_token",
            "trip_id",
            name="uq_device_subscriptions_fcm_token_trip_id",
        ),
        # Pydantic 側の範囲検証をバイパスする経路 (raw SQL / 将来のバッチ) から
        # 不正値が混入するのを防ぐため、DB 側でも保険をかける
        CheckConstraint(
            "minutes_before >= 1 AND minutes_before <= 120",
            name="ck_device_subscriptions_minutes_before_range",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    fcm_token: Mapped[str] = mapped_column(
        String(500), nullable=False, comment="FCM registration token"
    )
    trip_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="購読対象 Trip",
    )
    minutes_before: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
        server_default=text("5"),
        comment="通知先行分",
    )
    timezone: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="IANA TZ (例: 'Asia/Tokyo')。通知本文の時刻整形に使用",
    )
    user_agent: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="デバッグ用の User-Agent"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="購読作成日時",
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="最終アクセス日時 (token リフレッシュ判定用)",
    )


class SentNotification(Base):
    """送信済み通知記録。

    (block_id, fcm_token, kind) の複合 PK を「送信ロック」として使い、
    INSERT-first で二重送信を絶対に防ぐ (送信失敗はロスト受容 / MVP 方針)。
    """

    __tablename__ = "sent_notifications"

    block_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("blocks.id", ondelete="CASCADE"),
        primary_key=True,
        comment="送信対象 Block",
    )
    fcm_token: Mapped[str] = mapped_column(
        String(500), primary_key=True, comment="送信先 FCM token"
    )
    kind: Mapped[str] = mapped_column(
        String(30),
        primary_key=True,
        comment="通知種別 (現状 'before_5min' 固定、将来拡張余地)",
    )
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="送信ロックを取得した時刻",
    )


# ---------------------------------------------------------------------------
# 親 Trip の last_edited_at 自動更新
# ---------------------------------------------------------------------------
# Trip 自身の UPDATE では onupdate=func.now() で last_edited_at と updated_at
# の両方が bump される。ここでは配下の Page / Block の変更で親 Trip の
# last_edited_at のみを bump し、updated_at (行自身のカラム変更時刻) は触らない。
#
# 実装メモ:
# - raw SQL (text) を使うのは、SQLAlchemy Core の update() 経由だと trips.updated_at
#   の onupdate=func.now() が自動発火して last_edited_at と一緒に updated_at も
#   意図せず bump されてしまうため。
# - clock_timestamp() (wall time) を使うのは、now()/transaction_timestamp() が
#   トランザクション開始時刻を返す仕様のため、同一 tx 内の複数 bump が同一値になる
#   のを避け、テスト・本番ともに実イベント時刻に紐づく値にするため。
# - passive_deletes=True により Trip 削除に伴う Page/Block の連鎖削除は DB CASCADE
#   で行われ ORM イベントは発火しないため、消える Trip を bump しようとする心配はない。


def _bump_trip_last_edited_at(connection: Connection, trip_id: int) -> None:
    connection.execute(
        text("UPDATE trips SET last_edited_at = clock_timestamp() WHERE id = :trip_id"),
        {"trip_id": trip_id},
    )


def _bump_trip_last_edited_at_via_page(connection: Connection, page_id: int) -> None:
    connection.execute(
        text(
            "UPDATE trips SET last_edited_at = clock_timestamp() "
            "WHERE id = (SELECT trip_id FROM pages WHERE id = :page_id)"
        ),
        {"page_id": page_id},
    )


@event.listens_for(Page, "after_insert")
@event.listens_for(Page, "after_update")
@event.listens_for(Page, "after_delete")
def _on_page_change(mapper: Mapper, connection: Connection, target: Page) -> None:
    _bump_trip_last_edited_at(connection, target.trip_id)


@event.listens_for(Block, "after_insert")
@event.listens_for(Block, "after_update")
@event.listens_for(Block, "after_delete")
def _on_block_change(mapper: Mapper, connection: Connection, target: Block) -> None:
    _bump_trip_last_edited_at_via_page(connection, target.page_id)
