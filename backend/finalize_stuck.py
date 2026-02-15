
import asyncio
from sqlalchemy.future import select
from app.database.database import AsyncSessionLocal
from app.models.models import Asset, AssetRequest

async def finalize_stuck_requests():
    async with AsyncSessionLocal() as db:
        # 1. Find requests in MANAGER_CONFIRMED_ASSIGNMENT that have an asset_id
        # These are the ones that should have been auto-fulfilled
        query = select(AssetRequest).filter(
            AssetRequest.status == "MANAGER_CONFIRMED_ASSIGNMENT",
            AssetRequest.asset_id.isnot(None)
        )
        result = await db.execute(query)
        stuck_requests = result.scalars().all()
        
        print(f"Finalizing {len(stuck_requests)} stuck requests...")
        
        from app.services.asset_service import finalize_asset_assignment
        
        for req in stuck_requests:
            print(f"  Processing Request {req.id} (Asset: {req.asset_id})")
            
            # Transition request to IN_USE
            req.status = "IN_USE"
            
            # Finalize the asset (ensure status is In Use, date is set, etc.)
            await finalize_asset_assignment(
                db=db,
                asset_id=req.asset_id,
                requester_id=req.requester_id,
                manager_id=req.requester_id,
                manager_name="System (Manual Backfill)"
            )
            
            print(f"    -> Status updated to IN_USE and Asset finalized.")

        await db.commit()
        print("\nBackfill complete!")

if __name__ == "__main__":
    asyncio.run(finalize_stuck_requests())
