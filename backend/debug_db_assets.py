
import asyncio
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import AsyncSessionLocal
from app.models.models import Asset, User

async def debug_assets():
    async with AsyncSessionLocal() as db:
        # Check users
        result = await db.execute(select(User))
        users = result.scalars().all()
        print("--- USERS ---")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Full Name: {u.full_name}")
        
        # Check all assets
        result = await db.execute(select(Asset))
        assets = result.scalars().all()
        print("\n--- ASSETS ---")
        for a in assets:
            print(f"ID: {a.id}, Name: {a.name}, Serial: {a.serial_number}, Status: {a.status}, Assigned To: {a.assigned_to}")
        
        # Check assets for 'Koustubh Sonekar'
        target_name = 'Koustubh Sonekar'
        result = await db.execute(select(Asset).filter(Asset.assigned_to == target_name))
        matched_assets = result.scalars().all()
        print(f"\n--- ASSETS ASSIGNED TO '{target_name}' ---")
        for a in matched_assets:
            print(f"ID: {a.id}, Name: {a.name}, Status: {a.status}")

if __name__ == "__main__":
    asyncio.run(debug_assets())
