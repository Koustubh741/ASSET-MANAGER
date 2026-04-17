from sqlalchemy import Column, String, Date, Float, DateTime, JSON, Text, ForeignKey, Boolean, Index, UUID, Integer, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
import uuid
import enum
from datetime import datetime
from ..database.database import Base
from ..utils.uuid_gen import get_uuid

class Asset(Base):
    """
    Asset model matching the AssetBase schema
    """
    __tablename__ = "assets"
    __table_args__ = {"schema": "asset"}

    # Primary key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=get_uuid,
        index=True
    )
    
    company_id = Column(UUID(as_uuid=True), ForeignKey("public.companies.id", ondelete="CASCADE"), nullable=True, index=True)
    company = relationship("Company", foreign_keys=[company_id], lazy='selectin')

    # Basic Asset Information
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(100), nullable=False)
    model = Column(String(255), nullable=False, default="Unknown Model")
    vendor = Column(String(255), nullable=False, default="Unknown Vendor")
    serial_number = Column(String(255), nullable=True, unique=True, index=True)
    segment = Column(String(50), nullable=False, default="IT")
    department_id = Column(UUID(as_uuid=True), ForeignKey("auth.departments.id", ondelete="SET NULL"), nullable=True, index=True)
    dept_obj = relationship("Department", foreign_keys=[department_id], lazy='selectin')

    # Dates
    purchase_date = Column(Date, nullable=True)
    warranty_expiry = Column(Date, nullable=True, index=True)
    contract_expiry = Column(Date, nullable=True, index=True)
    license_expiry = Column(Date, nullable=True, index=True)
    assignment_date = Column(Date, nullable=True)

    # Status and Location
    status = Column(String(50), nullable=False, index=True)
    location = Column(String(255), nullable=True) # Flat field
    location_id = Column(UUID(as_uuid=True), ForeignKey("asset.locations.id", ondelete="SET NULL"), nullable=True)
    location_text = Column(String(255), nullable=True) # Fallback / Legacy

    # Assignment
    assigned_to = Column(String(255), nullable=True) # Flat field
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    assigned_to_name = Column(String(255), nullable=True) # Denormalized for display
    assigned_by = Column(String(255), nullable=True)

    assigned_user = relationship("User", foreign_keys=[assigned_to_id], lazy='selectin')

    # Specifications
    specifications = Column(JSONB, nullable=True, default={})

    # Financial
    cost = Column(Float, nullable=True, default=0.0)

    # Renewal Workflow Fields
    renewal_status = Column(String(50), nullable=True)
    renewal_cost = Column(Float, nullable=True)
    renewal_reason = Column(Text, nullable=True)
    renewal_urgency = Column(String(20), nullable=True)

    # Procurement & Disposal Fields
    procurement_status = Column(String(50), nullable=True)
    disposal_status = Column(String(50), nullable=True)



    # QC and Configuration (Sync with DB)
    qc_status = Column(String(50), nullable=True)
    qc_date = Column(DateTime, nullable=True)
    qc_by = Column(UUID(as_uuid=True), nullable=True)
    qc_notes = Column(Text, nullable=True)
    
    configuration_status = Column(String(50), nullable=True)
    configuration_date = Column(DateTime, nullable=True)
    configured_by = Column(UUID(as_uuid=True), nullable=True)
    
    # Acceptance
    acceptance_status = Column(String(50), nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    accepted_by = Column(UUID(as_uuid=True), nullable=True)
    acceptance_rejection_reason = Column(Text, nullable=True)
    
    request_id = Column(UUID(as_uuid=True), nullable=True)

    # Enterprise Patching (Phase 1 Root Fix)
    is_pilot = Column(Boolean, nullable=False, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # GIN Index for JSONB specifications
    __table_args__ = (
        Index('ix_asset_specifications_gin', specifications, postgresql_using='gin'),
        {"schema": "asset"}
    )

    def __repr__(self):
        return f"<Asset(id={self.id}, name={self.name}, status={self.status})>"


class AssetAssignment(Base):
    """
    Asset assignment history
    """
    __tablename__ = "asset_assignments"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by = Column(String, nullable=True)
    location = Column(String(255), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", foreign_keys=[user_id], lazy='selectin')

class AssetInventory(Base):
    """
    Asset Inventory tracking (items in stock)
    """
    __tablename__ = "asset_inventory"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id", ondelete="CASCADE"), nullable=False, unique=True, index=True) # One entry per asset while in stock
    location = Column(String(255), nullable=True)
    status = Column(String(50), default="Available") # Available, Reserved, Inspection
    availability_flag = Column(Boolean, default=True) # True if available for allocation
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    stocked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Department(Base):
    """
    Standardized department model for organizational structure
    """
    __tablename__ = "departments"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    slug = Column(String(50), nullable=False, unique=True, index=True) # eng, hr, fin, etc.
    
    # Hierarchy and Multi-Tenant
    company_id = Column(UUID(as_uuid=True), ForeignKey("public.companies.id", ondelete="CASCADE"), nullable=True, index=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("auth.departments.id", ondelete="SET NULL"), nullable=True, index=True)
    company = relationship("Company", backref="departments", lazy='selectin')
    parent = relationship("Department", remote_side=[id], backref="sub_departments", lazy='selectin')
    name = Column(String(100), nullable=False, unique=True, index=True) # Full Name
    description = Column(Text, nullable=True)
    
    # Manager of the department
    manager_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    
    # Metadata for frontend (icon, color theme, specific dashboard layout)
    dept_metadata = Column(JSONB, nullable=True, default={})

    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    users = relationship("User", back_populates="dept_obj", foreign_keys="User.department_id", lazy='selectin')

    def __repr__(self):
        return f"<Department(slug={self.slug}, name={self.name})>"

class User(Base):

    """
    User model for authentication and role management
    """
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="END_USER")
    status = Column(String(50), nullable=False, default="PENDING", index=True)  # PENDING | ACTIVE | EXITING | DISABLED
    position = Column(String(50), nullable=True)  # MANAGER | TEAM_MEMBER
    domain = Column(String(50), nullable=True)  # DATA_AI | CLOUD | SECURITY | DEVELOPMENT
    department_id = Column(UUID(as_uuid=True), ForeignKey("auth.departments.id", ondelete="SET NULL"), nullable=True)
    location = Column(String(100), nullable=True)

    phone = Column(String(20), nullable=True)
    company = Column(String(255), nullable=True) # Legacy string field
    company_id = Column(UUID(as_uuid=True), ForeignKey("public.companies.id", ondelete="CASCADE"), nullable=True, index=True)
    company_obj = relationship("Company", foreign_keys=[company_id], lazy='selectin')
    manager_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    persona = Column(String(100), nullable=True) # Functional Persona (e.g. IT_GOVERNANCE)
    protocol_id = Column(String(100), nullable=True, unique=True) # Staff Unique ID (Retail Pulse)

    # Retail Structural Data (v2retail Build)
    loc_type = Column(String(50), nullable=True) # STORE | WAREHOUSE | HQ
    sub_dept = Column(String(50), nullable=True) # L_BACK | L_FRONT | R_FLOOR
    designation = Column(String(50), nullable=True) # WH_MGR | STORE_ASSOC | RETAIL_DIR

    # Subscription / Plan (AI Assistant access)
    plan = Column(String(50), nullable=False, default="STARTER")  # STARTER | PROFESSIONAL | BUSINESS | ENTERPRISE
    ai_queries_this_month = Column(Integer, nullable=False, default=0)
    ai_queries_reset_at = Column(DateTime(timezone=True), nullable=True)
    
    # SSO Integration
    sso_provider = Column(String(50), nullable=True) # google, azure, okta
    sso_id = Column(String(255), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    dept_obj = relationship("Department", back_populates="users", foreign_keys=[department_id], lazy="selectin")
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role}, status={self.status})>"

# ROOT FIX: Synchronization Listeners for Legacy Data Consistency
from sqlalchemy import event


# Removed legacy sync_user_department_label listener in Phase 5.3

class Ticket(Base):
    """
    Ticket model for Help Desk/Incidents
    """
    __tablename__ = "tickets"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    
    # Hierarchy and Multi-Tenant
    company_id = Column(UUID(as_uuid=True), ForeignKey("public.companies.id", ondelete="CASCADE"), nullable=True, index=True)
    company = relationship("Company", foreign_keys=[company_id], lazy='selectin')
    display_id = Column(String(20), unique=True, index=True, nullable=True) # e.g., TCK-1001
    
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    status = Column(String(50), default="Open", index=True) # Open, Pending, Closed
    priority = Column(String(20), default="Medium") # Low, Medium, High
    category = Column(String(50), nullable=True) # Hardware, Software, Network
    subcategory = Column(String(100), nullable=True) # e.g., Payroll, Laptop Repair
    
    # Relations
    requestor_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True) 
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    assignment_group_id = Column(UUID(as_uuid=True), ForeignKey("support.assignment_groups.id", ondelete="SET NULL"), nullable=True)
    target_department_id = Column(UUID(as_uuid=True), ForeignKey("auth.departments.id", ondelete="SET NULL"), nullable=True)
    related_asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id", ondelete="SET NULL"), nullable=True)

    requestor = relationship("User", foreign_keys=[requestor_id], lazy='selectin')
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], lazy='selectin')
    assignment_group = relationship("AssignmentGroup", foreign_keys=[assignment_group_id], lazy='selectin')
    target_department = relationship("Department", foreign_keys=[target_department_id], lazy='selectin')
    tasks = relationship("Task", back_populates="ticket", cascade="all, delete-orphan", lazy='selectin')
    sla = relationship("TicketSLA", back_populates="ticket", uselist=False, cascade="all, delete-orphan", lazy='selectin')
    
    # Resolution Details
    resolution_notes = Column(Text, nullable=True)
    resolution_checklist = Column(JSON, nullable=True)
    resolution_percentage = Column(Float, default=0.0)
    timeline = Column(JSON, nullable=True, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Ticket(id={self.id}, subject={self.subject}, status={self.status})>"

class TicketComment(Base):
    """
    User and Agent comments on a ticket
    """
    __tablename__ = "ticket_comments"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support.tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket = relationship("Ticket", lazy='selectin')
    author = relationship("User", lazy='selectin')

class TicketAttachment(Base):
    """
    Files attached to a ticket
    """
    __tablename__ = "ticket_attachments"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support.tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=True)
    file_size = Column(Integer, nullable=True) # in bytes
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ticket = relationship("Ticket", lazy='selectin')
    uploader = relationship("User", lazy='selectin')

