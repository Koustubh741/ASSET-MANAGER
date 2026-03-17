import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal
import json

async def verify_discovery():
    async with AsyncSessionLocal() as session:
        print("\n--- Verifying Assets ---")
        # Check for assets with 'Discovered' status or from our agent
        result = await session.execute(text("SELECT id, name, serial_number, specifications FROM asset.assets WHERE status = 'Discovered' OR specifications->>'Agent ID' IS NOT NULL"))
        assets = result.fetchall()
        
        if not assets:
            print("❌ No discovered assets found.")
        else:
            print(f"✅ Found {len(assets)} discovered assets:")
            for asset in assets:
                print(f"  - [{asset.id}] {asset.name} (SN: {asset.serial_number})")
                specs = asset.specifications
                print(f"    Specs: CPU={specs.get('Processor')}, RAM={specs.get('RAM')}, OS={specs.get('OS')}")
                
                # Check software for this asset
                print(f"    --- Software Inventory for {asset.name} ---")
                sw_result = await session.execute(text(f"SELECT count(*) FROM asset.discovered_software WHERE asset_id = '{asset.id}'"))
                sw_count = sw_result.scalar()
                print(f"    ✅ Found {sw_count} software items.")
                
                if sw_count > 0:
                    sw_list = await session.execute(text(f"SELECT name, version FROM asset.discovered_software WHERE asset_id = '{asset.id}' LIMIT 5"))
                    for sw in sw_list:
                        print(f"      * {sw.name} ({sw.version})")

if __name__ == "__main__":
    asyncio.run(verify_discovery())
