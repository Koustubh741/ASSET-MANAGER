import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def fix_discovery_tables_schema():
    """Move discovery tables to system schema to match the models"""
    print("[*] Fixing discovery tables schema...\n")
    
    async with AsyncSessionLocal() as session:
        # Create system schema if it doesn't exist
        print("Creating system schema if needed...")
        await session.execute(text("CREATE SCHEMA IF NOT EXISTS system;"))
        
        # Drop public schema tables if they exist
        print("Dropping public schema tables...")
        await session.execute(text("DROP TABLE IF EXISTS public.discovery_diffs CASCADE;"))
        await session.execute(text("DROP TABLE IF EXISTS public.discovery_scans CASCADE;"))
        
        # Create discovery_scans table in system schema
        print("Creating system.discovery_scans table...")
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS system.discovery_scans (
                id UUID PRIMARY KEY,
                agent_id VARCHAR(255) NOT NULL,
                scan_type VARCHAR(50) DEFAULT 'local',
                status VARCHAR(50) DEFAULT 'STARTED',
                start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP WITH TIME ZONE,
                assets_processed INTEGER DEFAULT 0,
                errors TEXT,
                metadata_ JSONB
            );
        """))
        
        # Create discovery_diffs table in system schema
        print("Creating system.discovery_diffs table...")
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS system.discovery_diffs (
                id UUID PRIMARY KEY,
                scan_id UUID NOT NULL,
                asset_id UUID NOT NULL,
                field_name VARCHAR(255) NOT NULL,
                old_value TEXT,
                new_value TEXT,
                detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (scan_id) REFERENCES system.discovery_scans(id) ON DELETE CASCADE,
                FOREIGN KEY (asset_id) REFERENCES asset.assets(id) ON DELETE CASCADE
            );
        """))
        
        # Create indexes for better performance
        print("Creating indexes...")
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discovery_scans_agent 
            ON system.discovery_scans(agent_id);
        """))
        
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discovery_scans_start_time 
            ON system.discovery_scans(start_time DESC);
        """))
        
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discovery_diffs_scan 
            ON system.discovery_diffs(scan_id);
        """))
        
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discovery_diffs_asset 
            ON system.discovery_diffs(asset_id);
        """))
        
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discovery_diffs_detected_at 
            ON system.discovery_diffs(detected_at DESC);
        """))
        
        await session.commit()
        print("\n✅ Discovery tables created in system schema successfully!")
        
        # Verify
        result = await session.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'system' 
            AND table_name IN ('discovery_scans', 'discovery_diffs')
            ORDER BY table_name;
        """))
        tables = result.fetchall()
        print(f"\n✅ Verified: {len(tables)}/2 tables exist in system schema")
        for table in tables:
            print(f"   - system.{table[0]}")

if __name__ == "__main__":
    asyncio.run(fix_discovery_tables_schema())