class AssignmentGroup(Base):
    """
    Groups/Teams for ticket routing and task allocation
    """
    __tablename__ = "assignment_groups"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("auth.departments.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, nullable=True)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    
    manager = relationship("User", foreign_keys=[manager_id], lazy='selectin')
    dept_obj = relationship("Department", foreign_keys=[department_id], lazy='selectin')
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<AssignmentGroup(name={self.name}, department_id={self.department_id})>"

class AssignmentGroupMember(Base):
    """
    Association table for Users and AssignmentGroups
    """
    __tablename__ = "assignment_group_members"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("support.assignment_groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False)
    
    group = relationship("AssignmentGroup", lazy='selectin')
    user = relationship("User", lazy='selectin')

    __table_args__ = (
        Index('ix_group_member_unique', group_id, user_id, unique=True),
        {"schema": "support"}
    )

class Task(Base):
    """
    Sub-tasks within a ticket for detailed task allocation
    """
    __tablename__ = "tasks"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support.tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Assignment
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("support.assignment_groups.id", ondelete="SET NULL"), nullable=True)
    
    # Status and Priority
    status = Column(String(50), default="Open", index=True) # Open, In Progress, Completed, Cancelled
    priority = Column(String(20), default="Medium")
    
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], lazy='selectin')
    group = relationship("AssignmentGroup", foreign_keys=[group_id], lazy='selectin')
    ticket = relationship("Ticket", back_populates="tasks", lazy='selectin')

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Task(id={self.id}, subject={self.subject}, status={self.status})>"

