"""add_users_sessions_and_user_trip_access_tables

Revision ID: f7a1c2d3b4e5
Revises: e6a2f9b18c34
Create Date: 2026-07-26 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7e8f1d9c342"
down_revision: Union[str, Sequence[str], None] = "e6a2f9b18c34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # users: 認可の主体。匿名 user は Cookie 発行時に自動作成される。
    # Firebase Auth 認証時に firebase_uid が埋まって認証済み user に昇格。
    op.create_table(
        "users",
        sa.Column(
            "id",
            sa.BigInteger(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "firebase_uid",
            sa.String(length=128),
            nullable=True,
            comment="Firebase Authentication UID（匿名 user は NULL）",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
            comment="作成日時",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("firebase_uid", name="uq_users_firebase_uid"),
    )

    # sessions: Cookie に載る session_id → user_id の紐付け。
    # user_id は CASCADE で、匿名 user 統合時に session を振り替えた後、
    # 匿名 user を削除しても他 session が残らないようにする。
    op.create_table(
        "sessions",
        sa.Column(
            "id",
            sa.String(length=32),
            nullable=False,
            comment="Cookie に載る session_id（不透明トークン）",
        ),
        sa.Column(
            "user_id",
            sa.BigInteger(),
            nullable=False,
            comment="紐付く user",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
            comment="作成日時",
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
            comment="最終アクセス日時",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_sessions_user_id",
        "sessions",
        ["user_id"],
    )

    # user_trip_access: user × trip のアクセス権と一覧アーカイブ状態。
    # サロゲートキー id を PK とし、(user_id, trip_id) を UNIQUE 制約に置く。
    # 並列付与の race は INSERT ... ON CONFLICT DO NOTHING (unique 制約経由) で
    # idempotent 化する。将来カラム追加や個別参照が生じた際に扱いやすい。
    op.create_table(
        "user_trip_access",
        sa.Column(
            "id",
            sa.BigInteger(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.BigInteger(),
            nullable=False,
            comment="アクセス権を持つ user",
        ),
        sa.Column(
            "trip_id",
            sa.BigInteger(),
            nullable=False,
            comment="アクセス可能な trip",
        ),
        sa.Column(
            "archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
            comment="一覧からアーカイブされたか",
        ),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
            comment="アクセス権を得た日時",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["trip_id"],
            ["trips.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "trip_id",
            name="uq_user_trip_access_user_id_trip_id",
        ),
    )
    # user_id: 「この user が持つ access 一覧」を引くケース向け
    op.create_index(
        "idx_user_trip_access_user_id",
        "user_trip_access",
        ["user_id"],
    )
    # trip_id: 「その trip にアクセスできる user 一覧」を引くケース向け
    op.create_index(
        "idx_user_trip_access_trip_id",
        "user_trip_access",
        ["trip_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_user_trip_access_trip_id", table_name="user_trip_access")
    op.drop_index("idx_user_trip_access_user_id", table_name="user_trip_access")
    op.drop_table("user_trip_access")
    op.drop_index("idx_sessions_user_id", table_name="sessions")
    op.drop_table("sessions")
    op.drop_table("users")
