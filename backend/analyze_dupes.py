
import asyncio
from sqlalchemy import select, func
from app.database.database import AsyncSessionLocal
from app.models.models import Asset

async def analyze_duplicates():
    async with AsyncSessionLocal() as db:
        # 1. Total Count
        total_count = await db.execute(select(func.count(Asset.id)))
        total = total_count.scalar()
        print(f"Total Assets: {total}")

        # 2. Duplicate Serial Numbers
        serials = await db.execute(
            select(Asset.serial_number, func.count(Asset.id))
            .group_by(Asset.serial_number)
            .having(func.count(Asset.id) > 1)
        )
        serial_dupes = serials.all()
        print(f"\nDuplicate Serial Numbers found: {len(serial_dupes)}")
        for sn, count in serial_dupes:
            if sn:
                print(f"  - Serial '{sn}': {count} occurrences")

        # 3. Duplicate Hostnames
        hostnames = await db.execute(
            select(Asset.name, func.count(Asset.id))
            .group_by(Asset.name)
            .having(func.count(Asset.id) > 1)
        )
        name_dupes = hostnames.all()
        print(f"\nDuplicate Hostnames found: {len(name_dupes)}")
        for name, count in name_dupes:
            print(f"  - Hostname '{name}': {count} occurrences")

        # 4. Check for "Stub" assets
        stubs = await db.execute(
            select(func.count(Asset.id))
            .filter(Asset.serial_number.like("STUB-%"))
        )
        stub_count = stubs.scalar()
        print(f"\nStub Assets: {stub_count}")

if __name__ == "__main__":
    asyncio.run(analyze_duplicates())
