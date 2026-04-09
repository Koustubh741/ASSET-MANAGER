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
    
    for i, user_data in enumerate(payload.users):
        # Find user by email (case-insensitive)
        result = await db.execute(select(User).filter(User.email.ilike(user_data.email)))
        db_user = result.scalars().first()
        
        if db_user:
            # Update existing user
            logger.info(f"Updating user {user_data.email} via AD Sync")
            db_user.full_name = user_data.full_name
            # Phase 5.3: sync both legacy string and FK
            if user_data.department:
                from ..models.models import Department
                from sqlalchemy import select
                dept_res = await db.execute(select(Department).filter(Department.name.ilike(user_data.department)))
                dept_obj = dept_res.scalars().first()
                db_user.department_id = dept_obj.id if dept_obj else db_user.department_id
            db_user.role = user_data.role or db_user.role
            db_user.position = user_data.position or db_user.position
            db_user.location = user_data.location or db_user.location
            db_user.status = user_data.status or db_user.status
            db_user.updated_at = datetime.now()
            updated_count += 1
        else:
            # Create new user
            logger.info(f"Creating new user {user_data.email} via AD Sync")
            # Phase 5.3: resolve department string to FK
            dept_id = None
            dept_name = user_data.department
            if user_data.department:
                from ..models.models import Department
                from sqlalchemy import select as _select
                dept_res = await db.execute(_select(Department).filter(Department.name.ilike(user_data.department)))
                dept_obj = dept_res.scalars().first()
                if dept_obj:
                    dept_id = dept_obj.id
                    dept_name = dept_obj.name
            db_user = User(
                id=uuid.uuid4(),
                email=user_data.email.lower(),
                full_name=user_data.full_name,
                password_hash=get_password_hash(str(uuid.uuid4())), # Random secure password
                department_id=dept_id,
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
