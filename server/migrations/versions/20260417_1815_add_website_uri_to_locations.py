"""add_website_uri_to_locations

Revision ID: baa80efb492a
Revises: 60339fc50f4f
Create Date: 2026-04-17 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'baa80efb492a'
down_revision: Union[str, Sequence[str], None] = '60339fc50f4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'locations',
        sa.Column('website_uri', sa.String(length=2048), nullable=True, comment='公式サイトURL'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('locations', 'website_uri')
