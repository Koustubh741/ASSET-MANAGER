import asyncio
import asyncpg
import os
import uuid
from datetime import datetime, timezone

async def seed_relationships():
    dsn = "postgresql://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"
    
    try:
        conn = await asyncpg.connect(dsn)
        print("Connected to database.")
        
        # 1. Get some assets to link
        assets = await conn.fetch("""
            SELECT id, name, type 
            FROM asset.assets 
            WHERE type IN ('Server', 'Database', 'Network', 'Cloud')
            AND status NOT IN ('Retired', 'Disposed')
            LIMIT 50
        """)
        
        if len(assets) < 2:
            print("Not enough assets to create relationships.")
            await conn.close()
            return

        print(f"Found {len(assets)} assets to link.")
        
        # Categorize
        servers = [a for a in assets if a['type'] == 'Server']
        databases = [a for a in assets if a['type'] == 'Database']
        networks = [a for a in assets if a['type'] == 'Network']
        clouds = [a for a in assets if a['type'] == 'Cloud']
        
        new_rels = []
        
        # 1. App Servers depend on Databases
        for s in servers[:5]:
            for d in databases[:2]:
                new_rels.append({
                    "source_asset_id": s['id'],
                    "target_asset_id": d['id'],
                    "relationship_type": "depends_on",
                    "description": f"Application logic on {s['name']} requires {d['name']}",
                    "criticality": 5.0
                })
        
        # 2. Servers connected to Network Switches
        for s in servers:
            for n in networks[:1]:
                new_rels.append({
                    "source_asset_id": s['id'],
                    "target_asset_id": n['id'],
                    "relationship_type": "connected_to",
                    "description": f"Physical uplink from {s['name']} to {n['name']}",
                    "criticality": 4.0
                })
        
        # 3. Databases connected to Network
        for d in databases:
            for n in networks[:1]:
                new_rels.append({
                    "source_asset_id": d['id'],
                    "target_asset_id": n['id'],
                    "relationship_type": "connected_to",
                    "description": f"Database traffic via core switch {n['name']}",
                    "criticality": 4.0
                })

        print(f"Checking {len(new_rels)} potential relationships...")
        
        count_added = 0
        # Insert using check-before-insert pattern
        for rel in new_rels:
            exists = await conn.fetchval("""
                SELECT 1 FROM asset.asset_relationships 
                WHERE source_asset_id = $1 AND target_asset_id = $2 AND relationship_type = $3
            """, rel['source_asset_id'], rel['target_asset_id'], rel['relationship_type'])
            
            if not exists:
                await conn.execute("""
                    INSERT INTO asset.asset_relationships 
                    (id, source_asset_id, target_asset_id, relationship_type, description, criticality, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, uuid.uuid4(), rel['source_asset_id'], rel['target_asset_id'], 
                   rel['relationship_type'], rel['description'], rel['criticality'],
                   datetime.now(timezone.utc), datetime.now(timezone.utc))
                count_added += 1

        print(f"Seeding complete. Added {count_added} new relationships.")
        await conn.close()
    except Exception as e:
        print(f"Error during seeding: {e}")

if __name__ == "__main__":
    asyncio.run(seed_relationships())
