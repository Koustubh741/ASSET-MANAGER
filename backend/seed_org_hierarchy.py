import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import User
from app.services.user_service import get_password_hash
import uuid

async def seed_hierarchy():
    async with AsyncSessionLocal() as db:
        print("[INFO] Seeding organization hierarchy into PostgreSQL...")
        
        password = get_password_hash("password123")
        
        # Helper to get or create user
        async def get_or_create_user(email, **kwargs):
            existing = await db.execute(select(User).filter(User.email == email))
            u = existing.scalars().first()
            if u:
                print(f"[SKIP] User {email} already exists.")
                return u
            new_user = User(email=email, id=uuid.uuid4(), **kwargs)
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            print(f"[OK] Created User: {new_user.full_name} ({email})")
            return new_user

        # 1. CEO
        ceo = await get_or_create_user(
            email="ceo@enterprise.com",
            full_name="Alexander Pierce",
            password_hash=password,
            role="ADMIN",
            status="ACTIVE",
            position="CEO",
            department="Executive",
            domain="ADMINISTRATION",
            manager_id=None
        )

        # 2. Level 1 - C-Suite
        cto = await get_or_create_user(
            email="cto@enterprise.com",
            full_name="Sarah Chen",
            password_hash=password,
            role="MANAGER",
            status="ACTIVE",
            position="CTO",
            department="Technology",
            domain="DATA_AI",
            manager_id=ceo.id
        )
        coo = await get_or_create_user(
            email="coo@enterprise.com",
            full_name="Jessica Pearson",
            password_hash=password,
            role="MANAGER",
            status="ACTIVE",
            position="COO",
            department="Operations",
            domain="MANAGEMENT",
            manager_id=ceo.id
        )

        # 3. Level 2 - Managers
        eng_mgr = await get_or_create_user(
            email="eng_mgr@enterprise.com",
            full_name="Mike Ross",
            password_hash=password,
            role="MANAGER",
            status="ACTIVE",
            position="Engineering Manager",
            department="Technology",
            domain="DEVELOPMENT",
            manager_id=cto.id
        )
        devops_lead = await get_or_create_user(
            email="devops@enterprise.com",
            full_name="Harvey Specter",
            password_hash=password,
            role="MANAGER",
            status="ACTIVE",
            position="DevOps Lead",
            department="Technology",
            domain="CLOUD",
            manager_id=cto.id
        )
        finance_mgr = await get_or_create_user(
            email="finance_mgr@enterprise.com",
            full_name="Louis Litt",
            password_hash=password,
            role="MANAGER",
            status="ACTIVE",
            position="Finance Manager",
            department="Operations",
            domain="FINANCE",
            manager_id=coo.id
        )
        it_mgr = await get_or_create_user(
            email="it_mgr@enterprise.com",
            full_name="Donna Paulsen",
            password_hash=password,
            role="MANAGER",
            status="ACTIVE",
            position="IT Manager",
            department="Technology",
            domain="SECURITY",
            manager_id=cto.id
        )

        # 4. Level 3 - Individual Contributors
        staff_data = [
            {"email": "dev1@enterprise.com", "full_name": "Rachel Zane", "role": "END_USER", "status": "ACTIVE", "position": "Senior Developer", "department": "Technology", "domain": "DEVELOPMENT", "manager_id": eng_mgr.id},
            {"email": "dev2@enterprise.com", "full_name": "Harold Gunderson", "role": "END_USER", "status": "ACTIVE", "position": "Frontend Developer", "department": "Technology", "domain": "DEVELOPMENT", "manager_id": eng_mgr.id},
            {"email": "it1@enterprise.com", "full_name": "Katrina Bennett", "role": "END_USER", "status": "ACTIVE", "position": "IT Specialist", "department": "Technology", "domain": "SECURITY", "manager_id": it_mgr.id},
            {"email": "it2@enterprise.com", "full_name": "Gretchen Bodinski", "role": "END_USER", "status": "ACTIVE", "position": "Support Engineer", "department": "Technology", "domain": "SECURITY", "manager_id": it_mgr.id},
        ]
        
        for s in staff_data:
            await get_or_create_user(password_hash=password, **s)

        print("\n[SUCCESS] Organization hierarchy sync complete!")

if __name__ == "__main__":
    asyncio.run(seed_hierarchy())