class CategoryConfig(Base):
    """
    Dynamic configuration for ticket categories (Styling & Iconography)
    """
    __tablename__ = "category_configs"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True) # e.g. "Software"
    icon_name = Column(String(50), nullable=False, default="HelpCircle") # Lucide icon name
    color = Column(String(50), nullable=False, default="#64748b") # Hex color
    bg_color = Column(String(100), nullable=True) # Tailwind overlay class (e.g. bg-slate-500/20)
    border_color = Column(String(100), nullable=True) # group-hover:border-slate-500/30
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<CategoryConfig(name={self.name}, icon={self.icon_name})>"

class AssetRequest(Base):
    """
    Asset Request model for managing asset requests and approvals
    """
    __tablename__ = "asset_requests"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    
    # Hierarchy and Multi-Tenant
    company_id = Column(UUID(as_uuid=True), ForeignKey("public.companies.id", ondelete="CASCADE"), nullable=True, index=True)
    company = relationship("Company", foreign_keys=[company_id], lazy='selectin')
    
    # Requester information
    requester_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False, index=True)

    requester = relationship("User", foreign_keys=[requester_id], lazy="selectin")
    
    # Root Fix: Relationships for batch-loading to eliminate N+1 query explosion
    purchase_orders = relationship("PurchaseOrder", backref="asset_request", cascade="all, delete-orphan", order_by="desc(PurchaseOrder.created_at)", lazy="selectin")
    
    # Asset details (can be linked to existing asset or new asset request)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id", ondelete="SET NULL"), nullable=True)  # If requesting existing asset
    asset_name = Column(String(255), nullable=False)
    asset_type = Column(String(100), nullable=False)  # Laptop, Server, etc. (asset category)
    asset_ownership_type = Column(String(50), nullable=True)  # COMPANY_OWNED | BYOD
    asset_model = Column(String(255), nullable=True)
    asset_vendor = Column(String(255), nullable=True)
    serial_number = Column(String(255), nullable=True)
    os_version = Column(String(100), nullable=True)
    cost_estimate = Column(Float, nullable=True)
    justification = Column(Text, nullable=True)
    business_justification = Column(Text, nullable=True)  # Required for new requests
    reason = Column(Text, nullable=True) # Matches DB column
    priority = Column(String(20), default="Medium")
    specifications = Column(JSONB, nullable=True, default={})
    
    # Status tracking - Unified state machine
    # Valid states: SUBMITTED | MANAGER_APPROVED | MANAGER_REJECTED | IT_APPROVED | IT_REJECTED | 
    # PROCUREMENT_REQUESTED | PROCUREMENT_APPROVED | PROCUREMENT_REJECTED | QC_PENDING | QC_FAILED |
    # BYOD_COMPLIANCE_CHECK | BYOD_REJECTED | USER_ACCEPTANCE_PENDING | USER_REJECTED | IN_USE | CLOSED
    status = Column(String(50), nullable=False, default="SUBMITTED", index=True)
    current_owner_role = Column(String(50), nullable=True, index=True)
    procurement_stage = Column(String(50), nullable=True, index=True)
    
    # Manager approvals (JSON array of approval decisions)
    manager_approvals = Column(JSON, nullable=True, default=list)

    # IT review tracking (for audit trail - status field is source of truth)
    it_reviewed_by = Column(UUID(as_uuid=True), nullable=True)
    it_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Procurement/Finance segment approval tracking (separate roles: PROCUREMENT, FINANCE)
    procurement_finance_status = Column(String(50), nullable=True)  # PO_VALIDATED | APPROVED | REJECTED | DELIVERED
    procurement_finance_reviewed_by = Column(UUID(as_uuid=True), nullable=True)
    procurement_finance_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    procurement_finance_rejection_reason = Column(Text, nullable=True)
    
    # Quality Check (QC) fields
    qc_status = Column(String(50), nullable=True)  # PENDING | PASSED | FAILED
    qc_performed_by = Column(UUID(as_uuid=True), nullable=True)
    qc_performed_at = Column(DateTime(timezone=True), nullable=True)
    qc_notes = Column(Text, nullable=True)
    
    # User acceptance tracking
    user_acceptance_status = Column(String(50), nullable=True)  # PENDING | ACCEPTED | REJECTED
    user_accepted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.now, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.now, onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<AssetRequest(id={self.id}, requester_id={self.requester_id}, status={self.status})>"


