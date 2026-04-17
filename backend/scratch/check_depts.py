import asyncio
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text('SELECT name FROM auth.departments ORDER BY name'))
        print('CURRENT_DEPTS:')
        for r in res.all():
            print(f"- {r[0]}")

if __name__ == "__main__":
    asyncio.run(main())
