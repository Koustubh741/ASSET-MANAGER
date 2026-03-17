"""add_patch_management_tables

Revision ID: add_patch_management_tables
Revises: d934940bcffb
Create Date: 2026-03-05 11:34:00.000000

Uses CREATE TABLE IF NOT EXISTS so it is safe to run even if
create_patch_tables.py already created these tables.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_patch_management_tables'
down_revision = 'd934940bcffb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use raw SQL with IF NOT EXISTS — this is safe when tables were created
    # manually via create_patch_tables.py before Alembic tracked them.
    op.execute("""
        CREATE TABLE IF NOT EXISTS asset.system_patches (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patch_id    VARCHAR(100) UNIQUE NOT NULL,
            title       VARCHAR(500) NOT NULL,
            description TEXT,
            severity    VARCHAR(50) NOT NULL DEFAULT 'Moderate',
            patch_type  VARCHAR(50) NOT NULL DEFAULT 'Security',
            platform    VARCHAR(50) NOT NULL,
            release_date TIMESTAMP,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS asset.patch_deployments (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patch_id      UUID NOT NULL REFERENCES asset.system_patches(id),
            asset_id      UUID NOT NULL REFERENCES asset.assets(id),
            status        VARCHAR(50) NOT NULL DEFAULT 'MISSING',
            installed_at  TIMESTAMP,
            error_message TEXT,
            last_check_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Indexes (IF NOT EXISTS available in PG 9.5+)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_asset_system_patches_patch_id
        ON asset.system_patches(patch_id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_asset_patch_deployments_asset_id
        ON asset.patch_deployments(asset_id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_asset_patch_deployments_patch_id
        ON asset.patch_deployments(patch_id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_asset_patch_deployments_status
        ON asset.patch_deployments(status);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS asset.patch_deployments;")
    op.execute("DROP TABLE IF EXISTS asset.system_patches;")
