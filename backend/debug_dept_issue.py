import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import AssetRequest, User
from sqlalchemy.future import select
from sqlalchemy import func

async def debug_info():
    async with AsyncSessionLocal() as session:
        # 1. List unique departments
        dept_result = await session.execute(select(User.department).distinct())
        depts = dept_result.scalars().all()
        print(f"Unique Departments in User table: {depts}")
        
        # 2. List unique domains
        domain_result = await session.execute(select(User.domain).distinct())
        domains = domain_result.scalars().all()
        print(f"Unique Domains in User table: {domains}")

        # 3. Get recent requests (using created_at)
        result = await session.execute(select(AssetRequest).order_by(AssetRequest.created_at.desc()).limit(10))
        requests = result.scalars().all()
        print("\nRecent Asset Requests:")
        for r in requests:
            # Get user info
            user_res = await session.execute(select(User).filter(User.id == r.requester_id))
            u = user_res.scalars().first()
            dept = u.department if u else "Unknown"
            domain = u.domain if u else "Unknown"
            print(f"ID: {r.id} | Status: {r.status} | Requester: {u.full_name if u else 'N/A'} (Dept: {dept}, Domain: {domain})")

if __name__ == "__main__":
    asyncio.run(debug_info())
