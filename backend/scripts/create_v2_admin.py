import asyncio
import os
import sys
import uuid

# Add backend and root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import User
from app.services.user_service import get_password_hash
from sqlalchemy import select

async def create_v2_admin():
    print("=== CREATING V2 RETAIL SYSTEM ADMIN ===")
    async with AsyncSessionLocal() as db:
        email = "v2admin@itsm.com"
        password = "V2Retail@2026"
        
        # Check if exists
        res = await db.execute(select(User).filter(User.email == email))
        existing = res.scalar_one_or_none()
        if existing:
            print(f"Admin {email} already exists. Updating role to ADMIN.")
            existing.role = "ADMIN"
            await db.commit()
            return

        admin = User(
            id=uuid.uuid4(),
            email=email,
            full_name="V2 Retail System Admin",
            password_hash=get_password_hash(password),
            role="ADMIN", # Setting as ADMIN to match v2retail_dept_sync.py checks
            position="Global Administrator",
            status="ACTIVE"
        )
        db.add(admin)
        await db.commit()
        print(f"SUCCESS: Created System Admin {email} with role ADMIN")

if __name__ == "__main__":
    asyncio.run(create_v2_admin())
