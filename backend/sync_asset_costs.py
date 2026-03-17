
import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.database.database import get_db_context
from app.models.models import Asset, PurchaseOrder, AssetRequest

async def sync_costs():
    async with get_db_context() as session:
        print("Starting Asset Cost Sync...")
        
        # Method 1: Sync from PurchaseOrders (linked via asset_request_id)
        # We find assets that are linked to a request, and that request has a PO.
        # Asset has 'request_id' which links back to AssetRequest.id
        
        result = await session.execute(
            select(Asset, PurchaseOrder)
            .join(AssetRequest, Asset.request_id == AssetRequest.id)
            .join(PurchaseOrder, AssetRequest.id == PurchaseOrder.asset_request_id)
            .filter(Asset.cost == 0.0)
        )
        
        synced_count = 0
        for asset, po in result.all():
            if po.total_cost and po.total_cost > 0:
                print(f"Syncing Asset {asset.name} ({asset.id}) -> Cost: {po.total_cost} (from PO {po.id})")
                asset.cost = po.total_cost
                synced_count += 1
        
        # Method 2: Fallback to AssetRequest cost_estimate if no PO found but cost is still 0
        result_est = await session.execute(
            select(Asset, AssetRequest)
            .join(AssetRequest, Asset.request_id == AssetRequest.id)
            .filter(Asset.cost == 0.0)
        )
        
        for asset, req in result_est.all():
            if req.cost_estimate and req.cost_estimate > 0:
                # Only if still 0 (might have been updated by Method 1)
                if asset.cost == 0.0:
                    print(f"Syncing Asset {asset.name} ({asset.id}) -> Cost: {req.cost_estimate} (from Request Estimate)")
                    asset.cost = req.cost_estimate
                    synced_count += 1

        await session.commit()
        print(f"Sync complete. Updated {synced_count} assets.")

if __name__ == "__main__":
    asyncio.run(sync_costs())
