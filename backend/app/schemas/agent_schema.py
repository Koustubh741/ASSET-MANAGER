
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, Optional, List

class AgentConfigUpdate(BaseModel):
    config: Dict[str, Any] = Field(..., description="Configuration key-value pairs")

class AgentConfigResponse(BaseModel):
    agent_id: str
    config: Dict[str, Any]

class AgentValidationResponse(BaseModel):
    valid: bool
    message: Optional[str] = None
    error: Optional[str] = None

class AgentScheduleUpdate(BaseModel):
    cron_expression: str
    is_enabled: bool

class AgentScheduleResponse(BaseModel):
    agent_id: str
    cron_expression: str
    is_enabled: bool
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    
    class Config:
        from_attributes = True
