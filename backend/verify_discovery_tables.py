import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def verify_discovery_tables():
    """Verify that discovery_scans and discovery_diffs tables exist and are properly configured"""
    print("[*] Verifying Discovery Intelligence Tables...\n")
    
    async with AsyncSessionLocal() as session:
        # Check if tables exist
        print("=== TABLE EXISTENCE ===")
        result = await session.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('discovery_scans', 'discovery_diffs')
            ORDER BY table_name;
        """))
        tables = result.fetchall()
        
        if len(tables) == 2:
            print("✅ Both tables exist:")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print(f"❌ Missing tables! Found {len(tables)}/2")
            return
        
        # Check discovery_scans structure
        print("\n=== DISCOVERY_SCANS STRUCTURE ===")
        result = await session.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'discovery_scans'
            ORDER BY ordinal_position;
        """))
        columns = result.fetchall()
        print(f"Columns ({len(columns)}):")
        for col in columns:
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")
        
        # Check discovery_diffs structure
        print("\n=== DISCOVERY_DIFFS STRUCTURE ===")
        result = await session.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'discovery_diffs'
            ORDER BY ordinal_position;
        """))
        columns = result.fetchall()
        print(f"Columns ({len(columns)}):")
        for col in columns:
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")
        
        # Check foreign key constraints
        print("\n=== FOREIGN KEY CONSTRAINTS ===")
        result = await session.execute(text("""
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('discovery_scans', 'discovery_diffs');
        """))
        constraints = result.fetchall()
        if constraints:
            for constraint in constraints:
                print(f"   - {constraint[1]}.{constraint[2]} -> {constraint[3]}.{constraint[4]}")
        else:
            print("   No foreign key constraints found")
        
        # Check data counts
        print("\n=== DATA COUNTS ===")
        result = await session.execute(text("SELECT COUNT(*) FROM discovery_scans"))
        scan_count = result.scalar()
        print(f"   - discovery_scans: {scan_count} records")
        
        result = await session.execute(text("SELECT COUNT(*) FROM discovery_diffs"))
        diff_count = result.scalar()
        print(f"   - discovery_diffs: {diff_count} records")
        
        # Show sample data if exists
        if scan_count > 0:
            print("\n=== SAMPLE SCAN DATA ===")
            result = await session.execute(text("""
                SELECT id, agent_id, scan_type, status, start_time, assets_processed
                FROM discovery_scans
                ORDER BY start_time DESC
                LIMIT 3
            """))
            scans = result.fetchall()
            for scan in scans:
                print(f"   - {scan[0][:8]}... | Agent: {scan[1]} | Type: {scan[2]} | Status: {scan[3]} | Assets: {scan[5]}")
        
        if diff_count > 0:
            print("\n=== SAMPLE DIFF DATA ===")
            result = await session.execute(text("""
                SELECT d.field_name, d.old_value, d.new_value, d.detected_at, a.name
                FROM discovery_diffs d
                JOIN asset.assets a ON d.asset_id = a.id
                ORDER BY d.detected_at DESC
                LIMIT 5
            """))
            diffs = result.fetchall()
            for diff in diffs:
                print(f"   - {diff[4]}: {diff[0]} changed from '{diff[1]}' to '{diff[2]}'")
        
        print("\n✅ Database verification complete!")

if __name__ == "__main__":
    asyncio.run(verify_discovery_tables())
