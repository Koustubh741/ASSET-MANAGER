import asyncio, os, sys
from dotenv import load_dotenv
load_dotenv()

async def check():
    import asyncpg
    url = os.getenv('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url)
    tables = [
        ('asset', 'gate_passes'),
        ('asset', 'assets'),
        ('procurement', 'purchase_orders'),
        ('finance', 'finance_records'),
        ('procurement', 'purchase_requests'),
    ]
    for schema, table in tables:
        r = await conn.fetchval(
            'SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2)',
            schema, table
        )
        status = 'EXISTS ' if r else 'MISSING'
        print(f'  {status}  {schema}.{table}')
    await conn.close()

asyncio.run(check())
