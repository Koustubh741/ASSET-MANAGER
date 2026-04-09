import sys
import os
from sqlalchemy import select

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from backend.app.database.database import SessionLocal
from backend.app.models.models import User

def check_user():
    email = "it_manager@itsm.com"
    print(f"Checking for user: {email}")
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"Found User:")
            print(f"  ID: {user.id}")
            print(f"  Full Name: {user.full_name}")
            print(f"  Role: {user.role}")
            print(f"  Position: {user.position}")
            print(f"  Status: {user.status}")
            print(f"  Department: {user.department}")
            print(f"  Domain: {user.domain}")
        else:
            print("User not found in database.")

if __name__ == "__main__":
    check_user()
