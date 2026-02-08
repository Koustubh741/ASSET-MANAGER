import asyncio
import sys
from app.database.database import get_db_session
from sqlalchemy import text

async def check_software_data():
    try:
        async with get_db_session() as db:
            # Test connection
            await db.execute(text('SELECT 1'))
            print("✅ Database connection successful!\n")
            
            # Check total discovered software records
            result = await db.execute(text('SELECT COUNT(*) FROM discovered_software'))
            total = result.scalar()
            print(f'📊 Total discovered_software records: {total}\n')
            
            if total == 0:
                print("⚠️  No software records found in database!")
                return
            
            # Check unique software (grouped by name, version, vendor)
            result = await db.execute(text('''
                SELECT name, version, vendor, COUNT(*) as install_count
                FROM discovered_software 
                GROUP BY name, version, vendor 
                ORDER BY install_count DESC
                LIMIT 20
            '''))
            rows = result.fetchall()
            print(f'📦 Unique software applications: {len(rows)}')
            print('=' * 100)
            print(f'{"Software Name":<45} {"Version":<20} {"Vendor":<20} {"Installs":>10}')
            print('=' * 100)
            for r in rows:
                name = (r[0] or 'Unknown')[:44]
                version = (r[1] or 'N/A')[:19]
                vendor = (r[2] or 'Unknown')[:19]
                count = r[3]
                print(f'{name:<45} {version:<20} {vendor:<20} {count:>10}')
            print('=' * 100)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(check_software_data())
