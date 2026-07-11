"""add_notification_tables

Revision ID: e6a2f9b18c34
Revises: d5b3e9c1f27a
Create Date: 2026-07-11 17:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e6a2f9b18c34"
down_revision: Union[str, Sequence[str], None] = "d5b3e9c1f27a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # device_subscriptions: 端末 × Trip の購読関係
    op.create_table(
        "device_subscriptions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "fcm_token",
            sa.String(length=500),
            nullable=False,
            comment="FCM registration token",
        ),
        sa.Column(
            "trip_id",
            sa.BigInteger(),
            nullable=False,
            comment="購読対象 Trip",
        ),
        sa.Column(
            "minutes_before",
            sa.SmallInteger(),
            nullable=False,
            server_default=sa.text("5"),
            comment="通知先行分",
        ),
        sa.Column(
            "timezone",
            sa.String(length=64),
            nullable=False,
            comment="IANA TZ (例: 'Asia/Tokyo')。通知本文の時刻整形に使用",
        ),
        sa.Column(
            "user_agent",
            sa.String(length=500),
            nullable=True,
            comment="デバッグ用の User-Agent",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
            comment="購読作成日時",
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
            comment="最終アクセス日時 (token リフレッシュ判定用)",
        ),
        sa.ForeignKeyConstraint(
            ["trip_id"],
            ["trips.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        # (fcm_token, trip_id) の順序は fcm_token 単体クエリ (token リフレッシュ /
        # 失効時全削除) にも B-tree の左端 prefix match で使えるよう意図的
        sa.UniqueConstraint(
            "fcm_token",
            "trip_id",
            name="uq_device_subscriptions_fcm_token_trip_id",
        ),
    )
    op.create_index(
        "idx_device_subscriptions_trip",
        "device_subscriptions",
        ["trip_id"],
    )

    # sent_notifications: 送信済み記録 (二重送信阻止のロック)
    op.create_table(
        "sent_notifications",
        sa.Column(
            "block_id",
            sa.BigInteger(),
            nullable=False,
            comment="送信対象 Block",
        ),
        sa.Column(
            "fcm_token",
            sa.String(length=500),
            nullable=False,
            comment="送信先 FCM token",
        ),
        sa.Column(
            "kind",
            sa.String(length=30),
            nullable=False,
            comment="通知種別 (現状 'before_5min' 固定、将来拡張余地)",
        ),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
            comment="送信ロックを取得した時刻",
        ),
        sa.ForeignKeyConstraint(
            ["block_id"],
            ["blocks.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("block_id", "fcm_token", "kind"),
    )

    # tick スキャン (WHERE b.start_time > now() AND b.start_time <= now() + interval) 用
    op.create_index(
        "idx_blocks_start_time",
        "blocks",
        ["start_time"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_blocks_start_time", table_name="blocks")
    op.drop_table("sent_notifications")
    op.drop_index("idx_device_subscriptions_trip", table_name="device_subscriptions")
    op.drop_table("device_subscriptions")
