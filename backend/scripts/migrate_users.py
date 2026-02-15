
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Database URL from .env
DB_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def migrate_column(engine, sql):
    async with engine.connect() as conn:
        try:
            await conn.execute(text(sql))
            await conn.commit()
            print(f"Executed: {sql}")
        except Exception as e:
            await conn.rollback()
            print(f"Skipped/Error: {sql} - {e}")

async def migrate():
    print(f"Connecting to {DB_URL}...")
    engine = create_async_engine(DB_URL)
    
    # 1. Add sso_provider
    await migrate_column(engine, "ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50);")
    
    # 2. Add sso_id
    await migrate_column(engine, "ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS sso_id VARCHAR(255);")
    
    # 3. Create index for sso_id
    await migrate_column(engine, "CREATE INDEX IF NOT EXISTS ix_auth_users_sso_id ON auth.users (sso_id);")
    
    # 4. Add company
    await migrate_column(engine, "ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS company VARCHAR(255);")
    
    print("Migration check complete.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
