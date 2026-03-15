import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User, Asset, Ticket, AssetRequest
from sqlalchemy import select

async def audit_all_names():
    async with AsyncSessionLocal() as db:
        # 1. Registered Users
        res_u = await db.execute(select(User))
        users = res_u.scalars().all()
        user_names = {u.full_name for u in users}
        user_emails = {u.email for u in users}
        
        print("--- REGISTERED USERS ---")
        for u in sorted(users, key=lambda x: x.full_name):
            print(f"USER: {u.full_name} | {u.email} | {u.role} | {u.department}")

        # 2. Names in Assets
        res_a = await db.execute(select(Asset.assigned_to, Asset.assigned_to_name).distinct())
        assets = res_a.all()
        asset_names = set()
        for a in assets:
            if a.assigned_to: asset_names.add(a.assigned_to)
            if a.assigned_to_name: asset_names.add(a.assigned_to_name)
        
        # 3. Names in Tickets (requestor_id is a FK, but let's check if there are strings elsewhere)
        # (Assuming only FK is used for now based on model)

        print("\n--- UNREGISTERED NAMES (Found in Assets/Records) ---")
        unregistered = asset_names - user_names
        for name in sorted(unregistered):
            print(f"NAME: {name}")

if __name__ == "__main__":
    asyncio.run(audit_all_names())
