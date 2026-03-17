"""
Fix misaligned procurement/finance status fields in asset_requests.
Identified patterns:
  1. status=PROCUREMENT_REQUESTED but pf_status=PO_UPLOADED -> advance to PO_UPLOADED
  2. status=PO_UPLOADED but pf_status=None -> set pf_status=PO_UPLOADED
  3. status=PROCUREMENT_REQUESTED but pf_status=DELIVERED -> these were delivered; advance to QC_PENDING
"""
import asyncio, sys
from datetime import datetime
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv()
from app.database.database import AsyncSessionLocal
from app.models.models import AssetRequest
from sqlalchemy.future import select

async def fix():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(AssetRequest))
        all_reqs = r.scalars().all()
        
        fixed = []
        for req in all_reqs:
            changed = False
            
            # Pattern 1: PROCUREMENT_REQUESTED with PO_UPLOADED pf_status
            if req.status == 'PROCUREMENT_REQUESTED' and req.procurement_finance_status == 'PO_UPLOADED':
                print(f"  [FIX-1] {str(req.id)[:8]}: PROCUREMENT_REQUESTED+PO_UPLOADED -> PO_UPLOADED+PO_UPLOADED")
                req.status = 'PO_UPLOADED'
                req.updated_at = datetime.now()
                changed = True
            
            # Pattern 2: PO_UPLOADED with null pf_status
            elif req.status == 'PO_UPLOADED' and req.procurement_finance_status is None:
                print(f"  [FIX-2] {str(req.id)[:8]}: PO_UPLOADED+None -> PO_UPLOADED+PO_UPLOADED")
                req.procurement_finance_status = 'PO_UPLOADED'
                req.updated_at = datetime.now()
                changed = True
            
            # Pattern 3: PROCUREMENT_REQUESTED with DELIVERED pf_status (old test data that skipped steps)
            elif req.status == 'PROCUREMENT_REQUESTED' and req.procurement_finance_status == 'DELIVERED':
                print(f"  [FIX-3] {str(req.id)[:8]}: PROCUREMENT_REQUESTED+DELIVERED -> QC_PENDING+DELIVERED")
                req.status = 'QC_PENDING'
                req.updated_at = datetime.now()
                changed = True
            
            if changed:
                fixed.append(req.id)
        
        if fixed:
            await db.commit()
            print(f"\nFixed {len(fixed)} records.")
        else:
            print("No records needed fixing.")

asyncio.run(fix())
