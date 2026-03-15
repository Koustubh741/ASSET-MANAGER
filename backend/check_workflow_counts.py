import asyncio
from sqlalchemy import select, func
from app.database.database import AsyncSessionLocal
from app.models.models import Asset, PurchaseOrder

async def check_counts():
    async with AsyncSessionLocal() as db:
        # Check POs
        res_po = await db.execute(select(func.count(PurchaseOrder.id)).where(PurchaseOrder.status.in_(["UPLOADED", "PENDING"])))
        po_count = res_po.scalar()
        print(f"PO Count (UPLOADED/PENDING): {po_count}")

        # Check Assets
        res_asset = await db.execute(select(func.count(Asset.id)).where(Asset.status.in_(["Retired", "Disposed"])))
        asset_count = res_asset.scalar()
        print(f"Asset Count (Retired/Disposed): {asset_count}")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(check_counts())
