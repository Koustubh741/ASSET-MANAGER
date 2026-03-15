from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID
import uuid
from ..database.database import get_db
from ..models.models import RemoteSession, Asset
from ..utils import auth_utils
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(
    prefix="/remote",
    tags=["remote-assistance"]
)

class RemoteSessionCreate(BaseModel):
    asset_id: UUID

class RemoteSessionResponse(BaseModel):
    id: UUID
    asset_id: UUID
    status: str
    connection_string: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/request", response_model=RemoteSessionResponse)
async def request_remote_assistance(
    request: RemoteSessionCreate,
    db: AsyncSession = Depends(get_db),
    admin = Depends(auth_utils.get_current_user)
):
    """
    Initiated by IT Support to request a remote session on an asset.
    """
    if admin.role not in ["ADMIN", "IT_SUPPORT", "IT_MANAGEMENT"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Check if asset exists
    asset_result = await db.execute(select(Asset).filter(Asset.id == request.asset_id))
    asset = asset_result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    session = RemoteSession(
        id=uuid.uuid4(),
        asset_id=request.asset_id,
        initiated_by=admin.id,
        status="PENDING",
        connection_string=f"rdp://{asset.specifications.get('ip_address', 'unknown')}"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.get("/sessions", response_model=List[RemoteSessionResponse])
async def get_active_sessions(
    db: AsyncSession = Depends(get_db),
    user = Depends(auth_utils.get_current_user)
):
    result = await db.execute(select(RemoteSession).filter(RemoteSession.status != "CLOSED").order_by(RemoteSession.created_at.desc()))
    return result.scalars().all()

@router.patch("/sessions/{session_id}/close")
async def close_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    user = Depends(auth_utils.get_current_user)
):
    result = await db.execute(select(RemoteSession).filter(RemoteSession.id == session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.status = "CLOSED"
    await db.commit()
    return {"status": "success"}

@router.get("/poll/{asset_id}")
async def poll_remote_request(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint for the local agent to check if a remote session is requested.
    """
    result = await db.execute(
        select(RemoteSession)
        .filter(RemoteSession.asset_id == asset_id, RemoteSession.status == "PENDING")
        .order_by(RemoteSession.created_at.desc())
    )
    session = result.scalars().first()
    if session:
        return {
            "requested": True,
            "session_id": str(session.id),
            "connection_string": session.connection_string
        }
    return {"requested": False}
