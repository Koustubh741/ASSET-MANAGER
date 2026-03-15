from sqlalchemy import Column, String, Date, Float, DateTime, JSON, Text, ForeignKey, Boolean, Index, UUID, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database.database import Base

class WorkflowRule(Base):
    """
    Dynamic routing and action rules for tickets and requests.
    Example: if category='Hardware' assign to 'IT Support Manager'
    """
    __tablename__ = "workflow_rules"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Conditions (JSON format for flexibility)
    # e.g., {"category": "Hardware", "priority": "High"}
    conditions = Column(JSON, nullable=False, default=dict)
    
    # Actions
    # e.g., {"assign_to_role": "IT_MANAGEMENT", "set_priority": "High"}
    actions = Column(JSON, nullable=False, default=dict)
    
    priority_order = Column(Integer, default=0) # Order in which rules are evaluated
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SLAPolicy(Base):
    """
    SLA targets based on priority and category.
    """
    __tablename__ = "sla_policies"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    
    # Match criteria
    priority = Column(String(20), nullable=True) # Low, Medium, High, Critical
    category = Column(String(50), nullable=True)
    
    # Targets in minutes
    response_time_limit = Column(Integer, nullable=True) # Time to first response/acknowledgement
    resolution_time_limit = Column(Integer, nullable=False) # Time to resolve/close
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TicketSLA(Base):
    """
    Real-time SLA tracking for tickets.
    """
    __tablename__ = "ticket_slas"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support.tickets.id", ondelete="CASCADE"), nullable=False, unique=True)
    sla_policy_id = Column(UUID(as_uuid=True), ForeignKey("support.sla_policies.id"), nullable=False)
    
    # Deadlines calculated based on policy at creation
    response_deadline = Column(DateTime(timezone=True), nullable=True)
    resolution_deadline = Column(DateTime(timezone=True), nullable=False)
    
    # Status tracking
    # IN_PROGRESS | BREACHED | MET | EXEMPT
    response_status = Column(String(50), default="IN_PROGRESS")
    resolution_status = Column(String(50), default="IN_PROGRESS")
    
    responded_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    ticket = relationship("Ticket", backref="sla")
    policy = relationship("SLAPolicy")

class ChangeApproval(Base):
    """
    Multi-stage approval workflows for change requests or high-value assets.
    """
    __tablename__ = "change_approvals"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    entity_type = Column(String(50), nullable=False) # TICKET | ASSET_REQUEST
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Stages of approval
    # e.g., [{"role": "MANAGER", "status": "PENDING"}, {"role": "FINANCE", "status": "WAITING"}]
    stages = Column(JSON, nullable=False, default=list)
    
    current_stage_index = Column(Integer, default=0)
    status = Column(String(50), default="PENDING") # PENDING | APPROVED | REJECTED
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
