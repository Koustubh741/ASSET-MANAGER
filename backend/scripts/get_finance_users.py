import asyncio, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv()
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def get():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text(
            "SELECT email, full_name, role, department FROM auth.users "
            "WHERE role = 'FINANCE' ORDER BY created_at LIMIT 5"
        ))
        rows = r.fetchall()
        print("Finance users:")
        for row in rows:
            print(f"  Email: {row[0]}")
            print(f"  Name:  {row[1]}")
            print(f"  Role:  {row[2]}")
            print(f"  Dept:  {row[3]}")
            print()

asyncio.run(get())
