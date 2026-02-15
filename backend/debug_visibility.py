import asyncio
from app.database.database import get_db
from app.models.models import User, AssetRequest
from sqlalchemy.future import select

async def debug():
    print("--- User Data ---")
    async for db in get_db():
        # Check manager
        result = await db.execute(select(User).filter(User.email == 'manager@gmail.com'))
        m = result.scalars().first()
        if m:
            print(f"Manager: {m.email} | Position: {m.position} | Domain: [{m.domain}]")
        
        # Check domain alignment
        print("\n--- Domain Alignment (CYBER Check) ---")
        q = select(AssetRequest).join(User, AssetRequest.requester_id == User.id).filter(User.domain == 'cyber')
        res = await db.execute(q)
        reqs = res.scalars().all()
        print(f"Count for 'cyber' (lowercase): {len(reqs)}")

        q2 = select(AssetRequest).join(User, AssetRequest.requester_id == User.id).filter(User.domain == 'CYBER')
        res2 = await db.execute(q2)
        reqs2 = res2.scalars().all()
        print(f"Count for 'CYBER' (uppercase): {len(reqs2)}")
        
        break

if __name__ == "__main__":
    asyncio.run(debug())
