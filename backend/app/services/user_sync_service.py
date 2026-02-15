from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..schemas.discovery_schema import UserSyncPayload
from .user_service import get_password_hash
import uuid
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def sync_ad_users(db: AsyncSession, payload: UserSyncPayload) -> dict:
    """
    Synchronize users from AD/LDAP payload.
    Provides bulk upsert capabilities for directory synchronization.
    """
    from ..models.models import User, AuditLog
    
    created_count = 0
    updated_count = 0
    
    for user_data in payload.users:
        # Find user by email (case-insensitive)
        result = await db.execute(select(User).filter(User.email.ilike(user_data.email)))
        db_user = result.scalars().first()
        
        if db_user:
            # Update existing user
            logger.info(f"Updating user {user_data.email} via AD Sync")
            db_user.full_name = user_data.full_name
            db_user.department = user_data.department or db_user.department
            db_user.role = user_data.role or db_user.role
            db_user.position = user_data.position or db_user.position
            db_user.location = user_data.location or db_user.location
            db_user.status = user_data.status or db_user.status
            db_user.updated_at = datetime.now()
            updated_count += 1
        else:
            # Create new user
            logger.info(f"Creating new user {user_data.email} via AD Sync")
            db_user = User(
                id=uuid.uuid4(),
                email=user_data.email.lower(),
                full_name=user_data.full_name,
                password_hash=get_password_hash(str(uuid.uuid4())), # Random secure password
                department=user_data.department,
                role=user_data.role or "END_USER",
                position=user_data.position,
                location=user_data.location,
                status=user_data.status or "ACTIVE",
                created_at=datetime.now()
            )
            db.add(db_user)
            created_count += 1
            
    # Add Audit Log
    audit = AuditLog(
        id=uuid.uuid4(),
        action="directory_sync",
        entity_type="User",
        entity_id="BULK_SYNC",
        details={
            "agent_id": str(payload.agent_id),
            "source_domain": payload.source_domain,
            "created": created_count,
            "updated": updated_count
        }
    )
    db.add(audit)
    
    await db.commit()
    return {"created": created_count, "updated": updated_count}
