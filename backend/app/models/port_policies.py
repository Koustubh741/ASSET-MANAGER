from sqlalchemy import (
    Column,
    String,
    DateTime,
    Boolean,
    ForeignKey,
    Integer,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func
import uuid

from app.database.database import Base


class PortPolicy(Base):
    """
    Logical port policy describing desired port state for a scope (host, network device, cloud resource).
    """

    __tablename__ = "port_policies"
    __table_args__ = {"schema": "security"}

    id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Human friendly metadata
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Scope for which this policy is defined
    # HOST | NETWORK_DEVICE | CLOUD_RESOURCE
    scope_type = Column(String(50), nullable=False)

    # INBOUND | OUTBOUND
    direction = Column(String(16), nullable=False)

    # TCP | UDP | ANY
    protocol = Column(String(16), nullable=False, default="TCP")

    # Either a single port or a range (inclusive)
    port = Column(Integer, nullable=True)
    port_range_start = Column(Integer, nullable=True)
    port_range_end = Column(Integer, nullable=True)

    # BLOCK | ALLOW
    action = Column(String(16), nullable=False, default="BLOCK")

    # Lower number = higher priority. Used when multiple policies overlap.
    priority = Column(Integer, nullable=False, default=100)

    enabled = Column(Boolean, nullable=False, default=True)

    # Audit metadata
    created_by = Column(PGUUID(as_uuid=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "ix_security_port_policies_scope_direction_protocol",
            "scope_type",
            "direction",
            "protocol",
        ),
        {"schema": "security"},
    )


class PolicyTarget(Base):
    """
    Abstract target for port policies.

    target_type controls the semantic meaning of target_ref_id, for example:
    - AGENT:      target_ref_id -> agents.agent_id (string UUID or name)
    - HOST_ASSET: target_ref_id -> asset.assets.id (UUID)
    - NETWORK_DEVICE: target_ref_id -> asset.assets.id (network gear) or external ID
    - CLOUD_RESOURCE_GROUP: provider-specific identifier (string)
    """

    __tablename__ = "policy_targets"
    __table_args__ = {"schema": "security"}

    id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    target_type = Column(String(50), nullable=False)
    # Stored as string to support different backing stores (UUIDs, cloud IDs, etc.)
    target_ref_id = Column(String(255), nullable=False, index=True)
    display_name = Column(String(255), nullable=True)

    metadata_ = Column(JSONB, nullable=True, default={})

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index(
            "ix_security_policy_targets_type_ref",
            "target_type",
            "target_ref_id",
            unique=True,
        ),
        {"schema": "security"},
    )


class PortPolicyAssignment(Base):
    """
    Join table connecting policies to abstract targets.
    """

    __tablename__ = "port_policy_assignments"
    __table_args__ = {"schema": "security"}

    id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    policy_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("security.port_policies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("security.policy_targets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # GLOBAL | GROUP | INDIVIDUAL or other business scopes
    scope = Column(String(32), nullable=True)

    effective_from = Column(DateTime(timezone=True), nullable=True)
    effective_to = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index(
            "ix_security_port_policy_assignments_policy_target",
            "policy_id",
            "target_id",
            unique=True,
        ),
        {"schema": "security"},
    )


class PortPolicyEnforcementState(Base):
    """
    Per-agent, per-target, per-policy enforcement tracking.
    """

    __tablename__ = "port_policy_enforcement"
    __table_args__ = {"schema": "security"}

    id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    policy_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("security.port_policies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("security.policy_targets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # String identifier for the enforcing agent (e.g., agent-local, agent-snmp, cloud-account-123)
    agent_id = Column(String(100), nullable=False, index=True)

    # PENDING | APPLIED | FAILED | ROLLED_BACK
    status = Column(String(32), nullable=False, default="PENDING")

    last_reported_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)

    # Optional hash of desired config and the actual rules applied for drift detection
    applied_config_hash = Column(String(128), nullable=True)
    applied_rules = Column(JSONB, nullable=True)

    __table_args__ = (
        Index(
            "ix_security_port_policy_enforcement_agent_status",
            "agent_id",
            "status",
        ),
        {"schema": "security"},
    )

