import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import User

def search_missing_users():
    db = SessionLocal()
    missing_emails = [
        "admin@itsm.com",
        "it_manager@itsm.com",
        "user_test_134801@company.com",
        "manager_test_134801@company.com",
        "admin_test_134801@company.com",
        "asset@test.com",
        "it@test.com"
    ]
    
    try:
        print(f"{'Email':<35} | {'Found':<5} | {'Full Name':<30} | {'Status':<10}")
        print("-" * 85)
        for email in missing_emails:
            user = db.query(User).filter(User.email == email).first()
            if user:
                print(f"{email:<35} | Yes   | {user.full_name:<30} | {user.status:<10}")
            else:
                print(f"{email:<35} | No    | {'-'*30} | {'-'*10}")
                
        # Also check all users to see if there are any others that might match the pattern
        print("\nAll users in DB:")
        users = db.query(User).all()
        for u in users:
            print(f"{u.email}")
            
    finally:
        db.close()

if __name__ == "__main__":
    search_missing_users()
