"""drop legacy department string fields

Revision ID: drop_legacy_dept_fields
Revises: migrate_agent_tables_system
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'drop_legacy_dept_fields'
down_revision = 'migrate_agent_tables_system'
branch_labels = None
depends_on = None


def upgrade():
    # Drop legacy department string from auth.users
    op.drop_column('users', 'department', schema='auth')
    
    # Drop legacy department string from support.assignment_groups
    op.drop_column('assignment_groups', 'department', schema='support')


def downgrade():
    # Add back legacy department string to auth.users
    op.add_column('users', sa.Column('department', sa.String(length=100), nullable=True), schema='auth')
    
    # Add back legacy department string to support.assignment_groups
    op.add_column('assignment_groups', sa.Column('department', sa.String(length=100), nullable=True), schema='support')
