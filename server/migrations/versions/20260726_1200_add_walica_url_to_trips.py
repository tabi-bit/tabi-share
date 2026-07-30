"""add_walica_url_to_trips

Revision ID: f7a1c2d3b4e5
Revises: e6a2f9b18c34
Create Date: 2026-07-26 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f7a1c2d3b4e5"
down_revision: Union[str, Sequence[str], None] = "e6a2f9b18c34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "trips",
        sa.Column(
            "walica_url",
            sa.String(length=2048),
            nullable=True,
            comment="Walica URL for bill splitting",
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("trips", "walica_url")
