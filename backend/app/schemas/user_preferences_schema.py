from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Dict, Any, Optional
from datetime import datetime

class UserPreferenceBase(BaseModel):
    saved_views: Optional[Dict[str, Any]] = {}
    notification_settings: Optional[Dict[str, Any]] = {}
    ui_theme: Optional[str] = "light"
    onboarding_dismissed: Optional[bool] = False

class UserPreferenceUpdate(UserPreferenceBase):
    pass

class UserPreferenceResponse(UserPreferenceBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
