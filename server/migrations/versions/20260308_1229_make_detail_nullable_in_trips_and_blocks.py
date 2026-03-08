"""make_detail_nullable_in_trips_and_blocks

Revision ID: b1c3d5e7f9a2
Revises: a4e278391af4
Create Date: 2026-03-08 12:29:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1c3d5e7f9a2"
down_revision: Union[str, Sequence[str], None] = "a4e278391af4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "trips",
        "detail",
        existing_type=sa.Text(),
        nullable=True,
        comment="Detailed description of the trip",
    )
    op.alter_column(
        "blocks",
        "detail",
        existing_type=sa.Text(),
        nullable=True,
        comment="Detailed description of the block",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE blocks SET detail = '' WHERE detail IS NULL")
    op.alter_column(
        "blocks",
        "detail",
        existing_type=sa.Text(),
        nullable=False,
        comment="Detailed description of the block",
    )
    op.execute("UPDATE trips SET detail = '' WHERE detail IS NULL")
    op.alter_column(
        "trips",
        "detail",
        existing_type=sa.Text(),
        nullable=False,
        comment="Detailed description of the trip",
    )
