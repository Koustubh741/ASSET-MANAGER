from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

from uuid import UUID

class ExitRequestResponse(BaseModel):
    id: UUID
    user_id: UUID
    status: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_department: Optional[str] = None
    assets_snapshot: Optional[List[Any]] = None
    byod_snapshot: Optional[List[Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
