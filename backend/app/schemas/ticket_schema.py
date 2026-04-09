from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional, List, Union, Any
from datetime import datetime
from uuid import UUID

def normalize_uuid_value(v: Any) -> Any:
    if isinstance(v, str) and not v.strip():
        return None
    return v

class TicketBase(BaseModel):
    subject: str
    description: str
    priority: str = "Medium" # Low, Medium, High
    category: Optional[str] = None
    subcategory: Optional[str] = None
    target_department_id: Optional[UUID] = None
    assignment_group_id: Optional[UUID] = None

    @field_validator("assignment_group_id", mode="before")
    @classmethod
    def validate_assignment_group(cls, v: Any) -> Any:
        return normalize_uuid_value(v)

class TicketCreate(TicketBase):
    related_asset_id: Optional[UUID] = None

    @field_validator("related_asset_id", mode="before")
    @classmethod
    def validate_related_asset(cls, v: Any) -> Any:
        return normalize_uuid_value(v)

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    assignment_group_id: Optional[UUID] = None

    @field_validator("assigned_to_id", "assignment_group_id", mode="before")
    @classmethod
    def validate_uuids(cls, v: Any) -> Any:
        return normalize_uuid_value(v)

# --- Assignment Group Schemas ---

class AssignmentGroupBase(BaseModel):
    name: str
    department: Optional[str] = None # Legacy label
    department_id: Optional[UUID] = None # Authoritative link
    description: Optional[str] = None
    manager_id: Optional[UUID] = None

class AssignmentGroupCreate(AssignmentGroupBase):
    pass

class AssignmentGroupResponse(AssignmentGroupBase):
    id: UUID
    department_name: Optional[str] = None # For easy display
    created_at: datetime
    updated_at: datetime



    model_config = ConfigDict(from_attributes=True)

# --- Task Schemas ---

class TaskBase(BaseModel):
    subject: str
    description: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    group_id: Optional[UUID] = None
    status: str = "Open"
    priority: str = "Medium"
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    ticket_id: UUID

class TaskResponse(TaskBase):
    id: UUID
    ticket_id: UUID
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    assigned_to_name: Optional[str] = None
    group_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

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

class TicketAssignmentRequest(BaseModel):
    agent_id: UUID

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
    display_id: Optional[str] = None
    status: str
    requestor_id: Optional[UUID] = None
    requestor_name: Optional[str] = None
    requestor_department: Optional[str] = None
    requestor_email: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    assigned_to_name: Optional[str] = None
    assigned_to_email: Optional[str] = None
    assigned_to_role: Optional[str] = None
    assignment_group_id: Optional[UUID] = None
    assignment_group_name: Optional[str] = None
    assignment_group_department: Optional[str] = None
    target_department_id: Optional[UUID] = None
    target_department_name: Optional[str] = None
    related_asset_id: Optional[UUID] = None
    
    tasks: Optional[List[TaskResponse]] = []
    
    # Resolution & SLA Details
    resolution_notes: Optional[str] = None
    resolution_checklist: Optional[List[dict]] = None
    resolution_percentage: Optional[float] = 0.0
    sla_deadline: Optional[datetime] = None # Legacy field (resolution)
    
    # Root Fix: Detailed SLA Metadata
    sla_response_deadline: Optional[datetime] = None
    sla_resolution_deadline: Optional[datetime] = None
    sla_response_status: Optional[str] = "IN_PROGRESS"
    sla_resolution_status: Optional[str] = "IN_PROGRESS"
    
    subcategory: Optional[str] = None
    target_department_id: Optional[UUID] = None
    target_department_name: Optional[str] = None
    
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

class WorkflowRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    priority_order: Optional[int] = None
    is_active: Optional[bool] = None
    conditions: Optional[dict] = None
    actions: Optional[dict] = None

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

class SLAPolicyUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    response_time_limit: Optional[int] = None
    resolution_time_limit: Optional[int] = None
    is_active: Optional[bool] = None

# --- Comment & Attachment Schemas ---

class TicketCommentBase(BaseModel):
    content: str
    is_internal: bool = False

class TicketCommentCreate(TicketCommentBase):
    pass

class TicketCommentResponse(TicketCommentBase):
    id: UUID
    ticket_id: UUID
    user_id: Optional[UUID] = None
    author_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TicketAttachmentBase(BaseModel):
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None

class TicketAttachmentResponse(TicketAttachmentBase):
    id: UUID
    ticket_id: UUID
    uploader_id: Optional[UUID] = None
    uploader_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
