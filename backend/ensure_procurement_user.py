import sys
import os
import uuid
# Add backend to path
sys.path.append(os.getcwd())

from app.database.database import SessionLocal
from app.models.models import User, Department
from app.services.user_service import get_password_hash

def ensure_procurement_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.role == "PROCUREMENT").first()
        
        if user:
            print(f"[OK] Found procurement user: {user.email}")
            return
        
        # Create one if not exists
        print("[INFO] No PROCUREMENT user found. Creating one...")
        
        # Get Procurement department
        proc_dept = db.query(Department).filter(Department.name.ilike("%Procurement%")).first()
        proc_dept_id = proc_dept.id if proc_dept else None
        
        pw = get_password_hash("password123")
        new_user = User(
            id=uuid.uuid4(),
            email="procurement@test.com",
            full_name="Procurement Specialist",
            password_hash=pw,
            role="PROCUREMENT",
            status="ACTIVE",
            position="TEAM_MEMBER",
            department_id=proc_dept_id,
            domain="PROCUREMENT"
        )
        db.add(new_user)
        db.commit()
        print("[SUCCESS] Created procurement user: procurement@test.com")
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    ensure_procurement_user()
