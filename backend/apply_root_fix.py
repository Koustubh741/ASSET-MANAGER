"""
CLI to run the root fix: sync Asset.assigned_to / assigned_to_id from AssetRequest requester.
Run from backend: python apply_root_fix.py
Or call POST /api/v1/asset-requests/apply-root-fix (Admin/Asset Manager).
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.database import AsyncSessionLocal
from app.services.asset_request_service import apply_root_fix as apply_root_fix_service


async def apply_root_fix():
    async with AsyncSessionLocal() as db:
        result = await apply_root_fix_service(db)
    print(f"Root Fix: {result['updated']} asset(s) updated.")
    if result["errors"]:
        for e in result["errors"]:
            print(f"  Error: {e}")
    else:
        print("Done.")


if __name__ == "__main__":
    asyncio.run(apply_root_fix())
