import asyncio, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv()
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema='finance' AND table_name='finance_records' "
            "ORDER BY ordinal_position"
        ))
        rows = r.fetchall()
        if rows:
            print("finance.finance_records columns:", [row[0] for row in rows])
        else:
            print("MISSING: finance.finance_records not found")

asyncio.run(check())
