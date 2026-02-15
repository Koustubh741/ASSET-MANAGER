import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def create_discovery_tables_sql():
    """Create discovery tables using direct SQL"""
    print("[*] Creating discovery tables using SQL...\n")
    
    async with AsyncSessionLocal() as session:
        # Create discovery_scans table
        print("Creating discovery_scans table...")
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS discovery_scans (
                id UUID PRIMARY KEY,
                agent_id VARCHAR(255) NOT NULL,
                scan_type VARCHAR(50) DEFAULT 'local',
                status VARCHAR(50) DEFAULT 'STARTED',
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP,
                assets_processed INTEGER DEFAULT 0,
                errors TEXT,
                metadata_ JSONB
            );
        """))
        
        # Create discovery_diffs table
        print("Creating discovery_diffs table...")
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS discovery_diffs (
                id UUID PRIMARY KEY,
                scan_id UUID NOT NULL,
                asset_id UUID NOT NULL,
                field_name VARCHAR(255) NOT NULL,
                old_value TEXT,
                new_value TEXT,
                detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (scan_id) REFERENCES discovery_scans(id) ON DELETE CASCADE,
                FOREIGN KEY (asset_id) REFERENCES asset.assets(id) ON DELETE CASCADE
            );
        """))
        
        # Create indexes for better performance
        print("Creating indexes...")
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discovery_scans_agent 
            ON discovery_scans(agent_id);
        """))
        
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discovery_scans_start_time 
            ON discovery_scans(start_time DESC);
        """))
        
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discovery_diffs_scan 
            ON discovery_diffs(scan_id);
        """))
        
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discovery_diffs_asset 
            ON discovery_diffs(asset_id);
        """))
        
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discovery_diffs_detected_at 
            ON discovery_diffs(detected_at DESC);
        """))
        
        await session.commit()
        print("\n✅ Discovery tables created successfully!")
        
        # Verify
        result = await session.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('discovery_scans', 'discovery_diffs')
            ORDER BY table_name;
        """))
        tables = result.fetchall()
        print(f"\n✅ Verified: {len(tables)}/2 tables exist")
        for table in tables:
            print(f"   - {table[0]}")

if __name__ == "__main__":
    asyncio.run(create_discovery_tables_sql())