class ByodDevice(Base):
    """
    BYOD device registry - tracks approved personal devices
    """
    __tablename__ = "byod_devices"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    request_id = Column(UUID(as_uuid=True), ForeignKey("asset.asset_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False, index=True)

    device_model = Column(String(255), nullable=False)
    os_version = Column(String(100), nullable=False)
    serial_number = Column(String(255), nullable=False, index=True)

    compliance_status = Column(String(50), nullable=False, default="COMPLIANT")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # MDM & compliance fields (Phase 1 - nullable for backward compat)
    mdm_enrolled = Column(Boolean, nullable=True, default=False)
    mdm_enrollment_date = Column(DateTime(timezone=True), nullable=True)
    mdm_provider = Column(String(50), nullable=True)  # INTUNE | JAMF | SIMULATED
    mdm_device_id = Column(String(255), nullable=True)
    last_compliance_check = Column(DateTime(timezone=True), nullable=True)
    compliance_checks = Column(JSONB, nullable=True)  # Detailed check results
    security_policies = Column(JSONB, nullable=True)  # Policies applied
    remediation_notes = Column(Text, nullable=True)


class PurchaseRequest(Base):
    """
    Purchase request for company-owned assets
    """
    __tablename__ = "purchase_requests"
    __table_args__ = {"schema": "procurement"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_request_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    asset_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    requester_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    asset_name = Column(String(255), nullable=False)
    asset_type = Column(String(100), nullable=False)
    asset_model = Column(String(255), nullable=True)
    asset_vendor = Column(String(255), nullable=True)
    cost_estimate = Column(Float, nullable=True)

    status = Column(String(50), nullable=False, default="Requested")  # Requested | Approved | Ordered | Received
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class PurchaseOrder(Base):
    """
    Purchase Order for procured assets extracted from PDF
    """
    __tablename__ = "purchase_orders"
    __table_args__ = {"schema": "procurement"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_request_id = Column(UUID(as_uuid=True), ForeignKey("asset.asset_requests.id"), nullable=False, index=True)
    uploaded_by = Column(UUID(as_uuid=True), nullable=False)
    po_pdf_path = Column(String(500), nullable=False)
    vendor_name = Column(String(255), nullable=True)
    product_details = Column(JSONB, nullable=True)
    quantity = Column(Float, nullable=True)
    unit_price = Column(Float, nullable=True)
    total_cost = Column(Float, nullable=True)
    capex_opex = Column(String(10), nullable=True)
    tax_amount = Column(Float, nullable=True, default=0.0)
    shipping_handling = Column(Float, nullable=True, default=0.0)
    expected_delivery_date = Column(DateTime, nullable=True)
    extracted_data = Column(JSONB, nullable=True)
    status = Column(String(50), default="UPLOADED") # UPLOADED / VALIDATED / REJECTED
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)


class PurchaseInvoice(Base):
    """
    Purchase Invoice after confirming purchase
    """
    __tablename__ = "purchase_invoices"
    __table_args__ = {"schema": "procurement"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("procurement.purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Root Fix: Direct relationship for optimized fetching
    purchase_order = relationship("PurchaseOrder", backref="invoice", uselist=False, lazy="selectin")
    invoice_pdf_path = Column(String(500), nullable=False)
    purchase_date = Column(DateTime, nullable=True)
    total_amount = Column(Float, nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FinanceRecord(Base):
    """
    High-level finance record linked to an asset request / purchase order.
    This models the Finance segment separately from the core AssetRequest and PurchaseOrder.
    """
    __tablename__ = "finance_records"
    __table_args__ = {"schema": "finance"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_request_id = Column(UUID(as_uuid=True), ForeignKey("asset.asset_requests.id"), nullable=False, index=True)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("procurement.purchase_orders.id"), nullable=True, index=True)

    # Finance workflow state
    finance_status = Column(String(50), nullable=False, default="FINANCE_REVIEW_PENDING")
    finance_approver_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=True)
    finance_approver_name = Column(String(255), nullable=True)
    finance_decision_reason = Column(Text, nullable=True)

    # Optional payment details (for future extension)
    payment_reference = Column(String(255), nullable=True)
    payment_status = Column(String(50), nullable=True)  # e.g. PAYMENT_SCHEDULED, PAID
    payment_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ExitRequest(Base):
    """
    User exit / resignation workflow
    """
    __tablename__ = "exit_requests"
    __table_args__ = {"schema": "exit"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="OPEN")  # OPEN | ASSETS_PROCESSED | BYOD_PROCESSED | COMPLETED

    assets_snapshot = Column(JSON, nullable=True)
    byod_snapshot = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Location(Base):
    """
    Hierarchical location model for sites, buildings, and floors
    """
    __tablename__ = "locations"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("asset.locations.id"), nullable=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=True)
    timezone = Column(String(100), default="UTC")
    metadata_ = Column(JSONB, nullable=True, default={})
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SoftwareLicense(Base):
    """
    Enterprise software license tracking
    """
    __tablename__ = "software_licenses"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    name = Column(String(255), nullable=False)
    vendor = Column(String(255), nullable=False)
    license_key = Column(String(500), nullable=True)
    seat_count = Column(Float, default=1.0) # Float for partial seats or consumption based
    purchase_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True, index=True)
    cost = Column(Float, default=0.0)
    status = Column(String(50), default="Active") # Active, Expired, Retired
    is_discovered = Column(Boolean, default=False)
    matched_names = Column(JSONB, nullable=True, default=[]) # Array of names matched to this license
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class MaintenanceRecord(Base):
    """
    Hardware maintenance and repair logs
    """
    __tablename__ = "maintenance_records"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id", ondelete="CASCADE"), nullable=False, index=True)
    maintenance_type = Column(String(100), nullable=False) # Repair, Preventive, Upgrade
    description = Column(Text, nullable=False)
    technician = Column(String(255), nullable=True)
    cost = Column(Float, default=0.0)
    scheduled_date = Column(DateTime, nullable=True)
    completed_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="Scheduled") # Scheduled, In Progress, Completed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditLog(Base):
    """
    Audit Log for system events
    """
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "system"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    entity_type = Column(String(50), nullable=False, index=True) # Asset, Ticket, User
    entity_id = Column(String(255), nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True) # Created, Updated, Deleted, Login
    performed_by = Column(UUID(as_uuid=True), nullable=True, index=True) # User ID 
    details = Column(JSONB, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)

    __table_args__ = (
        Index('ix_audit_logs_details_gin', details, postgresql_using='gin'),
        {"schema": "system"}
    )

class ApiToken(Base):
    """
    API Token model for external system authentication
    """
    __tablename__ = "api_tokens"
    __table_args__ = {"schema": "system"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    token = Column(String(255), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)  # Descriptive name (e.g., "RHEL Server 192.168.1.146")
    created_by = Column(UUID(as_uuid=True), nullable=True)  # User ID who created the token
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # None = never expires
    last_used_at = Column(DateTime(timezone=True), nullable=True)


class ProcurementLog(Base):
    """
    Audit logs for Procurement and Finance segment actions (separate roles).
    """
    __tablename__ = "procurement_logs"
    __table_args__ = {"schema": "audit"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    reference_id = Column(UUID(as_uuid=True), nullable=False, index=True) # PO / Invoice / Request ID
    action = Column(String(50), nullable=False, index=True) # PO_UPLOADED / PO_APPROVED / PO_REJECTED / INVOICE_UPLOADED
    performed_by = Column(String(255), nullable=False, index=True)
    role = Column(String(50), nullable=True)
    metadata_ = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AssetRelationship(Base):
    """
    CMDB Asset Relationships - defines dependencies between assets.
    Relationship types:
    - parent_of / child_of: Hierarchical relationships (e.g., server -> VM)
    - depends_on / depended_by: Dependency relationships (e.g., app depends on database)
    - connected_to: Network/physical connections
    - runs_on: Software runs on hardware
    - backs_up_to: Backup relationships
    """
    __tablename__ = "asset_relationships"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    
    # Source asset (the "from" side of the relationship)
    source_asset_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("asset.assets.id", ondelete="CASCADE"),
        nullable=False, 
        index=True
    )
    
    # Target asset (the "to" side of the relationship)
    target_asset_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("asset.assets.id", ondelete="CASCADE"),
        nullable=False, 
        index=True
    )
    
    # Relationship type
    relationship_type = Column(String(50), nullable=False, index=True)
    # Valid types: parent_of, child_of, depends_on, depended_by, connected_to, runs_on, backs_up_to
    
    # Optional description
    description = Column(Text, nullable=True)
    
    # Relationship strength/criticality (1-5, where 5 is most critical)
    criticality = Column(Float, nullable=True, default=3)
    
    # Additional metadata
    metadata_ = Column(JSONB, nullable=True, default={})
    
    # Audit fields
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<AssetRelationship(id={self.id}, {self.source_asset_id} -> {self.relationship_type} -> {self.target_asset_id})>"

class DiscoveredSoftware(Base):
    """
    Discovered software found on assets via agent discovery
    """
    __tablename__ = "discovered_software"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id", ondelete="CASCADE"), nullable=False, index=True) # Linked to Asset ID
    name = Column(String(255), nullable=False, index=True)
    version = Column(String(100), nullable=True)
    vendor = Column(String(255), nullable=True)
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AgentConfiguration(Base):
    """
    Model for storing agent-specific configurations
    """
    __tablename__ = "agent_configurations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid)
    agent_id = Column(String(100), nullable=False, index=True)
    config_key = Column(String(100), nullable=False)
    config_value = Column(Text, nullable=False)  # Encrypted if sensitive
    is_sensitive = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        # Root Fix Phase 3: migrated from public → system schema
        # Run migration: alembic upgrade migrate_agent_tables_system
        {"schema": "system"}
    )


class AgentSchedule(Base):
    """
    Model for storing agent execution schedules
    """
    __tablename__ = "agent_schedules"
    # Root Fix Phase 3: migrated from public → system schema
    # Run migration: alembic upgrade migrate_agent_tables_system
    __table_args__ = {"schema": "system"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid)
    agent_id = Column(String(100), nullable=False, unique=True)
    cron_expression = Column(String(100), nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    last_run = Column(DateTime(timezone=True), nullable=True)
    next_run = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Company(Base):
    """
    Company/Tenant model for deployment-level configuration.
    Single company per deployment (single-tenant).
    """
    __tablename__ = "companies"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255), nullable=True)
    tax_id = Column(String(100), nullable=True)
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(50), nullable=True)
    timezone = Column(String(100), nullable=False, default="UTC")
    currency = Column(String(10), nullable=False, default="USD")
    locale = Column(String(20), nullable=False, default="en")
    contact_email = Column(String(255), nullable=True)
    support_email = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    industry = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    setup_completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class PasswordResetToken(Base):
    """
    Model for storing password reset tokens
    """
    __tablename__ = "password_reset_tokens"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<PasswordResetToken(user_id={self.user_id}, token={self.token[:8]}...)>"


