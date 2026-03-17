"""Add finance schema and finance_records table

Revision ID: add_finance_records
Revises: add_company_setup
Create Date: 2026-02-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "add_finance_records"
down_revision = "add_company_setup"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the finance schema
    op.execute("CREATE SCHEMA IF NOT EXISTS finance")

    # Create finance.finance_records table
    op.create_table(
        "finance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("asset_request_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("asset.asset_requests.id"), nullable=False, index=True),
        sa.Column("purchase_order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("procurement.purchase_orders.id"), nullable=True, index=True),
        sa.Column("finance_status", sa.String(50), nullable=False, server_default="FINANCE_REVIEW_PENDING"),
        sa.Column("finance_approver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("auth.users.id"), nullable=True),
        sa.Column("finance_approver_name", sa.String(255), nullable=True),
        sa.Column("finance_decision_reason", sa.Text, nullable=True),
        sa.Column("payment_reference", sa.String(255), nullable=True),
        sa.Column("payment_status", sa.String(50), nullable=True),
        sa.Column("payment_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        schema="finance",
    )


def downgrade() -> None:
    op.drop_table("finance_records", schema="finance")
    op.execute("DROP SCHEMA IF EXISTS finance CASCADE")
