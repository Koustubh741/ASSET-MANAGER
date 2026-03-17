"""add_patch_root_enhancements

Revision ID: add_patch_root_enhancements
Revises: add_patch_management_tables
Create Date: 2026-03-05 12:45:00.000000

Adds:
- cve_ids, cvss_score, kb_article_url, vendor_advisory to system_patches
- is_pilot to assets
- patch_compliance_snapshots table (daily compliance history)
- patch_schedules table (maintenance windows)
- agent_commands table in system schema (deploy command queue)
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_patch_root_enhancements'
down_revision = 'add_patch_management_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── system_patches new columns ────────────────────────────────────────────
    op.execute("""
        ALTER TABLE asset.system_patches
            ADD COLUMN IF NOT EXISTS cve_ids        JSONB,
            ADD COLUMN IF NOT EXISTS cvss_score     FLOAT,
            ADD COLUMN IF NOT EXISTS kb_article_url VARCHAR(500),
            ADD COLUMN IF NOT EXISTS vendor_advisory VARCHAR(500);
    """)

    # ── assets: pilot flag ────────────────────────────────────────────────────
    op.execute("""
        ALTER TABLE asset.assets
            ADD COLUMN IF NOT EXISTS is_pilot BOOLEAN NOT NULL DEFAULT FALSE;
    """)

    # ── agent_commands (system schema) ────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS system.agent_commands (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            asset_id      UUID NOT NULL REFERENCES asset.assets(id) ON DELETE CASCADE,
            command       VARCHAR(50) NOT NULL,
            payload       JSONB,
            status        VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            executed_at   TIMESTAMPTZ,
            error_message TEXT
        );
        CREATE INDEX IF NOT EXISTS ix_system_agent_commands_asset_id ON system.agent_commands(asset_id);
        CREATE INDEX IF NOT EXISTS ix_system_agent_commands_status   ON system.agent_commands(status);
        CREATE INDEX IF NOT EXISTS ix_system_agent_commands_command  ON system.agent_commands(command);
    """)

    # ── patch_compliance_snapshots ─────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS asset.patch_compliance_snapshots (
            id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            snapshot_date     TIMESTAMP NOT NULL,
            asset_id          UUID NOT NULL REFERENCES asset.assets(id) ON DELETE CASCADE,
            compliance_score  FLOAT NOT NULL,
            installed_patches INT NOT NULL DEFAULT 0,
            missing_patches   INT NOT NULL DEFAULT 0,
            critical_missing  INT NOT NULL DEFAULT 0,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS ix_asset_patch_snapshots_asset_id       ON asset.patch_compliance_snapshots(asset_id);
        CREATE INDEX IF NOT EXISTS ix_asset_patch_snapshots_snapshot_date  ON asset.patch_compliance_snapshots(snapshot_date);
    """)

    # ── patch_schedules ────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS asset.patch_schedules (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patch_id      UUID NOT NULL REFERENCES asset.system_patches(id) ON DELETE CASCADE,
            target_group  VARCHAR(50) NOT NULL DEFAULT 'ALL',
            scheduled_at  TIMESTAMPTZ NOT NULL,
            created_by    UUID NOT NULL REFERENCES auth.users(id),
            status        VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            executed_at   TIMESTAMPTZ,
            error_message TEXT
        );
        CREATE INDEX IF NOT EXISTS ix_asset_patch_schedules_patch_id     ON asset.patch_schedules(patch_id);
        CREATE INDEX IF NOT EXISTS ix_asset_patch_schedules_status        ON asset.patch_schedules(status);
        CREATE INDEX IF NOT EXISTS ix_asset_patch_schedules_scheduled_at  ON asset.patch_schedules(scheduled_at);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS asset.patch_schedules;")
    op.execute("DROP TABLE IF EXISTS asset.patch_compliance_snapshots;")
    op.execute("DROP TABLE IF EXISTS system.agent_commands;")
    op.execute("""
        ALTER TABLE asset.assets DROP COLUMN IF EXISTS is_pilot;
        ALTER TABLE asset.system_patches
            DROP COLUMN IF EXISTS cve_ids,
            DROP COLUMN IF EXISTS cvss_score,
            DROP COLUMN IF EXISTS kb_article_url,
            DROP COLUMN IF EXISTS vendor_advisory;
    """)
