from sqlalchemy import Column, String, Date, Float, DateTime, JSON, Text, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
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
    model = Column(String(255), nullable=False)
    vendor = Column(String(255), nullable=False)
    serial_number = Column(String(255), nullable=False, unique=True, index=True)
    segment = Column(String(50), nullable=False, default="IT")

    # Dates
    purchase_date = Column(Date, nullable=True)
    warranty_expiry = Column(Date, nullable=True, index=True)
    contract_expiry = Column(Date, nullable=True, index=True)
    license_expiry = Column(Date, nullable=True, index=True)
    assignment_date = Column(Date, nullable=True)

    # Status and Location
    status = Column(String(50), nullable=False, index=True)
    location_id = Column(UUID(as_uuid=True), ForeignKey("asset.locations.id"), nullable=True)
    location_text = Column(String(255), nullable=True) # Fallback / Legacy

    # Assignment
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=True)
    assigned_to_name = Column(String(255), nullable=True) # Denormalized for display
    assigned_by = Column(String(255), nullable=True)

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
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    assigned_by = Column(String, nullable=True)
    location = Column(String(255), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

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
    
    # Relations (Using string IDs to avoid complex foreign key constraints for MVP if simple)
    # Ideally should use ForeignKey("auth.users.id") but cross-schema FKs need care.
    requestor_id = Column(UUID(as_uuid=True), nullable=True) 
    assigned_to_id = Column(UUID(as_uuid=True), nullable=True)
    related_asset_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Resolution Details
    resolution_notes = Column(Text, nullable=True)
    resolution_checklist = Column(JSON, nullable=True)
    resolution_percentage = Column(Float, default=0.0)
    timeline = Column(JSON, nullable=True, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Ticket(id={self.id}, subject={self.subject}, status={self.status})>"

class AssetRequest(Base):
    """
    Asset Request model for managing asset requests and approvals
    """
    __tablename__ = "asset_requests"
    __table_args__ = {"schema": "asset"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Requester information
    requester_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
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
    
    # Procurement & Finance approval tracking
    procurement_finance_status = Column(String(50), nullable=True)  # APPROVED | REJECTED
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


class ExitRequest(Base):
    """
    User exit / resignation workflow
    """
    __tablename__ = "exit_requests"
    __table_args__ = {"schema": "exit"}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), nullable=False, index=True)
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

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    entity_type = Column(String(50), nullable=False, index=True) # Asset, Ticket, User
    entity_id = Column(String(255), nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True) # Created, Updated, Deleted, Login
    performed_by = Column(String(255), nullable=True, index=True) # User ID 
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

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    token = Column(String(255), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)  # Descriptive name (e.g., "RHEL Server 192.168.1.146")
    created_by = Column(String(36), nullable=True)  # User ID who created the token
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # None = never expires
    last_used_at = Column(DateTime(timezone=True), nullable=True)


class ProcurementLog(Base):
    """
    Audit logs for procurement and finance actions
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