class DiscoveryScan(Base):
    """
    Tracks discovery agent scan sessions
    """
    __tablename__ = "discovery_scans"
    __table_args__ = {"schema": "system"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    agent_id = Column(String(100), nullable=False, index=True)
    scan_type = Column(String(50), nullable=False) # local, snmp, cloud, saas, user_sync
    status = Column(String(50), default="STARTED") # STARTED, COMPLETED, FAILED
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    assets_processed = Column(Integer, default=0)
    errors = Column(Text, nullable=True)
    metadata_ = Column(JSONB, nullable=True, default={})


class DiscoveryDiff(Base):
    """
    Tracks specific changes detected during a discovery scan
    """
    __tablename__ = "discovery_diffs"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("system.discovery_scans.id"), nullable=False)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False)
    field_name = Column(String(100), nullable=False) # e.g. "RAM", "OS Version", "Software: Adobe Reader"
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())


class GatePass(Base):
    """
    Gate Pass model for authorizing physical movement of assets.
    """
    __tablename__ = "gate_passes"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id", ondelete="CASCADE"), nullable=False, index=True)

    # People
    issued_to = Column(String(255), nullable=False)         # Person taking the asset
    issued_by = Column(String(255), nullable=False)          # Staff who created the pass
    approved_by = Column(String(255), nullable=True)         # IT Management who approved

    # Purpose
    reason = Column(Text, nullable=False)
    destination = Column(String(255), nullable=True)

    # Validity
    valid_until = Column(DateTime(timezone=True), nullable=True)

    # Status: PENDING | APPROVED | REVOKED | EXPIRED
    status = Column(String(50), nullable=False, default="PENDING", index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<GatePass(id={self.id}, asset_id={self.asset_id}, status={self.status})>"

class SystemPatch(Base):
    """
    OS and Software patches available for deployment
    """
    __tablename__ = "system_patches"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    patch_id = Column(String(100), unique=True, nullable=False, index=True) # e.g. KB5031354
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(50), default="Moderate") # Critical, Important, Moderate, Low
    patch_type = Column(String(50), default="Security") # Security, Critical Update, Driver, etc.
    platform = Column(String(50), nullable=False) # Windows, Linux, macOS
    release_date = Column(DateTime(timezone=True), nullable=True)

    # CVE / Vulnerability tracking (Phase 8)
    cve_ids = Column(JSONB, nullable=True, default=list)       # e.g. ["CVE-2024-21334"]
    cvss_score = Column(Float, nullable=True)                  # 0.0 - 10.0
    # Enterprise Metadata (Phase 1)
    kb_article_id = Column(String(50), nullable=True, index=True) # e.g. 5031354
    kb_article_url = Column(String(500), nullable=True)
    vendor_advisory = Column(String(500), nullable=True)
    superseded_by_id = Column(UUID(as_uuid=True), ForeignKey("asset.system_patches.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class VulnerabilityMapping(Base):
    """
    Bridge table linking Assets to Missing Patches (Vulnerabilities)
    and storing the pre-calculated Risk Score.
    Phase 1 — Enterprise Patch Architecture
    """
    __tablename__ = "vulnerability_mappings"
    __table_args__ = (
        Index('ix_vuln_mapping_unique', "asset_id", "patch_id", unique=True),
        {"schema": "asset"}
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id", ondelete="CASCADE"), nullable=False, index=True)
    patch_id = Column(UUID(as_uuid=True), ForeignKey("asset.system_patches.id", ondelete="CASCADE"), nullable=False, index=True)
    
    risk_score = Column(Float, nullable=False, default=0.0, index=True)
    discovered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    remediated_at = Column(DateTime(timezone=True), nullable=True)


class PatchDeployment(Base):
    """
    Tracking status of patches on specific assets
    """
    __tablename__ = "patch_deployments"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    patch_id = Column(UUID(as_uuid=True), ForeignKey("asset.system_patches.id"), nullable=False, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False, index=True)
    
    # Status: MISSING | INSTALLED | FAILED | NOT_APPLICABLE
    status = Column(String(50), default="MISSING", index=True)
    installed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    last_check_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class RemoteSession(Base):
    """
    Tracking remote assistance (RDP) sessions initiated by IT Support
    """
    __tablename__ = "remote_sessions"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False, index=True)
    initiated_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    
    # Status: PENDING | ACTIVE | CLOSED | TIMEOUT
    status = Column(String(50), default="PENDING", index=True)
    connection_string = Column(String(500), nullable=True) # e.g. rdp://192.168.1.50
    session_token = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
# PATCH MANAGEMENT — Phase 2–4 Models
# ─────────────────────────────────────────────────────────────────────────────

class AgentCommand(Base):
    """
    Command queue: backend enqueues commands (e.g. INSTALL_PATCH); agents poll and execute.
    Phase 4 — Real Deployment Execution
    """
    __tablename__ = "agent_commands"
    __table_args__ = {"schema": "system"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False, index=True)
    # Command types: INSTALL_PATCH | ROLLBACK_PATCH | SCAN_PATCHES
    command = Column(String(50), nullable=False, index=True)
    payload = Column(JSONB, nullable=True)   # e.g. {"patch_id": "KB5031354", "deployment_id": "..."}
    # Status: PENDING | SENT | DONE | FAILED
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)


class PatchComplianceSnapshot(Base):
    """
    Daily snapshot of per-asset compliance score for trend charts.
    Phase 6 — Compliance History
    """
    __tablename__ = "patch_compliance_snapshots"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid)
    snapshot_date = Column(DateTime(timezone=True), nullable=False, index=True)   # date of snapshot
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False, index=True)
    compliance_score = Column(Float, nullable=False)
    installed_patches = Column(Integer, nullable=False, default=0)
    missing_patches = Column(Integer, nullable=False, default=0)
    critical_missing = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PatchSchedule(Base):
    """
    Maintenance window: schedule a patch for deferred deployment to a target group.
    Phase 5 — Scheduling & Maintenance Windows
    """
    __tablename__ = "patch_schedules"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    patch_id = Column(UUID(as_uuid=True), ForeignKey("asset.system_patches.id"), nullable=False, index=True)
    # Target groups: ALL | PILOT | SERVERS | WORKSTATIONS
    target_group = Column(String(50), default="ALL", nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    # Status: PENDING | RUNNING | DONE | CANCELLED | FAILED
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    
    # Maintenance Window (Phase 1 Expansion)
    window_start = Column(DateTime(timezone=True), nullable=True)
    window_end = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

class PatchDeploymentJob(Base):
    """
    Orchestrator for bulk patch actions (Phase 1 Enterprise)
    """
    __tablename__ = "patch_deployment_jobs"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    patch_id = Column(UUID(as_uuid=True), ForeignKey("asset.system_patches.id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    
    # Target Criteria (JSON) e.g. {"group": "Servers", "os": "Windows"}
    target_criteria = Column(JSONB, nullable=False)
    
    # Stats for monitoring
    total_assets = Column(Integer, default=0)
    completed_assets = Column(Integer, default=0)
    failed_assets = Column(Integer, default=0)
    
    status = Column(String(50), default="QUEUED", index=True) # QUEUED | PROCESSING | COMPLETED | FAILED
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

class PatchLog(Base):
    """
    Detailed execution logs from agents. Partitioned by month in production.
    (Phase 1 Enterprise)
    """
    __tablename__ = "patch_logs"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    deployment_id = Column(UUID(as_uuid=True), ForeignKey("asset.patch_deployments.id"), nullable=False, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False, index=True)
    
    # Log Level: INFO | WARN | ERROR
    level = Column(String(20), default="INFO")
    message = Column(Text, nullable=False)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserPreference(Base):
    """
    User-specific preferences for dashboard views, notifications, and UI theme
    """
    __tablename__ = "user_preferences"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # JSON storage for flexible settings
    saved_views = Column(JSONB, nullable=True, default=dict) # Dashboard specific filters
    notification_settings = Column(JSONB, nullable=True, default=dict) # { "email": true, "push": false, "types": [...] }
    ui_theme = Column(String(20), default="light") # light | dark | system
    onboarding_dismissed = Column(Boolean, default=False)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", foreign_keys=[user_id], lazy='selectin')

    def __repr__(self):
        return f"<UserPreference(user_id={self.user_id})>"


class AiAgentConfig(Base):
    """
    Centralized configuration for AI Agents, previously hardcoded in agentDetails.js
    """
    __tablename__ = "ai_agent_configs"
    __table_args__ = {"schema": "system"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    agent_type = Column(String(50), unique=True, nullable=False, index=True) # STARTER | PROFESSIONAL | BUSINESS
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    capabilities = Column(JSONB, nullable=True, default=list) # Array of capability strings
    icon = Column(String(100), nullable=True) # Lucide icon name
    
    status = Column(String(20), default="ACTIVE") # ACTIVE | INACTIVE
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<AiAgentConfig(type={self.agent_type}, title={self.title})>"


class ChatMessage(Base):
    """
    Persistent storage for AI Assistant chat history
    """
    __tablename__ = "chat_messages"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    role = Column(String(20), nullable=False) # user | assistant
    content = Column(Text, nullable=False)
    
    # Metadata for rich UI (e.g. references to assets, suggested actions)
    msg_metadata = Column(JSONB, nullable=True, default=dict)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", foreign_keys=[user_id], lazy='selectin')

    def __repr__(self):
        return f"<ChatMessage(user_id={self.user_id}, role={self.role})>"

class NotificationType(str, enum.Enum):
    DISCOVERY = "discovery"
    SYSTEM = "system"
    ALERT = "alert"
    WORKFLOW = "workflow"

class Notification(Base):
    """
    System notifications and alerts for users, including asset discovery events.
    """
    __tablename__ = "notifications"
    __table_args__ = {"schema": "system"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=get_uuid, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=True, index=True) # Null for global broadcast
    
    type = Column(String(50), nullable=False) # discovery, warranty, renewal, procurement, asset, maintenance, system
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    is_read = Column(Boolean, default=False, index=True)
    link = Column(String(255), nullable=True) # Optional link to a specific asset/ticket/etc.
    source = Column(String(100), nullable=True) # e.g., "agent-aws", "agent-snmp"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id], lazy='selectin')

    def __repr__(self):
        return f"<Notification(id={self.id}, title={self.title}, type={self.type})>"

class DiscoveryAgent(Base):
    """
    Registry for discovery agents (SNMP, AWS, GitHub, etc.)
    """
    __tablename__ = "discovery_agents"
    __table_args__ = {"schema": "asset"}

    id = Column(String(100), primary_key=True, index=True) # e.g. agent-snmp, agent-aws
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False) # System, Cloud, API, Directory, Network
    role = Column(String(100), nullable=True) # Discovery, Compliance, etc.
    
    # Real-time status
    status = Column(String(20), default="offline") # online, offline, standby
    health = Column(Float, default=100.0) # 0-100
    last_sync = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    description = Column(Text, nullable=True)
    capabilities = Column(JSONB, nullable=True, default=list)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<DiscoveryAgent(id={self.id}, name={self.name}, status={self.status})>"

# ─────────────────────────────────────────────────────────────────────────────
# MULTI-TENANT & HIERARCHY LISTENERS (Phase 6)
# ─────────────────────────────────────────────────────────────────────────────

from sqlalchemy import inspect

@event.listens_for(Department, 'before_insert')
@event.listens_for(Department, 'before_update')
def inherit_company_id_department(mapper, connection, target):
    """
    Sub-departments must inherit their company_id from their parent.
    """
    if target.parent_id:
        # Avoid query if company_id is already matching
        session = inspect(target).session
        if session:
            parent = session.get(Department, target.parent_id)
            if parent and parent.company_id:
                target.company_id = parent.company_id

@event.listens_for(User, 'before_insert')
@event.listens_for(User, 'before_update')
def inherit_company_id_user(mapper, connection, target):
    """
    Users should inherit company_id from their department if assigned.
    """
    if target.department_id and not target.company_id:
        session = inspect(target).session
        if session:
            dept = session.get(Department, target.department_id)
            if dept and dept.company_id:
                target.company_id = dept.company_id
