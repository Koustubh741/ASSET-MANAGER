import os
import sys
import uuid
import bcrypt
from sqlalchemy import text

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database.database import SessionLocal

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def run():
    session = SessionLocal()
    try:
        # Get all departments
        res = session.execute(text("SELECT id, slug, name FROM auth.departments"))
        departments = res.fetchall()
        
        created_users = []
        default_password = "Password@123"
        hashed_pw = get_password_hash(default_password)

        for dept_id, slug, name in departments:
            # 1. Check for Manager
            mgr_check = session.execute(
                text("SELECT id FROM auth.users WHERE department_id = :d_id AND position = 'MANAGER' LIMIT 1"),
                {"d_id": dept_id}
            ).fetchone()

            if not mgr_check:
                # Create Manager
                u_id = uuid.uuid4()
                email = f"manager_{slug}@example.com"
                session.execute(
                    text("""
                        INSERT INTO auth.users 
                        (id, email, full_name, password_hash, role, status, position, department_id)
                        VALUES (:id, :email, :name, :pw, 'MANAGER', 'ACTIVE', 'MANAGER', :d_id)
                    """),
                    {
                        "id": u_id,
                        "email": email,
                        "name": f"{name} Manager",
                        "pw": hashed_pw,
                        "d_id": dept_id
                    }
                )
                created_users.append({"dept": name, "type": "MANAGER", "email": email, "password": default_password})

            # 2. Check for Staff / Team Member
            staff_check = session.execute(
                text("SELECT id FROM auth.users WHERE department_id = :d_id AND position = 'TEAM_MEMBER' LIMIT 1"),
                {"d_id": dept_id}
            ).fetchone()

            if not staff_check:
                # Create Staff
                u_id = uuid.uuid4()
                email = f"staff_{slug}@example.com"
                session.execute(
                    text("""
                        INSERT INTO auth.users 
                        (id, email, full_name, password_hash, role, status, position, department_id)
                        VALUES (:id, :email, :name, :pw, 'END_USER', 'ACTIVE', 'TEAM_MEMBER', :d_id)
                    """),
                    {
                        "id": u_id,
                        "email": email,
                        "name": f"{name} Staff",
                        "pw": hashed_pw,
                        "d_id": dept_id
                    }
                )
                created_users.append({"dept": name, "type": "STAFF", "email": email, "password": default_password})

        session.commit()
        
        print("--- Creation Complete ---")
        if not created_users:
            print("All departments already have at least one Manager and one Staff.")
        for u in created_users:
            print(f"[{u['dept']}] {u['type']} -> Email: {u['email']} | Password: {u['password']}")

    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    run()
