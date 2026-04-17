import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal, async_engine

async def add_indices():
    """
    ROOT FIX: Performance Hardening.
    Adds critical indices to handle hierarchical joins and status filtering efficiently.
    """
    print("Starting database performance hardening (Indexing)...")
    
    indices = [
        # Users: Speed up joins with Department and role-based filtering
        "CREATE INDEX IF NOT EXISTS ix_users_department_id ON auth.users (department_id);",
        "CREATE INDEX IF NOT EXISTS ix_users_role ON auth.users (role);",
        "CREATE INDEX IF NOT EXISTS ix_users_status ON auth.users (status);",
        
        # Assignment Groups: Speed up departmental scoping
        "CREATE INDEX IF NOT EXISTS ix_assignment_groups_department_id ON support.assignment_groups (department_id);",
        
        # Tickets: Speed up assignment and status queries
        "CREATE INDEX IF NOT EXISTS ix_tickets_assignment_group_id ON support.tickets (assignment_group_id);",
        "CREATE INDEX IF NOT EXISTS ix_tickets_assigned_to_id ON support.tickets (assigned_to_id);",
        "CREATE INDEX IF NOT EXISTS ix_tickets_status_upper ON support.tickets (UPPER(status));",
        
        # Asset Requests: Speed up requester scoping
        "CREATE INDEX IF NOT EXISTS ix_asset_requests_requester_id ON asset.asset_requests (requester_id);"
    ]
    
    async with AsyncSessionLocal() as db:
        for sql in indices:
            try:
                print(f"Executing: {sql}")
                await db.execute(text(sql))
                await db.commit()
                print("Success.")
            except Exception as e:
                print(f"Error executing index creation: {e}")
                await db.rollback()

    print("Database performance hardening complete.")

if __name__ == "__main__":
    asyncio.run(add_indices())
