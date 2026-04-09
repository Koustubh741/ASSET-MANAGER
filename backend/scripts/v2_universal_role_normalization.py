
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
        print("🚀 Starting PHASE 2: Universal Role & Department Decoupling...")
        
        # 1. Broad Normalization Mapping (Hard Scoped)
        # We map legacy slug strings to (Base Role, Base Department)
        normalization_map = {
            "SYSTEM_ADMIN": ("ADMIN", None),
            "ADMIN": ("ADMIN", None),
            
            # Support Roles
            "IT_SUPPORT": ("SUPPORT", "IT"),
            "IT_MANAGEMENT": ("SUPPORT", "IT"),
            "SUPPORT_SPECIALIST": ("SUPPORT", "IT"),
            "ASSET_MANAGER": ("SUPPORT", "IT"),
            "INVENTORY_MANAGER": ("SUPPORT", "IT"),
            "ASSET_INVENTORY_MANAGER": ("SUPPORT", "IT"),
            "FINANCE_SUPPORT": ("SUPPORT", "Finance"),
            "PROCUREMENT_SUPPORT": ("SUPPORT", "Procurement"),
            "HR_SUPPORT": ("SUPPORT", "Human Resources"),
            "LEGAL_SUPPORT": ("SUPPORT", "Legal"),
            
            # Management Roles (Legacy Slugs)
            "FINANCE": ("SUPPORT", "Finance"), # Often was staff
            "PROCUREMENT": ("SUPPORT", "Procurement"),
            "FINANCE_MANAGER": ("MANAGER", "Finance"),
            "PROCUREMENT_MANAGER": ("MANAGER", "Procurement"),
            "IT_MANAGER": ("MANAGER", "IT"),
            
            # Executives -> Manager + Dept
            "CEO": ("MANAGER", "Executive"),
            "CFO": ("MANAGER", "Executive"),
            "CTO": ("MANAGER", "Executive"),
            
            # End Users
            "END_USER": ("END_USER", None),
            "EMPLOYEE": ("END_USER", None),
            "USER": ("END_USER", None),
        }
        
        # 1. Perform Updates for mapped roles
        for slug, (base_role, base_dept) in normalization_map.items():
            if base_dept:
                # Update both role and department
                result = await session.execute(
                    text("UPDATE auth.users SET role = :new_role, department = :new_dept WHERE role ILIKE :old_slug"),
                    {"new_role": base_role, "new_dept": base_dept, "old_slug": slug}
                )
            else:
                # Update only role (for ADMIN/END_USER)
                result = await session.execute(
                    text("UPDATE auth.users SET role = :new_role WHERE role ILIKE :old_slug"),
                    {"new_role": base_role, "old_slug": slug}
                )
            if result.rowcount > 0:
                print(f"✅ Normalized {slug} -> Role: {base_role}, Dept: {base_dept or 'Unchanged'} ({result.rowcount} rows)")

        # 2. Fix MANAGER legacy position mismatch
        # Ensure anyone with position=MANAGER has role=MANAGER if they aren't ADMIN
        result = await session.execute(
            text("UPDATE auth.users SET role = 'MANAGER' WHERE position = 'MANAGER' AND role NOT IN ('ADMIN', 'SUPPORT')")
        )
        print(f"✅ Harmonized legacy MANAGER positions: {result.rowcount} rows")

        # 3. Handle specific department strings based on domain if department is empty
        # This is a fallback for data integrity
        result = await session.execute(
            text("UPDATE auth.users SET department = INITCAP(domain) WHERE (department IS NULL OR department = '') AND domain IS NOT NULL")
        )
        print(f"✅ Backfilled departments from domains: {result.rowcount} rows")

        # 4. Final Cleanup (Trim and Case)
        await session.execute(text("UPDATE auth.users SET role = UPPER(TRIM(role))"))
        await session.execute(text("UPDATE auth.users SET department = INITCAP(TRIM(department)) WHERE department IS NOT NULL"))

        # 5. Review Result
        result = await session.execute(text("SELECT role, department, COUNT(*) FROM auth.users GROUP BY role, department ORDER BY role"))
        rows = result.fetchall()
        print("\n--- FINAL DB IDENTITY STATE ---")
        for r, d, c in rows:
            print(f"Role: {r:<10} | Dept: {str(d):<15} | Count: {c}")
            
        await session.commit()
    
    await engine.dispose()
    print("\n🎉 PHASE 2 Migration Complete. System is now decoupled.")

if __name__ == "__main__":
    asyncio.run(migrate_roles_v2())
