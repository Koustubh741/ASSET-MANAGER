from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import datetime
from uuid import UUID

class TicketBase(BaseModel):
    subject: str
    description: str
    priority: str = "Medium" # Low, Medium, High
    category: Optional[str] = "Hardware"

class TicketCreate(TicketBase):
    related_asset_id: Optional[UUID] = None

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[UUID] = None


class ITDiagnosisRequest(BaseModel):
    """
    Request body for IT Management diagnosis of a ticket (Reviewer inferred from JWT)
    """
    outcome: str  # "repair" for company assets, "secure" for BYOD
    notes: Optional[str] = None

class ResolutionUpdate(BaseModel):
    """Refinement: Reviewer inferred from JWT"""
    checklist: List[dict]
    notes: Optional[str] = None
    percentage: float

class TicketResponse(TicketBase):
    id: UUID
    status: str
    requestor_id: Optional[UUID] = None
    requestor_name: Optional[str] = None
    requestor_department: Optional[str] = None
    requestor_email: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    related_asset_id: Optional[UUID] = None
    
    # Resolution Details
    resolution_notes: Optional[str] = None
    resolution_checklist: Optional[List[dict]] = None
    resolution_percentage: Optional[float] = 0.0
    timeline: Optional[List[dict]] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
