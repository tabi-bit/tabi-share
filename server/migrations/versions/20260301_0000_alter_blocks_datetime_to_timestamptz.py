"""alter blocks datetime to timestamptz

Revision ID: b1c2d3e4f5a6
Revises: a4e278391af4
Create Date: 2026-03-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a4e278391af4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """TIMESTAMP → TIMESTAMP WITH TIME ZONE に変更"""
    op.alter_column(
        "blocks",
        "start_time",
        type_=sa.DateTime(timezone=True),
        existing_type=sa.DateTime(timezone=False),
        existing_nullable=False,
        postgresql_using="start_time AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "blocks",
        "end_time",
        type_=sa.DateTime(timezone=True),
        existing_type=sa.DateTime(timezone=False),
        existing_nullable=True,
        postgresql_using="end_time AT TIME ZONE 'UTC'",
    )


def downgrade() -> None:
    """TIMESTAMP WITH TIME ZONE → TIMESTAMP に戻す"""
    op.alter_column(
        "blocks",
        "start_time",
        type_=sa.DateTime(timezone=False),
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=False,
        postgresql_using="start_time AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "blocks",
        "end_time",
        type_=sa.DateTime(timezone=False),
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        postgresql_using="end_time AT TIME ZONE 'UTC'",
    )
