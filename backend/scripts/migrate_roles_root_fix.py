
import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession

# Database URL
DB_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def migrate_roles():
    engine = create_async_engine(DB_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        print("Starting role migration...")
        
        # Mapping for unification
        role_mapping = {
            "SYSTEM_ADMIN": "ADMIN",
            "ADMIN": "ADMIN",
            "ASSET_INVENTORY_MANAGER": "ASSET_MANAGER",
            "INVENTORY_MANAGER": "ASSET_MANAGER",
            "ASSET_MANAGER": "ASSET_MANAGER",
            "FINANCE": "FINANCE",
            "FINANCE_MANAGER": "FINANCE",
            "PROCUREMENT": "PROCUREMENT",
            "PROCUREMENT_MANAGER": "PROCUREMENT",
            "IT_MANAGEMENT": "IT_MANAGEMENT",
            "IT_MANAGER": "IT_MANAGEMENT",
            "END_USER": "END_USER",
            "EMPLOYEE": "END_USER",
            "CTO": "ADMIN",
            "CEO": "ADMIN",
            "HR MANAGER": "END_USER"
        }
        
        # 1. Update roles based on mapping
        for old_role, new_role in role_mapping.items():
            result = await session.execute(
                text("UPDATE auth.users SET role = :new WHERE role ILIKE :old"),
                {"new": new_role, "old": old_role}
            )
            print(f"Updated {old_role} -> {new_role}: {result.rowcount} rows")
            
        # 2. Fix MANAGER role - Switch to END_USER but ensure position is MANAGER
        result = await session.execute(
            text("UPDATE auth.users SET role = 'END_USER', position = 'MANAGER' WHERE role = 'MANAGER'")
        )
        print(f"Updated MANAGER -> END_USER (Position=MANAGER): {result.rowcount} rows")
        
        # 3. Clean up any lingering non-slug roles (trim and uppercase)
        result = await session.execute(
            text("UPDATE auth.users SET role = UPPER(TRIM(role))")
        )
        
        # 4. Final verify
        result = await session.execute(text("SELECT role, COUNT(*) FROM auth.users GROUP BY role"))
        rows = result.fetchall()
        print("\n--- NEW ROLES IN DATABASE ---")
        for role, count in rows:
            print(f"{role}: {count}")
            
        await session.commit()
    
    await engine.dispose()
    print("\nRole migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate_roles())
