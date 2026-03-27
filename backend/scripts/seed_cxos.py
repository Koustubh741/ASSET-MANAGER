import asyncio
import uuid
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import AsyncSessionLocal
from app.models.models import User
from app.services.user_service import get_password_hash
from sqlalchemy.future import select

CXO_USERS = [
    {"email": "ceo@itsm.com", "full_name": "Executive CEO", "role": "ADMIN", "position": "MANAGER", "persona": "CEO", "department": "Executive", "domain": "ADMINISTRATION"},
    {"email": "cfo@itsm.com", "full_name": "Executive CFO", "role": "ADMIN", "position": "MANAGER", "persona": "CFO", "department": "Finance", "domain": "ADMINISTRATION"},
    {"email": "ciso@itsm.com", "full_name": "Executive CISO", "role": "IT_MANAGEMENT", "position": "MANAGER", "persona": "CISO", "department": "IT_Security", "domain": "SECURITY"}
]

async def seed():
    async with AsyncSessionLocal() as db:
        print("Starting CXO Seeding...")
        hashed_password = get_password_hash("password123")
        
        for u_info in CXO_USERS:
            res = await db.execute(select(User).filter(User.email == u_info["email"]))
            user = res.scalars().first()
            
            if not user:
                print(f"Creating CXO: {u_info['email']}")
                user = User(
                    id=uuid.uuid4(),
                    email=u_info["email"],
                    full_name=u_info["full_name"],
                    password_hash=hashed_password,
                    role=u_info["role"],
                    position=u_info["position"],
                    persona=u_info["persona"],
                    department=u_info.get("department"),
                    domain=u_info.get("domain"),
                    status="ACTIVE",
                    plan="ENTERPRISE"
                )
                db.add(user)
            else:
                print(f"CXO already exists: {u_info['email']}. Updating role/status/department.")
                user.role = u_info["role"]
                user.position = u_info["position"]
                user.department = u_info.get("department")
                user.domain = u_info.get("domain")
                user.status = "ACTIVE"
        
        await db.commit()
        print("CXO Seeding Complete.")

if __name__ == "__main__":
    asyncio.run(seed())
