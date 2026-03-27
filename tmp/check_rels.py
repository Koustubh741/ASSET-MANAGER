import asyncio
import asyncpg
import os

async def check_relationships():
    # Direct connection using asyncpg
    # Read from the .env details we found
    dsn = "postgresql://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"
    
    try:
        conn = await asyncpg.connect(dsn)
        print("Connected to database.")
        
        # Check if table exists
        exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'asset' 
                AND table_name = 'asset_relationships'
            );
        """)
        print(f"Asset Relationship table exists: {exists}")
        
        if exists:
            # Count relationships
            count = await conn.fetchval("SELECT count(*) FROM asset.asset_relationships")
            print(f"Total relationships: {count}")
            
            if count > 0:
                rows = await conn.fetch("SELECT * FROM asset.asset_relationships LIMIT 5")
                for row in rows:
                    print(dict(row))
            else:
                # Check for assets to see if we can create some
                assets = await conn.fetch("SELECT id, name, type FROM asset.assets WHERE type IN ('Server', 'Network', 'Database', 'Cloud') LIMIT 10")
                print(f"Found {len(assets)} infrastructure assets:")
                for a in assets:
                    print(dict(a))
        
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_relationships())
