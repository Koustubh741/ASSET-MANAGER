import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import User

def list_staff():
    db = SessionLocal()
    try:
        staff_roles = ["ADMIN", "PROCUREMENT", "ASSET_MANAGER", "FINANCE", "IT_MANAGEMENT"]
        users = db.query(User).filter(User.role.in_(staff_roles)).all()
        print(f"{'Email':<30} | {'Role':<15} | {'ID':<36} | {'Name'}")
        print("-" * 100)
        for u in users:
            print(f"{u.email:<30} | {u.role:<15} | {str(u.id):<36} | {u.full_name}")
    finally:
        db.close()

if __name__ == "__main__":
    list_staff()
