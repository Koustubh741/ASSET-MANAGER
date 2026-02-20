import asyncio, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv()
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text(
            "SELECT role, COUNT(*) as cnt FROM auth.users GROUP BY role ORDER BY cnt DESC"
        ))
        rows = r.fetchall()
        print("User roles in DB:")
        for row in rows:
            print(f"  {row[0]}: {row[1]} users")

asyncio.run(check())
