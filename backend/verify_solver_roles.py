import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def run():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/itsm")
    if "postgresql+asyncpg://" in database_url:
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Check all resolved tickets and their assignees
        query = """
        SELECT t.id, t.status, u.full_name, u.role 
        FROM support.tickets t 
        JOIN auth.users u ON t.assigned_to_id = u.id 
        WHERE t.status = 'RESOLVED';
        """
        
        rows = await conn.fetch(query)
        
        print("RESOLVED TICKETS BY USER ROLE:")
        print("| Ticket ID | Full Name | Role |")
        print("| :--- | :--- | :--- |")
        for row in rows:
            print(f"| {row['id']} | {row['full_name']} | {row['role']} |")
            
        # Also check current solver stats endpoint logic results (count by role)
        query_stats = """
        SELECT u.role, count(*) as count
        FROM support.tickets t
        JOIN auth.users u ON t.assigned_to_id = u.id
        WHERE t.status = 'RESOLVED'
        GROUP BY u.role;
        """
        stats = await conn.fetch(query_stats)
        print("\nSTATS BY ROLE:")
        for s in stats:
            print(f"Role: {s['role']}, Count: {s['count']}")
            
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run())
