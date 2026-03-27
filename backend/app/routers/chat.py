from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database.database import get_db
from ..utils.auth_utils import get_current_user
from ..models.models import ChatMessage
from ..schemas.chat_message_schema import ChatMessageResponse, ChatMessageCreate
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/history", response_model=list[ChatMessageResponse])
async def get_chat_history(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetch persistent chat history for the current user."""
    result = await db.execute(
        select(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.timestamp.asc())
    )
    return result.scalars().all()

@router.post("/message", response_model=ChatMessageResponse)
async def save_chat_message(
    message: ChatMessageCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Save a new chat message to history."""
    db_msg = ChatMessage(
        id=uuid.uuid4(),
        user_id=current_user.id,
        role=message.role,
        content=message.content,
        msg_metadata=message.msg_metadata
    )
    db.add(db_msg)
    await db.commit()
    await db.refresh(db_msg)
    return db_msg
