import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.services import integration_service
import json
import os

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("Fetching Integration Audit...")
        audit = await integration_service.get_integration_audit(db)
        print("\n--- INTEGRATION AUDIT RESULTS ---")
        print(json.dumps(audit, indent=4))
        print("\n--- SUMMARY ---")
        live_count = 0
        planned_count = 0
        for dept, features in audit.items():
            for feature, value in features.items():
                if isinstance(value, str) and "Live" in value:
                    live_count += 1
                elif value > 0:
                    live_count += 1
                else:
                    planned_count += 1
        print(f"Total Live Features: {live_count}")
        print(f"Total Planned Features: {planned_count}")

if __name__ == "__main__":
    asyncio.run(main())
