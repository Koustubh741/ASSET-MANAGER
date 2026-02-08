from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class LocationBase(BaseModel):
    name: str
    parent_id: Optional[UUID] = None
    address: Optional[str] = None
    timezone: str = "UTC"
    metadata: Optional[Dict[str, Any]] = {}

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[UUID] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class LocationResponse(LocationBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
