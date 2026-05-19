"""add_dates_to_trips_and_pages

Revision ID: c3f1a7b2d9e4
Revises: baa80efb492a
Create Date: 2026-05-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3f1a7b2d9e4'
down_revision: Union[str, Sequence[str], None] = 'baa80efb492a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'trips',
        sa.Column('start_date', sa.Date(), nullable=True, comment='旅程開始日'),
    )
    op.add_column(
        'trips',
        sa.Column('end_date', sa.Date(), nullable=True, comment='旅程終了日'),
    )
    op.create_check_constraint(
        'ck_trips_start_date_le_end_date',
        'trips',
        'start_date IS NULL OR end_date IS NULL OR start_date <= end_date',
    )
    op.add_column(
        'pages',
        sa.Column('date', sa.Date(), nullable=True, comment='ページの単日程'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('pages', 'date')
    op.drop_constraint('ck_trips_start_date_le_end_date', 'trips', type_='check')
    op.drop_column('trips', 'end_date')
    op.drop_column('trips', 'start_date')
