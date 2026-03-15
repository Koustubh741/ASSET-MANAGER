import sys
import os
from uuid import UUID

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import User

def check_target_user(user_id):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if user:
            print(f"Target User Found:")
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Role: {user.role}")
            print(f"Department: {user.department}")
        else:
            print(f"User with ID {user_id} NOT found.")
    finally:
        db.close()

if __name__ == "__main__":
    check_target_user("df22b4d5-9c4f-4afc-a777-9810b88c5dbf")
