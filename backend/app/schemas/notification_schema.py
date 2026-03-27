from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class NotificationBase(BaseModel):
    type: str # warranty, renewal, procurement, asset, maintenance, system
    title: str
    message: str
    is_read: bool = False
    link: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: UUID

class NotificationUpdate(BaseModel):
    is_read: bool

class NotificationResponse(NotificationBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
