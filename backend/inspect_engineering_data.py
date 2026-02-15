import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User, AssetRequest, Ticket
from sqlalchemy.future import select

async def inspect_data():
    async with AsyncSessionLocal() as session:
        # 1. Query users in Engineering
        print("\n--- Users in Engineering ---")
        result = await session.execute(select(User).filter(User.department.ilike("%Engineering%")))
        users = result.scalars().all()
        for u in users:
            print(f"ID: {u.id}, Name: {u.full_name}, Role: {u.role}, Position: {u.position}, Dept: {u.department}, Domain: {u.domain}, Status: {u.status}")
        
        user_ids = [u.id for u in users]
        
        # 2. Query requests from these users
        print("\n--- Requests from Engineering Users ---")
        if user_ids:
            result = await session.execute(select(AssetRequest).filter(AssetRequest.requester_id.in_(user_ids)))
            requests = result.scalars().all()
            for r in requests:
                print(f"ID: {r.id}, RequesterID: {r.requester_id}, Asset: {r.asset_name}, Status: {r.status}")
        else:
            print("No users found in Engineering.")

        # 3. Query tickets from these users
        print("\n--- Tickets from Engineering Users ---")
        if user_ids:
            result = await session.execute(select(Ticket).filter(Ticket.requestor_id.in_(user_ids)))
            tickets = result.scalars().all()
            for t in tickets:
                print(f"ID: {t.id}, RequestorID: {t.requestor_id}, Subject: {t.subject}, Status: {t.status}")
        else:
            print("No users found in Engineering.")

if __name__ == "__main__":
    asyncio.run(inspect_data())
