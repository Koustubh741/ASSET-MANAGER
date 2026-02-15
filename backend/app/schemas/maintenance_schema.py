from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class MaintenanceRecordBase(BaseModel):
    asset_id: UUID
    maintenance_type: str
    description: str
    cost: float = 0.0
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    status: str = "Scheduled"

class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass

class MaintenanceRecordUpdate(BaseModel):
    maintenance_type: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    status: Optional[str] = None
    completed_date: Optional[datetime] = None

class MaintenanceRecordResponse(MaintenanceRecordBase):
    id: UUID
    technician: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
