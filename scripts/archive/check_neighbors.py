
import asyncio
import sys
import os
from sqlalchemy import select, or_, func

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import Asset, AssetRelationship

async def check_inventory():
    print("--- Inventory Check: Firewall & Neighbors ---")
    async with AsyncSessionLocal() as db:
        # 1. Find the Firewall by Serial or Name
        fw_result = await db.execute(
            select(Asset).where(
                or_(
                    Asset.serial_number == "FG200FT923905733",
                    Asset.name == "Cache_SNMP"
                )
            )
        )
        firewall = fw_result.scalars().first()
        
        if not firewall:
            print("[!] Firewall not found in Asset table.")
            # Let's list all networking assets to see what we have
            all_net_result = await db.execute(
                select(Asset).where(Asset.type == "Networking")
            )
            all_net = all_net_result.scalars().all()
            if all_net:
                print("\n[DEBUG] Found these Networking assets:")
                for n in all_net:
                    print(f"    - {n.name} (Serial: {n.serial_number}, Model: {n.model})")
            return

        print(f"[+] Firewall Found: {firewall.name} (ID: {firewall.id})")
        print(f"    Type: {firewall.type} | Vendor: {firewall.vendor} | Model: {firewall.model}")
        
        # 2. Find Relationships
        rel_stmt = select(AssetRelationship).where(
            or_(
                AssetRelationship.source_asset_id == firewall.id,
                AssetRelationship.target_asset_id == firewall.id
            )
        )
        rel_result = await db.execute(rel_stmt)
        relationships = rel_result.scalars().all()
        
        if not relationships:
            print("[-] No neighbor relationships found for this firewall.")
        else:
            print(f"[+] Found {len(relationships)} relationships:")
            for rel in relationships:
                # Find the 'other' side
                other_id = rel.target_asset_id if rel.source_asset_id == firewall.id else rel.source_asset_id
                other_result = await db.execute(select(Asset).where(Asset.id == other_id))
                other = other_result.scalars().first()
                other_name = other.name if other else "Unknown"
                print(f"    {'[SOURCE]' if rel.source_asset_id == firewall.id else '[TARGET]'} -> {other_name} ({rel.relationship_type}) - {rel.description}")

        # 3. Check for Stubs
        stub_result = await db.execute(
            select(Asset).where(Asset.model == "Neighbor Node")
        )
        stubs = stub_result.scalars().all()
        if stubs:
            print(f"\n[+] Found {len(stubs)} 'Neighbor Node' (Stub) assets:")
            for s in stubs:
                print(f"    - {s.name} (Serial: {s.serial_number})")
        else:
            print("\n[-] No 'Neighbor Node' assets found.")

if __name__ == "__main__":
    asyncio.run(check_inventory())
