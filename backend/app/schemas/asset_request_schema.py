from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class ManagerApproval(BaseModel):
    """Individual manager approval record"""
    manager_id: UUID
    manager_name: str
    decision: str  # "APPROVED" | "REJECTED"
    reason: Optional[str] = None
    timestamp: datetime

class AssetRequestBase(BaseModel):
    asset_id: Optional[UUID] = None
    asset_name: str
    asset_type: str  # Laptop, Server, etc. (asset category)
    asset_ownership_type: Optional[str] = None  # COMPANY_OWNED | BYOD
    asset_model: Optional[str] = None
    asset_vendor: Optional[str] = None
    serial_number: Optional[str] = None
    os_version: Optional[str] = None
    cost_estimate: Optional[float] = None
    justification: Optional[str] = None
    business_justification: Optional[str] = None
    reason: Optional[str] = None

class AssetRequestCreate(AssetRequestBase):
    asset_ownership_type: str  # COMPANY_OWNED | BYOD (required for new requests)
    business_justification: str  # Required for new requests

class AssetRequestUpdate(BaseModel):
    status: Optional[str] = None
    manager_approvals: Optional[List[Dict[str, Any]]] = None

class AssetRequestResponse(AssetRequestBase):
    id: UUID
    status: str
    requester_id: UUID
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requester_department: Optional[str] = None
    manager_approvals: Optional[List[Dict[str, Any]]] = None
    # IT review tracking (for audit)
    it_reviewed_by: Optional[UUID] = None
    it_reviewed_at: Optional[datetime] = None
    # Procurement & Finance tracking
    procurement_finance_status: Optional[str] = None
    procurement_finance_reviewed_by: Optional[UUID] = None
    procurement_finance_reviewed_at: Optional[datetime] = None
    procurement_finance_rejection_reason: Optional[str] = None
    # QC tracking
    qc_status: Optional[str] = None
    qc_performed_by: Optional[UUID] = None
    qc_performed_at: Optional[datetime] = None
    qc_notes: Optional[str] = None
    # User acceptance tracking
    user_acceptance_status: Optional[str] = None
    user_accepted_at: Optional[datetime] = None
    # Procurement extensions (Step 6)
    purchase_order: Optional[Dict[str, Any]] = None
    purchase_invoice: Optional[Dict[str, Any]] = None
    procurement_logs: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime
    
    # Validator to ensure Any fields are serialized to str
    @field_validator('requester_id', 'id', 'it_reviewed_by', 'procurement_finance_reviewed_by', 'qc_performed_by', mode='before')
    def serialize_uuid(cls, v):
        if v is None:
            return None
        return str(v)

    class Config:
        from_attributes = True

class ManagerApprovalRequest(BaseModel):
    """Request body for manager approval (ID derived from JWT)"""
    pass

class ManagerRejectionRequest(BaseModel):
    """Request body for manager rejection - requires reason"""
    reason: str


class ByodRegisterRequest(BaseModel):
    """Request body for BYOD registration"""
    device_model: str
    os_version: str
    serial_number: str


class ProcurementApprovalRequest(BaseModel):
    """Request body for procurement & finance approval (ID derived from JWT)"""
    pass


class ProcurementRejectionRequest(ProcurementApprovalRequest):
    """Request body for procurement & finance rejection - requires reason"""
    reason: str


class QCPerformRequest(BaseModel):
    """Request body for QC performance (Performer derived from JWT)"""
    qc_status: str  # PASSED | FAILED
    qc_notes: Optional[str] = None


class UserAcceptanceRequest(BaseModel):
    """Request body for user acceptance (User derived from JWT)"""
    pass


class ITApprovalRequest(BaseModel):
    """Request body for IT approval (ID derived from JWT)"""
    approval_comment: Optional[str] = None


class ITRejectionRequest(BaseModel):
    """Request body for IT rejection"""
    reason: str


class ITDiagnosisRequest(BaseModel):
    """Request body for IT diagnosis (ID derived from JWT)"""
    outcome: str  # "repair" | "secure"


class ManagerConfirmationRequest(BaseModel):
    """Request body for manager confirmation at critical workflow stages (ID/Name derived from JWT)"""
    decision: str  # "CONFIRM" | "REJECT"
    reason: Optional[str] = None


class ByodComplianceCheckRequest(BaseModel):
    """Request body for BYOD compliance validation (Reviewer derived from JWT)"""
    dry_run: bool = False  # When True, return mock success without executing logic


class MdmEnrollmentRequest(BaseModel):
    """Request body for MDM device enrollment"""
    device_id: UUID
    security_policies: Optional[Dict[str, Any]] = None

class DeliveryConfirmationRequest(BaseModel):
    """Request body for procurement delivery confirmation"""
    serial_number: str
    asset_name: str
    asset_model: Optional[str] = None
