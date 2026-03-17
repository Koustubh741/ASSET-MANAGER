import asyncio
import os
import asyncpg
from dotenv import load_dotenv

async def check():
    load_dotenv()
    url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url)
    try:
        rows = await conn.fetch("SELECT id, email, role, status FROM auth.users WHERE email ILIKE 'koustubh%'")
        for r in rows:
            print(f"USER: {dict(r)}")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(check())
