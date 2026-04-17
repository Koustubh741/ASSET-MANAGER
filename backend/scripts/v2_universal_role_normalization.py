
import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession

# Database URL
DB_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def migrate_roles_v2():
    engine = create_async_engine(DB_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        print("Starting PHASE 2: Universal Role Normalization...")
        
        # 1. Broad Role Normalization Mapping
        # We focus on stabilizing ROLES since hierarchical department_id should be handled by seeding/UI
        normalization_map = {
            "SYSTEM_ADMIN": "ADMIN",
            "ADMIN": "ADMIN",
            
            # Support Roles
            "IT_SUPPORT": "SUPPORT",
            "IT_MANAGEMENT": "SUPPORT",
            "SUPPORT_SPECIALIST": "SUPPORT",
            "ASSET_MANAGER": "SUPPORT",
            "INVENTORY_MANAGER": "SUPPORT",
            "ASSET_INVENTORY_MANAGER": "SUPPORT",
            "FINANCE_SUPPORT": "SUPPORT",
            "PROCUREMENT_SUPPORT": "SUPPORT",
            "HR_SUPPORT": "SUPPORT",
            "LEGAL_SUPPORT": "SUPPORT",
            
            # Management Roles
            "FINANCE": "SUPPORT", # Often staff in our system
            "PROCUREMENT": "SUPPORT",
            "FINANCE_MANAGER": "MANAGER",
            "PROCUREMENT_MANAGER": "MANAGER",
            "IT_MANAGER": "MANAGER",
            
            # Executives
            "CEO": "MANAGER",
            "CFO": "MANAGER",
            "CTO": "MANAGER",
            
            # End Users
            "END_USER": "END_USER",
            "EMPLOYEE": "END_USER",
            "USER": "END_USER",
        }
        
        # 1. Perform Updates for mapped roles
        for old_slug, base_role in normalization_map.items():
            result = await session.execute(
                text("UPDATE auth.users SET role = :new_role WHERE role ILIKE :old_slug"),
                {"new_role": base_role, "old_slug": old_slug}
            )
            if result.rowcount > 0:
                print(f"Normalized {old_slug} -> {base_role} ({result.rowcount} users)")

        # 2. Fix MANAGER legacy position mismatch
        result = await session.execute(
            text("UPDATE auth.users SET role = 'MANAGER' WHERE position = 'MANAGER' AND role NOT IN ('ADMIN', 'SUPPORT')")
        )
        print(f"Harmonized legacy MANAGER positions: {result.rowcount} rows")

        # 3. Final Cleanup (Trim and Case)
        await session.execute(text("UPDATE auth.users SET role = UPPER(TRIM(role))"))

        # 4. Review Result
        result = await session.execute(text("SELECT role, COUNT(*) FROM auth.users GROUP BY role ORDER BY role"))
        rows = result.fetchall()
        print("\n--- FINAL DB ROLE STATE ---")
        for r, c in rows:
            print(f"Role: {r:<15} | Count: {c}")
            
        await session.commit()
    
    await engine.dispose()
    print("\nPHASE 2 Role Normalization Complete.")

if __name__ == "__main__":
    asyncio.run(migrate_roles_v2())
