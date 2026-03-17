import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import Asset, AssetRelationship
from sqlalchemy import select

async def list_rels():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AssetRelationship))
        rels = result.scalars().all()
        print(f"[*] Found {len(rels)} relationships total:")
        for rel in rels:
            src_res = await db.execute(select(Asset).where(Asset.id == rel.source_asset_id))
            tgt_res = await db.execute(select(Asset).where(Asset.id == rel.target_asset_id))
            src = src_res.scalars().first()
            tgt = tgt_res.scalars().first()
            src_name = src.name if src else "Unknown"
            tgt_name = tgt.name if tgt else "Unknown"
            print(f"  - {src_name} --({rel.relationship_type})--> {tgt_name}")
            print(f"    Desc: {rel.description}")

if __name__ == "__main__":
    asyncio.run(list_rels())
