import asyncio
from app.database.database import engine, Base
from app.models.models import DiscoveryScan, DiscoveryDiff

async def create_discovery_tables():
    print("[*] Creating discovery tables (if missing)...")
    # Base.metadata.create_all is synchronous, so we run it in a thread or just use it if engine is sync
    # app.database.database.engine is a synchronous engine (SYNC_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    print("[+] Discovery tables created successfully.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(create_discovery_tables())
