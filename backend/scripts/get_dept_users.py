import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def get_dept_emails():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT department, email, full_name, role 
            FROM (
                SELECT department, email, full_name, role,
                       ROW_NUMBER() OVER(PARTITION BY department ORDER BY created_at) as rn
                FROM auth.users
                WHERE status = 'ACTIVE' AND department IS NOT NULL
            ) t
            WHERE rn = 1
        """))
        for row in res.fetchall():
            print(f"Dept: {row[0].ljust(15)} | Email: {row[1].ljust(30)} | Name: {row[2].ljust(20)} | Role: {row[3]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_dept_emails())
