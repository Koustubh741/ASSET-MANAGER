import sys
import os
import asyncio
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Mocking app context
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.models.models import SystemPatch, Asset
from app.services.patch_service import evaluate_asset_risk
from app.services.patch_sync_service import sync_all_patch_feeds

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test_services():
    print("--- Service Layer Audit ---")
    async with AsyncSessionLocal() as db:
        # 1. Test Sync
        print("[*] Running Patch Sync Service...")
        await sync_all_patch_feeds()
        
        # Verify sync results
        res = await db.execute(select(SystemPatch).limit(5))
        patches = res.scalars().all()
        if patches:
            print(f"[+] Sync Successful: Found {len(patches)} enriched patches")
            for p in patches:
                print(f"  - {p.patch_id}: {p.title} (CVSS: {p.cvss_score})")
        else:
            print("[!] Sync failed or produced no results.")

        # 2. Test Risk Evaluator
        print("\n[*] Testing Risk Evaluator...")
        # Get a server and a critical patch
        asset_res = await db.execute(select(Asset).where(Asset.type.ilike('%server%')).limit(1))
        asset = asset_res.scalars().first()
        
        patch_res = await db.execute(select(SystemPatch).where(SystemPatch.severity == 'Critical').limit(1))
        patch = patch_res.scalars().first()
        
        if asset and patch:
            risk = await evaluate_asset_risk(db, patch.id, asset.id)
            print(f"[+] Asset: {asset.name} ({asset.type})")
            print(f"[+] Patch: {patch.title} (CVSS: {patch.cvss_score})")
            print(f"[+] Calculated Risk: {risk} (Expected >= 7.0 for critical patches on servers)")
        else:
            print("[!] Could not find suitable assets/patches for risk test.")

if __name__ == "__main__":
    asyncio.run(test_services())
