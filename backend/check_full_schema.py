import asyncio
import uuid
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def check_schema():
    async with AsyncSessionLocal() as session:
        # Check schemas
        print("--- SCHEMAS ---")
        result = await session.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog');"))
        schemas = [row[0] for row in result.fetchall()]
        print(f"Schemas found: {schemas}")
        
        # Check columns in auth.users
        print("\n--- auth.users columns ---")
        result = await session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='auth' AND table_name='users';"))
        for row in result.fetchall():
            print(f"  {row[0]}: {row[1]}")
            
        # Check if sso_provider exists
        result = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='users' AND column_name='sso_provider';"))
        if not result.fetchone():
            print("\n[!] MISSING: auth.users.sso_provider")
        else:
            print("\n[OK] auth.users.sso_provider exists")

        # Check Asset table
        print("\n--- asset.assets columns ---")
        result = await session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='asset' AND table_name='assets' AND column_name='id';"))
        row = result.fetchone()
        if row:
            print(f"  ID data type: {row[1]}")
        else:
            print("  [!] asset.assets table or ID column not found in 'asset' schema")

if __name__ == "__main__":
    asyncio.run(check_schema())
