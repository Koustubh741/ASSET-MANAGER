
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

class DiscoveryAgentUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    health: Optional[float] = None
    last_sync: Optional[datetime] = None

class DiscoveryAgentResponse(BaseModel):
    id: str
    name: str
    type: str
    role: Optional[str] = None
    status: str
    health: float
    last_sync: Optional[datetime] = None
    description: Optional[str] = None
    capabilities: List[str] = []
    
    class Config:
        from_attributes = True
