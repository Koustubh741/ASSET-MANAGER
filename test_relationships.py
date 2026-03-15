import asyncio
import uuid
from backend.app.database.database import AsyncSessionLocal
from backend.app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS
from backend.app.services.discovery_service import process_discovery_payload
from backend.app.models.models import Asset, AssetRelationship
from sqlalchemy import select

async def test_relationship_discovery():
    async with AsyncSessionLocal() as db:
        # 1. Create a dummy target asset
        target_serial = "TARGET-RELATIONSHIP-001"
        target_name = "Core-Switch-01"
        
        # Check if already exists
        res = await db.execute(select(Asset).filter(Asset.serial_number == target_serial))
        target = res.scalars().first()
        if not target:
            target = Asset(
                id=uuid.uuid4(),
                name=target_name,
                type="Switch",
                model="Catalyst 9300",
                vendor="Cisco",
                serial_number=target_serial,
                status="Active"
            )
            db.add(target)
            await db.commit()
            print(f"Created target asset: {target_name}")
        else:
            print(f"Target asset {target_name} already exists")

        # 2. Process payload for source asset with this neighbor
        source_serial = "SOURCE-FIREWALL-001"
        payload = DiscoveryPayload(
            agent_id=uuid.uuid4(),
            hostname="FortiGate-Primary",
            ip_address="192.168.1.1",
            hardware=DiscoveryHardware(
                cpu="Quad-Core",
                ram_mb=8192,
                serial=source_serial,
                model="FG-200F",
                vendor="Fortinet",
                type="Firewall"
            ),
            os=DiscoveryOS(
                name="FortiOS",
                version="7.2.1",
                uptime_sec=3600
            ),
            neighbors=[
                {"neighbor_name": "Core-Switch-01", "neighbor_port": "port1"}
            ]
        )
        
        print("Processing payload with neighbors...")
        source_asset = await process_discovery_payload(db, payload)
        
        # 3. Verify relationship creation
        rel_res = await db.execute(
            select(AssetRelationship).filter(
                AssetRelationship.source_asset_id == source_asset.id
            )
        )
        relationships = rel_res.scalars().all()
        
        print(f"Found {len(relationships)} relationships for {source_asset.name}:")
        for rel in relationships:
            print(f"  -> {rel.relationship_type} to target_id={rel.target_asset_id}")
            if rel.target_asset_id == target.id:
                print("  ✅ SUCCESS: Relationship correctly linked to Core-Switch-01")

if __name__ == "__main__":
    asyncio.run(test_relationship_discovery())
