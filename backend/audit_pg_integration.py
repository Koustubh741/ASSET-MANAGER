import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv('d:/ASSET-MANAGER/backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

async def audit():
    if not DATABASE_URL:
        print("DATABASE_URL not found in .env")
        return

    engine = create_async_engine(DATABASE_URL)
    
    async with engine.connect() as conn:
        print(f"Connected to: {DATABASE_URL.split('@')[-1]}")
        
        # 1. Check schemas
        result = await conn.execute(text("SELECT schema_name FROM information_schema.schemata"))
        schemas = [row[0] for row in result]
        print(f"Schemas found: {schemas}")
        
        # 2. Check for category_configs in support schema
        result = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'support' AND table_name = 'category_configs'
        """))
        table_exists = result.scalar()
        print(f"Table 'support.category_configs' exists: {bool(table_exists)}")
        
        if table_exists:
            # 3. Check for Category counts
            result = await conn.execute(text("SELECT count(*) FROM support.category_configs"))
            count = result.scalar()
            print(f"Total categories seeded: {count}")
            
            # 4. Sample check
            result = await conn.execute(text("SELECT name, color, icon_name FROM support.category_configs LIMIT 5"))
            rows = result.fetchall()
            print("Sample seed check:")
            for row in rows:
                print(f" - {row[0]} ({row[1]}, {row[2]})")
        
        # 5. Check Tickets
        result = await conn.execute(text("SELECT count(*) FROM support.tickets"))
        t_count = result.scalar()
        print(f"Total tickets in DB: {t_count}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(audit())
