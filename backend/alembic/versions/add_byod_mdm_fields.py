"""Add BYOD MDM and compliance fields

Revision ID: add_byod_mdm
Revises: add_agent_configs
Create Date: 2025-02-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'add_byod_mdm'
down_revision = '8ba0b01e1d59'
branch_labels = None
depends_on = None


def _column_exists(conn, table, column, schema="asset"):
    from sqlalchemy import inspect
    insp = inspect(conn)
    cols = [c["name"] for c in insp.get_columns(table, schema=schema)]
    return column in cols


def upgrade() -> None:
    conn = op.get_bind()
    cols_to_add = [
        ("mdm_enrolled", sa.Column("mdm_enrolled", sa.Boolean(), nullable=True, server_default="false")),
        ("mdm_enrollment_date", sa.Column("mdm_enrollment_date", sa.DateTime(timezone=True), nullable=True)),
        ("mdm_provider", sa.Column("mdm_provider", sa.String(50), nullable=True)),
        ("mdm_device_id", sa.Column("mdm_device_id", sa.String(255), nullable=True)),
        ("last_compliance_check", sa.Column("last_compliance_check", sa.DateTime(timezone=True), nullable=True)),
        ("compliance_checks", sa.Column("compliance_checks", JSONB, nullable=True)),
        ("security_policies", sa.Column("security_policies", JSONB, nullable=True)),
        ("remediation_notes", sa.Column("remediation_notes", sa.Text(), nullable=True)),
    ]
    for col_name, col_def in cols_to_add:
        if not _column_exists(conn, "byod_devices", col_name):
            op.add_column("byod_devices", col_def, schema="asset")


def downgrade() -> None:
    conn = op.get_bind()
    for col in ["remediation_notes", "security_policies", "compliance_checks",
                "last_compliance_check", "mdm_device_id", "mdm_provider",
                "mdm_enrollment_date", "mdm_enrolled"]:
        if _column_exists(conn, "byod_devices", col):
            op.drop_column("byod_devices", col, schema="asset")
