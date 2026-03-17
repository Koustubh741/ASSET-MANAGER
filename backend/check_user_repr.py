import asyncio
import os
import asyncpg
from dotenv import load_dotenv

async def check():
    load_dotenv()
    url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url)
    try:
        row = await conn.fetchrow('SELECT id, email, role, position, department FROM auth.users WHERE email = $1', 'koustubh@gmail.com')
        if row:
            print(f"ROLE_REPR: {repr(row['role'])}")
            print(f"POSITION_REPR: {repr(row['position'])}")
            print(f"DEPT_REPR: {repr(row['department'])}")
        else:
            print("USER NOT FOUND")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(check())
