"""Add port policy models for host/network/cloud port blocking

Revision ID: add_port_policies
Revises: add_byod_mdm
Create Date: 2026-02-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "add_port_policies"
down_revision = "add_byod_mdm"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure the security schema exists
    op.execute("CREATE SCHEMA IF NOT EXISTS security")

    # security.port_policies
    op.create_table(
        "port_policies",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("scope_type", sa.String(length=50), nullable=False),
        sa.Column("direction", sa.String(length=16), nullable=False),
        sa.Column(
            "protocol",
            sa.String(length=16),
            nullable=False,
            server_default=sa.text("'TCP'::character varying"),
        ),
        sa.Column("port", sa.Integer(), nullable=True),
        sa.Column("port_range_start", sa.Integer(), nullable=True),
        sa.Column("port_range_end", sa.Integer(), nullable=True),
        sa.Column(
            "action",
            sa.String(length=16),
            nullable=False,
            server_default=sa.text("'BLOCK'::character varying"),
        ),
        sa.Column(
            "priority",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("100"),
        ),
        sa.Column(
            "enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        schema="security",
    )

    op.create_index(
        "ix_security_port_policies_scope_direction_protocol",
        "port_policies",
        ["scope_type", "direction", "protocol"],
        unique=False,
        schema="security",
    )

    # security.policy_targets
    op.create_table(
        "policy_targets",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("target_type", sa.String(length=50), nullable=False),
        sa.Column("target_ref_id", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column(
            "metadata_",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        schema="security",
    )

    op.create_index(
        "ix_security_policy_targets_type_ref",
        "policy_targets",
        ["target_type", "target_ref_id"],
        unique=True,
        schema="security",
    )
    op.create_index(
        "ix_security_policy_targets_target_ref_id",
        "policy_targets",
        ["target_ref_id"],
        unique=False,
        schema="security",
    )

    # security.port_policy_assignments
    op.create_table(
        "port_policy_assignments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "policy_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("security.port_policies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("security.policy_targets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("scope", sa.String(length=32), nullable=True),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        schema="security",
    )

    op.create_index(
        "ix_security_port_policy_assignments_policy_target",
        "port_policy_assignments",
        ["policy_id", "target_id"],
        unique=True,
        schema="security",
    )

    # security.port_policy_enforcement
    op.create_table(
        "port_policy_enforcement",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "policy_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("security.port_policies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("security.policy_targets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("agent_id", sa.String(length=100), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'PENDING'::character varying"),
        ),
        sa.Column("last_reported_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("applied_config_hash", sa.String(length=128), nullable=True),
        sa.Column(
            "applied_rules",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        schema="security",
    )

    op.create_index(
        "ix_security_port_policy_enforcement_agent_status",
        "port_policy_enforcement",
        ["agent_id", "status"],
        unique=False,
        schema="security",
    )


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_index(
        "ix_security_port_policy_enforcement_agent_status",
        table_name="port_policy_enforcement",
        schema="security",
    )
    op.drop_table("port_policy_enforcement", schema="security")

    op.drop_index(
        "ix_security_port_policy_assignments_policy_target",
        table_name="port_policy_assignments",
        schema="security",
    )
    op.drop_table("port_policy_assignments", schema="security")

    op.drop_index(
        "ix_security_policy_targets_target_ref_id",
        table_name="policy_targets",
        schema="security",
    )
    op.drop_index(
        "ix_security_policy_targets_type_ref",
        table_name="policy_targets",
        schema="security",
    )
    op.drop_table("policy_targets", schema="security")

    op.drop_index(
        "ix_security_port_policies_scope_direction_protocol",
        table_name="port_policies",
        schema="security",
    )
    op.drop_table("port_policies", schema="security")

