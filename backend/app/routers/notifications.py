from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Dict, Any, AsyncGenerator
import asyncio
import json
from datetime import datetime
from fastapi.responses import StreamingResponse

from ..database.database import get_db
from ..models.models import Notification, NotificationType
from ..routers.auth import get_current_user

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)

# In-memory bus for real-time SSE delivery
class NotificationBus:
    def __init__(self):
        self.queues: List[asyncio.Queue] = []

    async def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self.queues.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        if queue in self.queues:
            self.queues.remove(queue)

    async def publish(self, notification_data: Dict[str, Any]):
        """Broadcast notification to all active subscribers in parallel"""
        if not self.queues:
            return
            
        # Create tasks for all queues to prevent blocking
        tasks = []
        for queue in self.queues:
            tasks.append(asyncio.create_task(queue.put(notification_data)))
        
        # We don't necessarily need to wait for all puts to finish,
        # but we should ensure they are scheduled.
        if tasks:
            await asyncio.wait(tasks, timeout=2.0)

notification_bus = NotificationBus()

@router.get("")
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    limit: int = 20
):
    """Fetch recent notifications for the logged-in user or global ones"""
    # RBAC Filtering for Global Notifications
    if current_user.role == "END_USER":
        global_condition = (Notification.user_id == None) & (Notification.type == "system")
    elif current_user.role == "MANAGER":
        global_condition = (Notification.user_id == None) & (Notification.type.in_(["system", "procurement", "workflow"]))
    else:  # ADMIN, SUPPORT
        global_condition = (Notification.user_id == None)

    stmt = select(Notification).where(
        (Notification.user_id == current_user.id) | global_condition
    ).order_by(Notification.created_at.desc()).limit(limit)
    
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    return notifications
 
@router.patch("/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Mark all notifications for the current user as read"""
    # RBAC Filtering for Global Notifications
    if current_user.role == "END_USER":
        global_condition = (Notification.user_id == None) & (Notification.type == "system")
    elif current_user.role == "MANAGER":
        global_condition = (Notification.user_id == None) & (Notification.type.in_(["system", "procurement", "workflow"]))
    else:
        global_condition = (Notification.user_id == None)

    stmt = update(Notification).where(
        (Notification.user_id == current_user.id) | global_condition,
        Notification.is_read == False
    ).values(is_read=True, read_at=datetime.utcnow())
    
    await db.execute(stmt)
    await db.commit()
    
    # Broadcast refresh to all other tabs/components
    await notification_bus.publish({"type": "REFRESH_BADGE", "user_id": str(current_user.id)})
    
    return {"status": "success", "message": "All notifications marked as read"}

@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Mark a specific notification as read"""
    stmt = update(Notification).where(
        Notification.id == notification_id,
        (Notification.user_id == current_user.id) | (Notification.user_id == None)
    ).values(is_read=True, read_at=datetime.utcnow())
    
    await db.execute(stmt)
    await db.commit()
    
    # Broadcast refresh to sync badge counts
    await notification_bus.publish({"type": "REFRESH_BADGE", "user_id": str(current_user.id)})
    
    return {"status": "success"}

@router.get("/stream")
async def stream_notifications(
    request: Request,
    current_user = Depends(get_current_user)
):
    """
    Real-time Server-Sent Events (SSE) stream for notifications.

    ROOT FIX: Added 25-second keepalive heartbeat. Without this, proxies and browsers
    silently close idle SSE connections after ~30-60s of no data, causing constant
    onerror/reconnect cycles on the frontend. Also fixed escaped newline bug.
    """
    async def event_generator():
        queue = await notification_bus.subscribe()
        # Send initial connection confirmation
        yield "event: connected\ndata: {\"status\": \"ok\"}\n\n"
        try:
            while True:
                # Check for client disconnect
                if await request.is_disconnected():
                    break

                try:
                    # Wait up to 25s for a notification.
                    # If nothing arrives, send a keepalive comment to reset
                    # proxy/browser idle timers and prevent silent drops.
                    notification = await asyncio.wait_for(queue.get(), timeout=25.0)

                    # Filter by user if applicable
                    target_user = notification.get("user_id")
                    if target_user and str(target_user) != str(current_user.id):
                        continue

                    # RBAC Filtering for Global Notifications
                    if not target_user:
                        notif_type = notification.get("type", "")
                        if current_user.role == "END_USER" and notif_type != "system":
                            continue
                        if current_user.role == "MANAGER" and notif_type not in ["system", "procurement", "workflow"]:
                            continue

                    # Format as SSE event
                    data = json.dumps(notification, default=str)
                    yield f"event: notification\ndata: {data}\n\n"

                except asyncio.TimeoutError:
                    # SSE comment — browsers ignore it but it resets CDN/proxy idle timers
                    yield ": keepalive\n\n"

        finally:
            notification_bus.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",        # Disable nginx buffering
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        }
    )

# Utility function to be used by other services (like discovery_service)
async def create_notification(
    db: AsyncSession,
    title: str,
    message: str,
    notification_type: str = "system",
    user_id: str = None,
    link: str = None,
    source: str = None
):
    new_notif = Notification(
        title=title,
        message=message,
        type=notification_type,
        user_id=user_id,
        link=link,
        source=source
    )
    db.add(new_notif)
    await db.flush() # Get the generated ID
    
    # Prepare data for SSE
    notif_data = {
        "id": str(new_notif.id),
        "title": title,
        "message": message,
        "type": notification_type,
        "user_id": str(user_id) if user_id else None,
        "link": link,
        "source": source,
        "created_at": str(datetime.utcnow())
    }
    
    # Broadcast to live subscribers
    await notification_bus.publish(notif_data)
    return new_notif
