
import asyncio
import os
import sys

sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, Asset, User, AssetRequest
from sqlalchemy import select

async def check_user_requests():
    async with AsyncSessionLocal() as db:
        # Get users with unlinked tickets from previous run
        emails = ["paras@cachedigitech.com", "endcloud@gmail.com", "finance_mgr@enterprise.com"]
        
        for email in emails:
            res_u = await db.execute(select(User).where(User.email == email))
            user = res_u.scalars().first()
            if not user: continue
            
            res_r = await db.execute(select(AssetRequest).where(AssetRequest.requester_id == user.id))
            requests = res_r.scalars().all()
            
            print(f"\nUser: {user.full_name} ({user.email})")
            print(f"  - Asset Requests: {[r.asset_name for r in requests]}")
            for r in requests:
                print(f"    - ID: {r.id} | Status: {r.status} | Asset ID: {r.asset_id}")

if __name__ == "__main__":
    asyncio.run(check_user_requests())
