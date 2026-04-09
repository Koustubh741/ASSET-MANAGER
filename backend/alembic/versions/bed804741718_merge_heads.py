"""merge_heads

Revision ID: bed804741718
Revises: 4b27366ffeaf, drop_legacy_dept_fields
Create Date: 2026-04-08 07:18:08.008421

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bed804741718'
down_revision = ('4b27366ffeaf', 'drop_legacy_dept_fields')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
