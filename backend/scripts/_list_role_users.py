import asyncio, os
from dotenv import load_dotenv

async def main():
    import asyncpg
    load_dotenv()
    url = os.getenv('DATABASE_URL','').replace('postgresql+asyncpg://','postgresql://')
    conn = await asyncpg.connect(url)
    rows = await conn.fetch("SELECT role, email FROM auth.users WHERE role IN ('ADMIN', 'IT_MANAGEMENT', 'FINANCE', 'PROCUREMENT', 'ASSET_MANAGER')")
    for r in rows:
        print(f"{r['role']:20} | {r['email']}")
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
