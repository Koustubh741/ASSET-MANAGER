
import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from app.database.database import Base
from app.models.models import Asset, PurchaseOrder, User, FinanceRecord

# Database URL - adjust if needed
DATABASE_URL = "sqlite+aiosqlite:///./asset_management.db"

async def check_db():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
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
        
        segments = {}
        for a in assets:
            segments[a.segment] = segments.get(a.segment, 0) + 1
        print(f"Asset Segments: {segments}")
        
        purchase_dates = len([a for a in assets if a.purchase_date])
        print(f"Assets with purchase_date: {purchase_dates}")
        
        # Check Purchase Orders
        result = await session.execute(select(PurchaseOrder))
        pos = result.scalars().all()
        print(f"Total Purchase Orders: {len(pos)}")
        po_costs = [p.total_cost for p in pos if p.total_cost is not None]
        print(f"Total PO Cost: {sum(po_costs)}")
        
        po_statuses = {}
        for p in pos:
            po_statuses[p.status] = po_statuses.get(p.status, 0) + 1
        print(f"PO Statuses: {po_statuses}")
        
        # Check Users
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"Total Users: {len(users)}")
        for u in users:
            if u.role in ["ADMIN", "FINANCE"]:
                print(f"User: {u.email}, Role: {u.role}, Domain: {u.domain}, Dept: {u.department}")

if __name__ == "__main__":
    asyncio.run(check_db())
