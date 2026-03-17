from sqlalchemy import Column, String, Date, Float, DateTime, JSON, Text, ForeignKey, Boolean, Index, UUID, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
import uuid
from datetime import datetime
from ..database.database import Base

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
        default=uuid.uuid4,
        index=True
    )

    # Basic Asset Information
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(100), nullable=False)
    model = Column(String(255), nullable=False, default="Unknown Model")
    vendor = Column(String(255), nullable=False, default="Unknown Vendor")
    serial_number = Column(String(255), nullable=True, unique=True, index=True)
    segment = Column(String(50), nullable=False, default="IT")

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

    assigned_user = relationship("User", foreign_keys=[assigned_to_id])

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

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    asset_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by = Column(String, nullable=True)
    location = Column(String(255), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", foreign_keys=[user_id])

class AssetInventory(Base):
    """
    Asset Inventory tracking (items in stock)
    """
    __tablename__ = "asset_inventory"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    asset_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True) # One entry per asset while in stock
    location = Column(String(255), nullable=True)
    status = Column(String(50), default="Available") # Available, Reserved, Inspection
    availability_flag = Column(Boolean, default=True) # True if available for allocation
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    stocked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class User(Base):
    """
    User model for authentication and role management
    """
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="END_USER")
    status = Column(String(50), nullable=False, default="PENDING", index=True)  # PENDING | ACTIVE | EXITING | DISABLED
    position = Column(String(50), nullable=True)  # MANAGER | TEAM_MEMBER
    domain = Column(String(50), nullable=True)  # DATA_AI | CLOUD | SECURITY | DEVELOPMENT
    department = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    company = Column(String(255), nullable=True) # New field
    manager_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    persona = Column(String(100), nullable=True) # Functional Persona (e.g. IT_GOVERNANCE)

    # Subscription / Plan (AI Assistant access)
    plan = Column(String(50), nullable=False, default="STARTER")  # STARTER | PROFESSIONAL | BUSINESS | ENTERPRISE
    ai_queries_this_month = Column(Integer, nullable=False, default=0)
    ai_queries_reset_at = Column(DateTime(timezone=True), nullable=True)
    
    # SSO Integration
    sso_provider = Column(String(50), nullable=True) # google, azure, okta
    sso_id = Column(String(255), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role}, status={self.status})>"

class Ticket(Base):
    """
    Ticket model for Help Desk/Incidents
    """
    __tablename__ = "tickets"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    # Using a readable ID like TCK-101 is common, but basic UUID is safer for MVP.
    # We can add a sequence or display_id later.
    
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    
    status = Column(String(50), default="Open", index=True) # Open, Pending, Closed
    priority = Column(String(20), default="Medium") # Low, Medium, High
    category = Column(String(50), nullable=True) # Hardware, Software, Network
    
    # Relations
    requestor_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True) 
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    assignment_group_id = Column(UUID(as_uuid=True), ForeignKey("support.assignment_groups.id", ondelete="SET NULL"), nullable=True)
    related_asset_id = Column(UUID(as_uuid=True), nullable=True)

    requestor = relationship("User", foreign_keys=[requestor_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    assignment_group = relationship("AssignmentGroup", foreign_keys=[assignment_group_id])
    tasks = relationship("Task", back_populates="ticket", cascade="all, delete-orphan")
    sla = relationship("TicketSLA", back_populates="ticket", uselist=False, cascade="all, delete-orphan")
    
    # Resolution Details
    resolution_notes = Column(Text, nullable=True)
    resolution_checklist = Column(JSON, nullable=True)
    resolution_percentage = Column(Float, default=0.0)
    timeline = Column(JSON, nullable=True, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Ticket(id={self.id}, subject={self.subject}, status={self.status})>"

class AssignmentGroup(Base):
    """
    Groups/Teams for ticket routing and task allocation
    """
    __tablename__ = "assignment_groups"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    department = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    
    manager = relationship("User", foreign_keys=[manager_id])
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<AssignmentGroup(name={self.name}, department={self.department})>"

class AssignmentGroupMember(Base):
    """
    Association table for Users and AssignmentGroups
    """
    __tablename__ = "assignment_group_members"
    __table_args__ = {"schema": "support"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("support.assignment_groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False)
    
    group = relationship("AssignmentGroup")
    user = relationship("User")

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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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
    
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    group = relationship("AssignmentGroup", foreign_keys=[group_id])
    ticket = relationship("Ticket", back_populates="tasks")

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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Requester information
    requester_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), nullable=False, index=True)

    requester = relationship("User", foreign_keys=[requester_id])
    
    # Asset details (can be linked to existing asset or new asset request)
    asset_id = Column(UUID(as_uuid=True), nullable=True)  # If requesting existing asset
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    request_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    owner_id = Column(UUID(as_uuid=True), nullable=False, index=True)

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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PurchaseInvoice(Base):
    """
    Purchase Invoice after confirming purchase
    """
    __tablename__ = "purchase_invoices"
    __table_args__ = {"schema": "procurement"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("procurement.purchase_orders.id"), nullable=False, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    asset_id = Column(UUID(as_uuid=True), nullable=False, index=True) # Linked to Asset ID
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(String(100), nullable=False, index=True)
    config_key = Column(String(100), nullable=False)
    config_value = Column(Text, nullable=False)  # Encrypted if sensitive
    is_sensitive = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        {"schema": "public"} # Default schema
    )


class AgentSchedule(Base):
    """
    Model for storing agent execution schedules
    """
    __tablename__ = "agent_schedules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    patch_id = Column(String(100), unique=True, nullable=False, index=True) # e.g. KB5031354
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(50), default="Moderate") # Critical, Important, Moderate, Low
    patch_type = Column(String(50), default="Security") # Security, Critical Update, Driver, etc.
    platform = Column(String(50), nullable=False) # Windows, Linux, macOS
    release_date = Column(DateTime, nullable=True)

    # CVE / Vulnerability tracking (Phase 8)
    cve_ids = Column(JSONB, nullable=True, default=list)       # e.g. ["CVE-2024-21334"]
    cvss_score = Column(Float, nullable=True)                  # 0.0 - 10.0
    kb_article_url = Column(String(500), nullable=True)        # Microsoft KB link
    vendor_advisory = Column(String(500), nullable=True)       # Vendor advisory URL

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class PatchDeployment(Base):
    """
    Tracking status of patches on specific assets
    """
    __tablename__ = "patch_deployments"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    patch_id = Column(UUID(as_uuid=True), ForeignKey("asset.system_patches.id"), nullable=False, index=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.assets.id"), nullable=False, index=True)
    
    # Status: MISSING | INSTALLED | FAILED | NOT_APPLICABLE
    status = Column(String(50), default="MISSING", index=True)
    installed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    last_check_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class RemoteSession(Base):
    """
    Tracking remote assistance (RDP) sessions initiated by IT Support
    """
    __tablename__ = "remote_sessions"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_date = Column(DateTime, nullable=False, index=True)   # date of snapshot
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    patch_id = Column(UUID(as_uuid=True), ForeignKey("asset.system_patches.id"), nullable=False, index=True)
    # Target groups: ALL | PILOT | SERVERS | WORKSTATIONS
    target_group = Column(String(50), default="ALL", nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    # Status: PENDING | RUNNING | DONE | CANCELLED | FAILED
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
