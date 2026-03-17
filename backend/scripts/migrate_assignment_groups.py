import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def apply_migrations():
    async with AsyncSessionLocal() as db:
        print("[INFO] Applying direct SQL migrations for Assignment Groups and Tasks...")
        
        # 1. Create assignment_groups table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS support.assignment_groups (
                id UUID PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                department VARCHAR(100),
                description TEXT,
                manager_id UUID REFERENCES auth.users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # 2. Create assignment_group_members table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS support.assignment_group_members (
                id UUID PRIMARY KEY,
                group_id UUID NOT NULL REFERENCES support.assignment_groups(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                UNIQUE(group_id, user_id)
            )
        """))
        
        # 3. Create tasks table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS support.tasks (
                id UUID PRIMARY KEY,
                ticket_id UUID NOT NULL REFERENCES support.tickets(id) ON DELETE CASCADE,
                subject VARCHAR(255) NOT NULL,
                description TEXT,
                assigned_to_id UUID REFERENCES auth.users(id),
                group_id UUID REFERENCES support.assignment_groups(id),
                status VARCHAR(50) DEFAULT 'Open',
                priority VARCHAR(20) DEFAULT 'Medium',
                due_date TIMESTAMP WITH TIME ZONE,
                completed_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # 4. Add assignment_group_id to tickets
        try:
            await db.execute(text("""
                ALTER TABLE support.tickets 
                ADD COLUMN IF NOT EXISTS assignment_group_id UUID REFERENCES support.assignment_groups(id)
            """))
        except Exception as e:
            print(f"[WARN] Could not add assignment_group_id (might already exist): {e}")

        await db.commit()
        print("[SUCCESS] Database schema updated.")

if __name__ == "__main__":
    asyncio.run(apply_migrations())
