import sys
import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Add root directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import DATABASE_URL

async def normalize_categories():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    normalization_rules = [
        ("Hardware Fault", "Hardware"),
        ("Software / OS Issue", "Software"),
        ("Network / VPN", "Network"),
        ("Email / Outlook", "Communication"),
        ("Printing / Scanning", "Peripherals")
    ]

    async with AsyncSessionLocal() as session:
        print("[*] Normalizing Ticket Categories...")
        for old, new in normalization_rules:
            try:
                # Update tickets
                res = await session.execute(
                    text("UPDATE support.tickets SET category = :new WHERE category = :old"),
                    {"new": new, "old": old}
                )
                print(f"  [+] Migrated '{old}' -> '{new}' ({res.rowcount} tickets)")
                
                # Delete old config if exists
                await session.execute(
                    text("DELETE FROM support.category_configs WHERE name = :old"),
                    {"old": old}
                )
                print(f"  [-] Removed config for '{old}'")
            except Exception as e:
                print(f"  [!] Error normalizing {old}: {e}")
        
        await session.commit()
    print("[+] Normalization Complete.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(normalize_categories())
