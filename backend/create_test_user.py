import sys
import os
import uuid

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import User

def create_test_user():
    db = SessionLocal()
    try:
        # Check if user already exists
        user = db.query(User).filter(User.email == "koustubh@itsm.com").first()
        if not user:
            new_user = User(
                id=uuid.uuid4(),
                email="koustubh@itsm.com",
                full_name="Koustubh Admin",
                password_hash="fakehash",
                role="ADMIN",
                status="ACTIVE"
            )
            db.add(new_user)
            db.commit()
            print("Created test user koustubh@itsm.com")
        else:
            print("Test user already exists")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
