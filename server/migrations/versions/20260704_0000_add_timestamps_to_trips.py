"""add_timestamps_to_trips

Revision ID: d5b3e9c1f27a
Revises: c3f1a7b2d9e4
Create Date: 2026-07-04 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d5b3e9c1f27a"
down_revision: Union[str, Sequence[str], None] = "c3f1a7b2d9e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "trips",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
            comment="作成日時",
        ),
    )
    op.add_column(
        "trips",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
            comment="更新日時（trips 行自身のカラム変更時刻）",
        ),
    )
    op.add_column(
        "trips",
        sa.Column(
            "last_edited_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
            comment="最終編集日時（配下 Page/Block の変更も含む）",
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("trips", "last_edited_at")
    op.drop_column("trips", "updated_at")
    op.drop_column("trips", "created_at")
