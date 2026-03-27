from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Any

class ChatMessageBase(BaseModel):
    role: str
    content: str
    msg_metadata: Optional[dict] = {}

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: UUID
    user_id: UUID
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
