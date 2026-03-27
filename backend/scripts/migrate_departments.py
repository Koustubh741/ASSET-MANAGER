import os
import sys
import uuid
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path to import models
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.models.models import Base, User, Department
from app.database.database import SessionLocal

# Standardized 12 Departments
DEPARTMENTS = [
    {"slug": "engineering", "name": "Engineering & Technology", "metadata": {"icon": "Cpu", "color": "blue"}},
    {"slug": "finance", "name": "Finance & Accounting", "metadata": {"icon": "DollarSign", "color": "green"}},
    {"slug": "hr", "name": "Human Resources", "metadata": {"icon": "Users", "color": "pink"}},
    {"slug": "operations", "name": "Operations & Logistics", "metadata": {"icon": "Truck", "color": "orange"}},
    {"slug": "legal", "name": "Legal & Compliance", "metadata": {"icon": "ShieldCheck", "color": "purple"}},
    {"slug": "sales", "name": "Sales & Marketing", "metadata": {"icon": "TrendingUp", "color": "indigo"}},
    {"slug": "it", "name": "Information Technology", "metadata": {"icon": "Monitor", "color": "cyan"}},
    {"slug": "executive", "name": "Executive Management", "metadata": {"icon": "Crown", "color": "gold"}},
    {"slug": "procurement", "name": "Procurement", "metadata": {"icon": "ShoppingBag", "color": "emerald"}},
    {"slug": "product", "name": "Product Management", "metadata": {"icon": "Box", "color": "rose"}},
    {"slug": "customer_success", "name": "Customer Success", "metadata": {"icon": "Heart", "color": "teal"}},
    {"slug": "security", "name": "Cyber Security", "metadata": {"icon": "Lock", "color": "red"}},
]

MAPPING = {
    "engineering": ["engineering", "technology", "architecture", "dev", "tech"],
    "finance": ["finance", "fin", "accounting"],
    "hr": ["hr", "human", "people", "talent"],
    "operations": ["operations", "ops", "logistics", "log", "facilities"],
    "legal": ["legal", "compliance", "audit", "grc"],
    "sales": ["sales", "marketing", "business", "biz", "bus", "mark"],
    "it": ["it", "information", "support", "helpdesk"],
    "executive": ["executive", "exec", "ceo", "cto", "cfo"],
}

def migrate():
    from sqlalchemy import text
    session = SessionLocal()
    try:
        print("--- Departmental Migration Start ---")
        # Ensure schema exists
        session.execute(text("CREATE SCHEMA IF NOT EXISTS auth"))
        
        # Manually create table if missing (SQLAlchemy create_all can be finicky with existing schemas)
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS auth.departments (
                id UUID PRIMARY KEY,
                slug VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                manager_id UUID,
                dept_metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        session.commit()

        # Ensure User column exists
        try:
            session.execute(text("ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS department_id UUID"))
            session.commit()
        except Exception:
            session.rollback()

        # 1. Ensure Departments exist
        dept_map = {}
        for d_data in DEPARTMENTS:
            res = session.execute(text("SELECT id FROM auth.departments WHERE slug = :slug"), {"slug": d_data["slug"]}).first()
            if not res:
                print(f"Creating department: {d_data['name']}")
                new_id = uuid.uuid4()
                session.execute(text("""
                    INSERT INTO auth.departments (id, slug, name, dept_metadata)
                    VALUES (:id, :slug, :name, :metadata)
                """), {"id": new_id, "slug": d_data["slug"], "name": d_data["name"], "metadata": json.dumps(d_data["metadata"])})
                dept_map[d_data["slug"]] = new_id
            else:
                dept_map[d_data["slug"]] = res[0]
        session.commit()

        # 2. Update Users via raw SQL for reliability
        users = session.execute(text("SELECT id, department FROM auth.users")).all()
        print(f"Processing {len(users)} users...")
        
        for user_id, dept_str in users:
            dept_str = (dept_str or "").lower()
            target_slug = "it"
            
            for slug, keywords in MAPPING.items():
                if any(k in dept_str for k in keywords):
                    target_slug = slug
                    break
            
            target_id = dept_map.get(target_slug)
            session.execute(text("UPDATE auth.users SET department_id = :d_id WHERE id = :u_id"), 
                            {"d_id": target_id, "u_id": user_id})
        
        session.commit()
        print("--- Migration Complete ---")
        
    except Exception as e:
        session.rollback()
        print(f"Error during migration: {str(e)}")
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
