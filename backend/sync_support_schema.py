import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Add backend to path to import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.database.database import DATABASE_URL
except ImportError:
    # Fallback if there's a problem with the app import
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/itsm")

async def sync():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        # Check and add subcategory
        try:
            await conn.execute(text("ALTER TABLE support.tickets ADD COLUMN subcategory VARCHAR(100);"))
            print("[OK] Added subcategory column to support.tickets")
        except Exception as e:
            print(f"[SKIP] subcategory column: {str(e)}")
        
        # Check and add target_department_id
        try:
            await conn.execute(text("ALTER TABLE support.tickets ADD COLUMN target_department_id UUID REFERENCES auth.departments(id);"))
            print("[OK] Added target_department_id column to support.tickets")
        except Exception as e:
            print(f"[SKIP] target_department_id column: {str(e)}")

        # Create comments table
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS support.ticket_comments (
                    id UUID PRIMARY KEY,
                    ticket_id UUID NOT NULL REFERENCES support.tickets(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
                    content TEXT NOT NULL,
                    is_internal BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("[OK] Created support.ticket_comments table")
        except Exception as e:
            print(f"[ERROR] ticket_comments table: {str(e)}")

        # Create attachments table
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS support.ticket_attachments (
                    id UUID PRIMARY KEY,
                    ticket_id UUID NOT NULL REFERENCES support.tickets(id) ON DELETE CASCADE,
                    uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    file_type VARCHAR(50),
                    file_size INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("[OK] Created support.ticket_attachments table")
        except Exception as e:
            print(f"[ERROR] ticket_attachments table: {str(e)}")

    await engine.dispose()
    print("Database synchronization complete.")

if __name__ == "__main__":
    asyncio.run(sync())
