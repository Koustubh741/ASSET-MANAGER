import asyncio
import uuid
import sys
import os
from sqlalchemy import select

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# Also add parent of scripts if running from scripts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import User
from app.services.user_service import get_password_hash

async def run_complete_seeding():
    async with AsyncSessionLocal() as db:
        print("\n=== STARTING COMPLETE USER SEEDING (ROOT FIX) ===\n")
        
        # 0. Fetch departments for mapping
        res = await db.execute(select(Department))
        depts = res.scalars().all()
        dept_map = {d.name.lower(): d.id for d in depts}
        dept_slug_map = {d.slug.lower(): d.id for d in depts}
        print(f"Loaded {len(depts)} departments for relationship mapping.")

        password_hash = get_password_hash("password123")
        
        # 1. Enterprise Hierarchy
        enterprise_users = [
            {"email": "ceo@enterprise.com", "full_name": "Alexander Pierce", "role": "ADMIN", "position": "CEO", "department": "Executive", "domain": "ADMINISTRATION", "persona": "EXECUTIVE_STRATEGY"},
            {"email": "cto@enterprise.com", "full_name": "Sarah Chen", "role": "MANAGER", "position": "CTO", "department": "Technology", "domain": "DATA_AI", "persona": "TECH_STRATEGY"},
            {"email": "coo@enterprise.com", "full_name": "Jessica Pearson", "role": "MANAGER", "position": "COO", "department": "Operations", "domain": "MANAGEMENT", "persona": "OPS_STRATEGY"},
            {"email": "eng_mgr@enterprise.com", "full_name": "Mike Ross", "role": "MANAGER", "position": "Engineering Manager", "department": "Technology", "domain": "DEVELOPMENT", "persona": "ENGINEERING_OPS"},
            {"email": "devops@enterprise.com", "full_name": "Harvey Specter", "role": "MANAGER", "position": "DevOps Lead", "department": "Technology", "domain": "CLOUD", "persona": "CLOUD_INFRA"},
            {"email": "finance_mgr@enterprise.com", "full_name": "Louis Litt", "role": "MANAGER", "position": "Finance Manager", "department": "Operations", "domain": "FINANCE", "persona": "FINANCE_GOVERNANCE"},
            {"email": "it_mgr@enterprise.com", "full_name": "Donna Paulsen", "role": "MANAGER", "position": "IT Manager", "department": "Technology", "domain": "SECURITY", "persona": "IT_GOVERNANCE"},
            {"email": "dev1@enterprise.com", "full_name": "Rachel Zane", "role": "END_USER", "position": "Senior Developer", "department": "Technology", "domain": "DEVELOPMENT", "persona": "PRODUCT_DEV"},
            {"email": "dev2@enterprise.com", "full_name": "Harold Gunderson", "role": "END_USER", "position": "Frontend Developer", "department": "Technology", "domain": "DEVELOPMENT", "persona": "PRODUCT_DEV"},
            {"email": "it1@enterprise.com", "full_name": "Katrina Bennett", "role": "END_USER", "position": "IT Specialist", "department": "Technology", "domain": "SECURITY", "persona": "IT_ENGINEERING"},
            {"email": "it2@enterprise.com", "full_name": "Gretchen Bodinski", "role": "END_USER", "position": "Support Engineer", "department": "Technology", "domain": "SECURITY", "persona": "IT_SUPPORT"},
        ]
 
        # 2. Standard Workflow & Integration Accounts
        standard_accounts = [
            {"email": "admin@itsm.com", "full_name": "System Administrator", "role": "ADMIN", "position": "MANAGER", "department": "IT", "domain": "ADMINISTRATION", "persona": "SYSTEM_ADMIN"},
            {"email": "it_manager@itsm.com", "full_name": "IT Manager", "role": "MANAGER", "position": "MANAGER", "department": "IT", "domain": "MANAGEMENT", "persona": "IT_OPERATIONS"},
            {"email": "asset@test.com", "full_name": "Asset Manager", "role": "SUPPORT", "position": "TEAM_MEMBER", "department": "IT", "domain": "INVENTORY", "persona": "INVENTORY_CONTROL"},
            {"email": "it@test.com", "full_name": "IT Staff", "role": "SUPPORT", "position": "TEAM_MEMBER", "department": "IT", "domain": "SUPPORT", "persona": "IT_SUPPORT"},
            {"email": "finance@test.com", "full_name": "firskey", "role": "SUPPORT", "position": "TEAM_MEMBER", "department": "Finance", "domain": "FINANCE", "persona": "FINANCE_OPS"},
            {"email": "pro@test.com", "full_name": "Finance Officer", "role": "SUPPORT", "position": "TEAM_MEMBER", "department": "Finance", "domain": "FINANCE", "persona": "FINANCE_OPS"},
            {"email": "procure@test.com", "full_name": "Mathew Crawley", "role": "SUPPORT", "position": "TEAM_MEMBER", "department": "Procurement", "domain": "MANAGEMENT", "persona": "PROCUREMENT_OPS"},
        ]
 
        # 3. Requested Test Accounts
        test_accounts = [
            {"email": "admin_test_134801@company.com", "full_name": "Test IT Admin 134801", "role": "SUPPORT", "position": "MANAGER", "department": "IT", "domain": "ADMINISTRATION", "persona": "IT_OPERATIONS"},
            {"email": "manager_test_134801@company.com", "full_name": "Test Manager 134801", "role": "MANAGER", "position": "MANAGER", "department": "IT", "domain": "MANAGEMENT", "persona": "IT_GOVERNANCE"},
            {"email": "user_test_134801@company.com", "full_name": "Test User 134801", "role": "END_USER", "position": "TEAM_MEMBER", "department": "IT", "domain": "DEVELOPMENT", "persona": "PRODUCT_DEV"},
            {"email": "JohnathanPine@gmail.com", "full_name": "Johnathan Pine", "role": "MANAGER", "position": "MANAGER", "department": "Technology", "domain": "DATA_AI", "persona": "TECH_STRATEGY"},
            {"email": "richardroper@gmail.com", "full_name": "Richard Roper", "role": "SUPPORT", "position": "MANAGER", "department": "IT", "domain": "MANAGEMENT", "persona": "IT_OPERATIONS"},
            {"email": "requester_FIXED@auto.com", "full_name": "Test END_USER 115636", "role": "END_USER", "position": "TEAM_MEMBER", "department": "IT", "domain": "DEVELOPMENT", "persona": "PRODUCT_DEV"},
            {"email": "manager_FIXED@auto.com", "full_name": "Test END_USER 115934", "role": "END_USER", "position": "TEAM_MEMBER", "department": "IT", "domain": "DEVELOPMENT", "persona": "PRODUCT_DEV"},
            {"email": "finance_FIXED@auto.com", "full_name": "Test FINANCE 120042", "role": "SUPPORT", "position": "TEAM_MEMBER", "department": "Finance", "domain": "FINANCE", "persona": "FINANCE_OPS"},
            {"email": "it_admin_FIXED@auto.com", "full_name": "Test IT_MANAGEMENT 120009", "role": "SUPPORT", "position": "TEAM_MEMBER", "department": "IT", "domain": "SECURITY", "persona": "IT_ENGINEERING"},
            {"email": "inventory_FIXED@auto.com", "full_name": "Test ASSET_INVENTORY_MANAGER 120149", "role": "SUPPORT", "position": "TEAM_MEMBER", "department": "IT", "domain": "SECURITY", "persona": "INVENTORY_CONTROL"},
            {"email": "employee@itsm.com", "full_name": "Rachel Zane", "role": "END_USER", "position": "Senior Developer", "department": "Technology", "domain": "DEVELOPMENT", "persona": "PRODUCT_DEV"},
            {"email": "it_staff@itsm.com", "full_name": "Gretchen Bodinski", "role": "SUPPORT", "position": "Support Engineer", "department": "Technology", "domain": "SECURITY", "persona": "IT_SUPPORT"},
            {"email": "katrina.b@itsm.com", "full_name": "Katrina Bennett", "role": "SUPPORT", "position": "IT Specialist", "department": "Technology", "domain": "SECURITY", "persona": "IT_ENGINEERING"},
            {"email": "endcloud@gmail.com", "full_name": "Test END_USER Cloud", "role": "END_USER", "position": "TEAM_MEMBER", "department": "Technology", "domain": "CLOUD", "persona": "CLOUD_INFRA"},
        ]

        all_users = enterprise_users + standard_accounts + test_accounts
        email_to_id = {}

        for user_data in all_users:
            email = user_data["email"]
            # Map legacy department name to ID
            dept_name = user_data["department"].lower()
            dept_id = dept_map.get(dept_name) or dept_slug_map.get(dept_name)
            
            # Smart fallbacks for seeding
            if not dept_id:
                if "tech" in dept_name or "it" in dept_name:
                    dept_id = dept_slug_map.get("it") or dept_slug_map.get("engineering")
                elif "finance" in dept_name:
                    dept_id = dept_slug_map.get("finance")

            result = await db.execute(select(User).where(User.email == email))
            user = result.scalars().first()
            
            if not user:
                user = User(
                    id=uuid.uuid4(),
                    email=email,
                    full_name=user_data["full_name"],
                    password_hash=password_hash,
                    role=user_data["role"],
                    status="ACTIVE",
                    position=user_data["position"],
                    domain=user_data["domain"],
                    department_id=dept_id,
                    persona=user_data.get("persona")
                )
                db.add(user)
                print(f"[NEW] Created: {email} -> Linked to Dept: {dept_name}")
            else:
                user.full_name = user_data["full_name"]
                user.role = user_data["role"]
                user.password_hash = password_hash
                user.position = user_data["position"]
                user.domain = user_data["domain"]
                user.department_id = dept_id
                user.status = "ACTIVE"
                user.persona = user_data.get("persona")
                print(f"[UPD] Updated: {email} -> Linked to Dept: {dept_name}")
            
            await db.flush()
            email_to_id[email] = user.id

        # 4. Manager Hierachy
        ceo_id = email_to_id.get("ceo@enterprise.com")
        cto_id = email_to_id.get("cto@enterprise.com")
        coo_id = email_to_id.get("coo@enterprise.com")
        it_mgr_id = email_to_id.get("it_mgr@enterprise.com")
        eng_mgr_id = email_to_id.get("eng_mgr@enterprise.com")

        manager_mappings = {
            "cto@enterprise.com": ceo_id,
            "coo@enterprise.com": ceo_id,
            "eng_mgr@enterprise.com": cto_id,
            "devops@enterprise.com": cto_id,
            "it_mgr@enterprise.com": cto_id,
            "finance_mgr@enterprise.com": coo_id,
            "dev1@enterprise.com": eng_mgr_id,
            "dev2@enterprise.com": eng_mgr_id,
            "it1@enterprise.com": it_mgr_id,
            "it2@enterprise.com": it_mgr_id,
            "JohnathanPine@gmail.com": cto_id
        }

        for email, lead_id in manager_mappings.items():
            if lead_id:
                result = await db.execute(select(User).where(User.email == email))
                u = result.scalars().first()
                if u:
                    u.manager_id = lead_id

        await db.commit()
        print(f"\n[SUCCESS] Root Fix Seeding Complete. Relationships synchronized.")

if __name__ == "__main__":
    asyncio.run(run_complete_seeding())
