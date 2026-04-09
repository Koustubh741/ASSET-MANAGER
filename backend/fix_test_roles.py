
import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy.future import select

async def fix_roles():
    async with AsyncSessionLocal() as session:
        # Fix IT Manager
        result = await session.execute(select(User).filter(User.email == 'it_mgr@enterprise.com'))
        it_mgr = result.scalars().first()
        if it_mgr:
            it_mgr.role = 'IT_MANAGEMENT'
            print(f"Updated it_mgr ({it_mgr.email}) role to IT_MANAGEMENT")
        
        # Also check other key roles for the test
        # ASSET_MANAGER: asset_mgr@enterprise.com
        result = await session.execute(select(User).filter(User.email == 'asset_mgr@enterprise.com'))
        asset_mgr = result.scalars().first()
        if asset_mgr:
            asset_mgr.role = 'ASSET_MANAGER'
            print(f"Updated asset_mgr ({asset_mgr.email}) role to ASSET_MANAGER")
            
        # FINANCE: finance_mgr@enterprise.com
        result = await session.execute(select(User).filter(User.email == 'finance_mgr@enterprise.com'))
        fin_mgr = result.scalars().first()
        if fin_mgr:
            fin_mgr.role = 'FINANCE'
            print(f"Updated finance_mgr ({fin_mgr.email}) role to FINANCE")
            
        # PROCUREMENT: procurement_mgr@enterprise.com (might be different in test script)
        # In test_full_lifecycle.py: "PROCUREMENT": ("procurement_staff@itsm.com", "password123")
        result = await session.execute(select(User).filter(User.email == 'procurement_staff@itsm.com'))
        proc_staff = result.scalars().first()
        if proc_staff:
            proc_staff.role = 'PROCUREMENT'
            print(f"Updated procurement_staff ({proc_staff.email}) role to PROCUREMENT")

        await session.commit()

if __name__ == "__main__":
    asyncio.run(fix_roles())
