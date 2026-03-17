
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
        # Check POs
        result = await session.execute(select(PurchaseOrder))
        pos = result.scalars().all()
        print(f"Total Purchase Orders: {len(pos)}")
        for po in pos:
            print(f"PO ID: {po.id}, Vendor: {po.vendor_name}, Total Cost: {po.total_cost}, Status: {po.status}")
        
        po_costs = [p.total_cost for p in pos if p.total_cost is not None]
        print(f"Total PO Cost Sum: {sum(po_costs) if po_costs else 0}")

if __name__ == "__main__":
    asyncio.run(check_db())
