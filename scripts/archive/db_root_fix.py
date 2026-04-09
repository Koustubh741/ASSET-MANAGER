
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def root_fix():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Applying Schema Normalization...")
        
        # 1. Notifications Table
        print("Fixing system.notifications...")
        await conn.execute(text("ALTER TABLE system.notifications ADD COLUMN IF NOT EXISTS source VARCHAR(100)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_source ON system.notifications(source)"))
        
        # 2. Tickets Table
        print("Fixing support.tickets...")
        await conn.execute(text("ALTER TABLE support.tickets ADD COLUMN IF NOT EXISTS display_id VARCHAR(20)"))
        await conn.execute(text("ALTER TABLE support.tickets ADD COLUMN IF NOT EXISTS assignment_group_id UUID"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tickets_display_id ON support.tickets(display_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tickets_assignment_group_id ON support.tickets(assignment_group_id)"))
        
        # 3. Ensure Assignment Group Table exists (Safety)
        print("Ensuring support.assignment_groups is healthy...")
        await conn.execute(text("ALTER TABLE support.assignment_groups ADD COLUMN IF NOT EXISTS department VARCHAR(100)"))

        await conn.commit()
        print("Database Root Fix Applied Successfully.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(root_fix())
