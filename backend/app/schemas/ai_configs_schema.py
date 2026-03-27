from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import List, Optional
from datetime import datetime

class AiAgentConfigBase(BaseModel):
    agent_type: str
    title: str
    description: Optional[str] = None
    capabilities: Optional[List[str]] = []
    icon: Optional[str] = None
    status: Optional[str] = "ACTIVE"

class AiAgentConfigResponse(AiAgentConfigBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
