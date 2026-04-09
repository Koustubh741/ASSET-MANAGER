"""migrate agent tables to system schema

Root Fix Phase 3: Moves agent_configurations and agent_schedules from the
'public' schema (accidental default) to the 'system' schema, consistent
with all other system-level tables (audit_logs, api_tokens, notifications, etc.)

Revision ID: migrate_agent_tables_system
Revises: add_agent_schedules
Create Date: 2026-04-07

NOTE: Run this with the backend STOPPED to avoid session conflicts.
  cd backend
  alembic upgrade migrate_agent_tables_system
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'migrate_agent_tables_system'
down_revision = 'add_agent_schedules'
branch_labels = None
depends_on = None


def upgrade():
    # Ensure the system schema exists (it should already, but be safe)
    op.execute("CREATE SCHEMA IF NOT EXISTS system;")

    # Move agent_configurations from public to system schema
    op.execute("ALTER TABLE IF EXISTS public.agent_configurations SET SCHEMA system;")

    # Move agent_schedules from public to system schema
    op.execute("ALTER TABLE IF EXISTS public.agent_schedules SET SCHEMA system;")

    # Grant usage on system schema (same as other tables)
    # Adjust role name if your PostgreSQL user is different
    op.execute("GRANT USAGE ON SCHEMA system TO PUBLIC;")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA system TO PUBLIC;")


def downgrade():
    # Revert: move back to public schema
    op.execute("ALTER TABLE IF EXISTS system.agent_configurations SET SCHEMA public;")
    op.execute("ALTER TABLE IF EXISTS system.agent_schedules SET SCHEMA public;")
