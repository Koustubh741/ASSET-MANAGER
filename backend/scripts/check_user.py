from app.database.database import SessionLocal
from app.models.models import User
import json

def check_user_role(user_id):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            print(f"User ID: {user.id}")
            print(f"Name: {user.full_name}")
            print(f"Role: {user.role}")
            print(f"Status: {user.status}")
        else:
            print(f"User with ID {user_id} not found.")
    finally:
        db.close()

if __name__ == "__main__":
    check_user_role("f227fcd9-46fc-4674-9241-1b59d372b93b")
