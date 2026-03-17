from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union
from datetime import date, datetime
from uuid import UUID

class AssetBase(BaseModel):
    name: str
    type: str  # Laptop, Server, License, etc.
    model: str
    vendor: str
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    contract_expiry: Optional[date] = None
    license_expiry: Optional[date] = None
    status: str  # Active, In Stock, Retired, Repair
    location: Optional[str] = None
    segment: str = "IT" # IT or NON-IT
    assigned_to: Optional[str] = None
    assigned_by: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = {}
    cost: Optional[float] = 0.0
    
    # End User Verification Fields
    acceptance_status: Optional[str] = None # None, "PENDING", "ACCEPTED", "REJECTED"
    acceptance_rejection_reason: Optional[str] = None

    # Renewal Workflow Fields
    renewal_status: Optional[str] = None # None, "Requested", "IT_Approved", "Finance_Approved", "Commercial_Approved", "Renewed"
    renewal_cost: Optional[float] = None
    renewal_reason: Optional[str] = None
    renewal_urgency: Optional[str] = None # Low, Medium, High

    # Procurement & Disposal Fields
    procurement_status: Optional[str] = None # None, "Requested", "Approved", "Ordered", "Received"
    disposal_status: Optional[str] = None # None, "Pending_Validation", "Ready_For_Wipe", "Wiped", "Disposed"

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    model: Optional[str] = None
    vendor: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    status: Optional[str] = None
    location: Optional[str] = None
    assigned_to: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    assignment_date: Optional[date] = None
    assigned_to_id: Optional[UUID] = None
    segment: Optional[str] = None
    renewal_status: Optional[str] = None
    renewal_cost: Optional[float] = None
    request_id: Optional[UUID] = None

from uuid import UUID
from typing import Union

class AssetResponse(AssetBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    assignment_date: Optional[date] = None
    
    # Phase 2 Fields
    location_id: Optional[UUID] = None
    assigned_to_id: Optional[UUID] = None
    assigned_to_name: Optional[str] = None
    request_id: Optional[UUID] = None

    class Config:
        json_encoders = {
            UUID: lambda v: str(v)
        }
        from_attributes = True
class AssetAssignmentRequest(BaseModel):
    assigned_to: str
    location: Optional[str] = "Office"
    assignment_date: Optional[date] = None


class AssetStatusUpdate(BaseModel):
    """Schema for updating asset status via JSON body"""
    status: str

class AssetVerificationRequest(BaseModel):
    """Schema for end user verifying an asset assignment"""
    acceptance_status: str # "ACCEPTED" or "REJECTED"
    reason: Optional[str] = None

