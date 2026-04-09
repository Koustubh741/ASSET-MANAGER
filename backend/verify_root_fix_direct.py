import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.services.ticket_service import get_tickets
from app.services.asset_service import get_all_assets
from app.database.database import DATABASE_URL, AsyncSessionLocal

async def verify_services_directly():
    async with AsyncSessionLocal() as db:
        print("\n--- DIRECT SERVICE HARDENING VERIFICATION ---\n")
        
        try:
            # 1. Test Ticket Service (Async pagination + Hydration)
            print("Testing TicketService.get_tickets()...", end=" ", flush=True)
            tickets, count = await get_tickets(db, limit=5)
            print(f"PASS (Found {count} tickets, hydrated {len(tickets)} responses)")
            
            # 2. Test Asset Service
            print("Testing AssetService.get_all_assets()...", end=" ", flush=True)
            assets, a_count = await get_all_assets(db, limit=5)
            print(f"PASS (Found {a_count} assets, hydrated {len(assets)} responses)")
            
            print("\n--- ALL SERVICES VERIFIED AS ASYNC-SAFE ---\n")
            
        except Exception as e:
            print(f"FAIL: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_services_directly())
