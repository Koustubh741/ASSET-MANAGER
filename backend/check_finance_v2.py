
import asyncio
import os
import sys

# Add the backend directory to sys.path so we can import 'app'
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database.database import get_db_context
from app.models.models import Asset, PurchaseOrder, User

async def check_db():
    async with get_db_context() as session:
        # Check Assets
        result = await session.execute(select(Asset))
        assets = result.scalars().all()
        print(f"Total Assets in DB: {len(assets)}")
        
        costs = [a.cost for a in assets if a.cost is not None]
        print(f"Assets with cost > 0: {len([c for c in costs if c > 0])}")
        print(f"Sum of costs: {sum(costs)}")
        
        statuses = {}
        for a in assets:
            statuses[a.status] = statuses.get(a.status, 0) + 1
        print(f"Asset Statuses: {statuses}")
        
        # Check Users and their roles/domains
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"\nUsers ({len(users)} total):")
        for u in users:
            print(f"User: {u.email}, Role: {u.role}, Domain: {u.domain}, Dept: {u.department}")
        
        # Check POs
        result = await session.execute(select(PurchaseOrder))
        pos = result.scalars().all()
        print(f"\nTotal Purchase Orders: {len(pos)}")

if __name__ == "__main__":
    asyncio.run(check_db())
