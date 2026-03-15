from pydantic import BaseModel, EmailStr, Field, ConfigDict
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
    outcome: Optional[str] = None  # "repair" for company assets, "secure" for BYOD
    notes: Optional[str] = None

class ResolutionUpdate(BaseModel):
    """Refinement: Reviewer inferred from JWT"""
    checklist: List[dict]
    notes: Optional[str] = None
    percentage: float

class TicketCategoryStat(BaseModel):
    category: str
    open: int
    pending: int
    resolved: int
    total: int
    reliability_score: float = 0.0
    mttr_hours: float = 0.0
    department_impact: List[dict] = []
    estimated_cost: float = 0.0

class TicketCategorySummaryResponse(BaseModel):
    stats: List[TicketCategoryStat]
    total_tickets: int

class TicketResponse(TicketBase):
    id: UUID
    status: str
    requestor_id: Optional[UUID] = None
    requestor_name: Optional[str] = None
    requestor_department: Optional[str] = None
    requestor_email: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    assigned_to_name: Optional[str] = None
    assigned_to_email: Optional[str] = None
    assigned_to_role: Optional[str] = None
    related_asset_id: Optional[UUID] = None
    
    # Resolution Details
    resolution_notes: Optional[str] = None
    resolution_checklist: Optional[List[dict]] = None
    resolution_percentage: Optional[float] = 0.0
    timeline: Optional[List[dict]] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Automation Schemas ---

class WorkflowRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    priority_order: int = 0
    is_active: bool = True
    conditions: dict
    actions: dict

class WorkflowRuleResponse(WorkflowRuleCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SLAPolicyCreate(BaseModel):
    name: str
    priority: Optional[str] = None
    category: Optional[str] = None
    response_time_limit: Optional[int] = None
    resolution_time_limit: int
    is_active: bool = True

class SLAPolicyResponse(SLAPolicyCreate):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
