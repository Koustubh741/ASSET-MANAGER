"""Add plan and AI query columns to users for subscription enforcement

Revision ID: add_user_plan_ai
Revises: add_port_policies
Create Date: 2026-02-17

"""
from alembic import op
import sqlalchemy as sa


revision = "add_user_plan_ai"
down_revision = "add_port_policies"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("plan", sa.String(50), nullable=False, server_default="STARTER"),
        schema="auth",
    )
    op.add_column(
        "users",
        sa.Column("ai_queries_this_month", sa.Integer(), nullable=False, server_default="0"),
        schema="auth",
    )
    op.add_column(
        "users",
        sa.Column("ai_queries_reset_at", sa.DateTime(timezone=True), nullable=True),
        schema="auth",
    )


def downgrade() -> None:
    op.drop_column("users", "ai_queries_reset_at", schema="auth")
    op.drop_column("users", "ai_queries_this_month", schema="auth")
    op.drop_column("users", "plan", schema="auth")
