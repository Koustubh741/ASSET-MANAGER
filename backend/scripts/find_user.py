import asyncio, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv()
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def find():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text(
            "SELECT id, email, full_name, role, department, position, created_at "
            "FROM auth.users "
            "WHERE LOWER(full_name) LIKE '%firskey%' OR LOWER(email) LIKE '%firskey%' "
            "ORDER BY created_at DESC"
        ))
        rows = r.fetchall()
        if not rows:
            print("No user found with name 'firskey'")
        for row in rows:
            print(f"  ID:         {row[0]}")
            print(f"  Email:      {row[1]}")
            print(f"  Full Name:  {row[2]}")
            print(f"  Role:       {row[3]}")
            print(f"  Department: {row[4]}")
            print(f"  Position:   {row[5]}")
            print(f"  Created:    {row[6]}")
            print()

asyncio.run(find())
