import asyncio
from app.database.database import get_db_session
from sqlalchemy import text

async def check_software():
    async with get_db_session() as db:
        # Check total discovered software records
        result = await db.execute(text('SELECT COUNT(*) FROM discovered_software'))
        total = result.scalar()
        print(f'Total discovered_software records: {total}')
        
        # Check unique software (grouped)
        result = await db.execute(text('''
            SELECT name, version, vendor, COUNT(*) as install_count
            FROM discovered_software 
            GROUP BY name, version, vendor 
            ORDER BY install_count DESC
        '''))
        rows = result.fetchall()
        print(f'\nUnique software applications: {len(rows)}')
        print('-' * 80)
        for r in rows:
            print(f'{r[0]:40} {r[1]:15} {r[2]:20} {r[3]:3} installs')

asyncio.run(check_software())
