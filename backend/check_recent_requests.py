import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import AssetRequest, User
from sqlalchemy.future import select

async def check_requests():
    async with AsyncSessionLocal() as session:
        # Get recent requests
        result = await session.execute(select(AssetRequest).order_by(AssetRequest.createdAt.desc()).limit(5))
        requests = result.scalars().all()
        print("Recent Asset Requests:")
        for r in requests:
            # Get user info
            user_res = await session.execute(select(User).filter(User.id == r.requester_id))
            u = user_res.scalars().first()
            dept = u.department if u else "Unknown"
            domain = u.domain if u else "Unknown"
            print(f"ID: {r.id} | Status: {r.status} | Requester: {u.full_name if u else 'N/A'} | Dept: {dept} | Domain: {domain}")

if __name__ == "__main__":
    asyncio.run(check_requests())
