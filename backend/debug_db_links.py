
import asyncio
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import AsyncSessionLocal
from app.models.models import Asset, User, AssetRequest

async def debug_all():
    async with AsyncSessionLocal() as db:
        # Check users
        result = await db.execute(select(User))
        users = result.scalars().all()
        print("--- USERS ---")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Full Name: {u.full_name}")
            if u.full_name == 'Koustubh Sonekar':
                k_id = u.id
        
        # Check Asset Requests for Koustubh
        result = await db.execute(select(AssetRequest).filter(AssetRequest.requester_id == k_id))
        reqs = result.scalars().all()
        print(f"\n--- ASSET REQUESTS FOR KOUSTUBH ({k_id}) ---")
        for r in reqs:
            print(f"ID: {r.id}, Asset: {r.asset_name}, Status: {r.status}, Linked Asset ID: {r.asset_id}")
            if r.asset_id:
                # Check that specific asset
                a_result = await db.execute(select(Asset).filter(Asset.id == r.asset_id))
                a = a_result.scalars().first()
                if a:
                    print(f"  -> LINKED ASSET: Serial={a.serial_number}, Status={a.status}, AssignedTo='{a.assigned_to}'")
                else:
                    print(f"  -> LINKED ASSET NOT FOUND IN DB!")

if __name__ == "__main__":
    asyncio.run(debug_all())
