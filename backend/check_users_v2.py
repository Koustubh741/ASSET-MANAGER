import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import User

def check_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print("Existing Users:")
        for u in users:
            print(f"- ID: {u.id}, Email: {u.email}, Name: {u.name}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
