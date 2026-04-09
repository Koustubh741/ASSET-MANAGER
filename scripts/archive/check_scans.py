import asyncio
import json
from sqlalchemy import select, text
from backend.app.database.database import AsyncSessionLocal

async def check_scans():
    async with AsyncSessionLocal() as session:
        # Check discovery scans
        result = await session.execute(
            text("SELECT id, scan_type, status, start_time, end_time, assets_processed, errors FROM system.discovery_scans ORDER BY start_time DESC LIMIT 5")
        )
        scans = result.fetchall()
        print("Latest Discovery Scans:")
        for scan in scans:
            print(f"ID: {scan[0]}")
            print(f"Type: {scan[1]} | Status: {scan[2]}")
            print(f"Started: {scan[3]} | Ended: {scan[4]}")
            print(f"Processed: {scan[5]} | Errors: {scan[6]}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check_scans())
