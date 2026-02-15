"""Add agent configurations table

Revision ID: add_agent_configs
Revises: 
Create Date: 2024-02-09 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'add_agent_configs'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create agent_configurations table
    op.create_table(
        'agent_configurations',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('agent_id', sa.String(length=100), nullable=False),
        sa.Column('config_key', sa.String(length=100), nullable=False),
        sa.Column('config_value', sa.Text(), nullable=False),
        sa.Column('is_sensitive', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('agent_id', 'config_key', name='uq_agent_config')
    )
    
    # Create index on agent_id for faster lookups
    op.create_index(op.f('idx_agent_configurations_agent_id'), 'agent_configurations', ['agent_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('idx_agent_configurations_agent_id'), table_name='agent_configurations')
    op.drop_table('agent_configurations')
