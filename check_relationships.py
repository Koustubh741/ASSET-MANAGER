import asyncio
import json
from sqlalchemy import select
from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import Asset, AssetRelationship

async def check_firewall_relationships():
    async with AsyncSessionLocal() as db:
        # Find the firewall
        res = await db.execute(select(Asset).filter(Asset.name == "Cache_Digitech_Primary"))
        firewall = res.scalars().first()
        
        if not firewall:
            print("Firewall 'Cache_Digitech_Primary' not found in DB.")
            return

        print(f"Firewall Found: {firewall.name} (ID: {firewall.id})")
        
        # Check relationships
        # 1. Incoming (devices hitting the firewall)
        res_in = await db.execute(
            select(AssetRelationship, Asset).join(Asset, AssetRelationship.source_asset_id == Asset.id).filter(
                AssetRelationship.target_asset_id == firewall.id
            )
        )
        incoming = res_in.all()
        
        # 2. Outgoing (devices the firewall is hitting)
        res_out = await db.execute(
            select(AssetRelationship, Asset).join(Asset, AssetRelationship.target_asset_id == Asset.id).filter(
                AssetRelationship.source_asset_id == firewall.id
            )
        )
        outgoing = res_out.all()

        print(f"\nIncoming Relationships (Devices connected TO firewall): {len(incoming)}")
        for rel, asset in incoming:
            print(f"  - {asset.name} ({asset.type}) via {rel.relationship_type}")

        print(f"\nOutgoing Relationships (Firewall connected TO devices): {len(outgoing)}")
        for rel, asset in outgoing:
            print(f"  - {asset.name} ({asset.type}) via {rel.relationship_type}")

if __name__ == "__main__":
    asyncio.run(check_firewall_relationships())
