import sys
import os
import uuid
from sqlalchemy.orm import Session

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import User
from app.services.user_service import get_password_hash

def seed_missing_users():
    db = SessionLocal()
    try:
        password_hash = get_password_hash("password123")
        
        users_to_seed = [
            {
                "email": "admin@itsm.com",
                "full_name": "System Administrator",
                "role": "ADMIN",
                "status": "ACTIVE",
                "position": "MANAGER",
                "department": "IT",
                "domain": "ADMINISTRATION"
            },
            {
                "email": "it_manager@itsm.com",
                "full_name": "IT Manager",
                "role": "IT_MANAGEMENT",
                "status": "ACTIVE",
                "position": "MANAGER",
                "department": "IT",
                "domain": "MANAGEMENT"
            },
            {
                "email": "user_test_134801@company.com",
                "full_name": "Test User 134801",
                "role": "END_USER",
                "status": "ACTIVE",
                "position": "TEAM_MEMBER",
                "department": "IT",
                "domain": "DEVELOPMENT"
            },
            {
                "email": "manager_test_134801@company.com",
                "full_name": "Test Manager 134801",
                "role": "MANAGER",
                "status": "ACTIVE",
                "position": "MANAGER",
                "department": "IT",
                "domain": "MANAGEMENT"
            },
            {
                "email": "admin_test_134801@company.com",
                "full_name": "Test IT Admin 134801",
                "role": "IT_MANAGEMENT",
                "status": "ACTIVE",
                "position": "MANAGER",
                "department": "IT",
                "domain": "ADMINISTRATION"
            },
            {
                "email": "asset@test.com",
                "full_name": "Asset Manager",
                "role": "ASSET_MANAGER",
                "status": "ACTIVE",
                "position": "TEAM_MEMBER",
                "department": "IT",
                "domain": "INVENTORY"
            },
            {
                "email": "it@test.com",
                "full_name": "IT Staff",
                "role": "IT_MANAGEMENT",
                "status": "ACTIVE",
                "position": "TEAM_MEMBER",
                "department": "IT",
                "domain": "SUPPORT"
            },
            {
                "email": "JohnathanPine@gmail.com",
                "full_name": "Johnathan Pine",
                "role": "MANAGER",
                "status": "ACTIVE",
                "position": "MANAGER",
                "department": "Technology",
                "domain": "DATA_AI"
            },
            {
                "email": "richardroper@gmail.com",
                "full_name": "Richard Roper",
                "role": "IT_MANAGEMENT",
                "status": "ACTIVE",
                "position": "MANAGER",
                "department": "IT",
                "domain": "MANAGEMENT"
            },
            {
                "email": "finance@test.com",
                "full_name": "firskey",
                "role": "FINANCE",
                "status": "ACTIVE",
                "position": "TEAM_MEMBER",
                "department": "Operations",
                "domain": "FINANCE"
            }
        ]
        
        for user_data in users_to_seed:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if existing:
                print(f"[SKIP] User {user_data['email']} already exists.")
                # Update existing user to match requested details if needed
                existing.role = user_data["role"]
                existing.status = user_data["status"]
                existing.full_name = user_data["full_name"]
            else:
                new_user = User(
                    id=uuid.uuid4(),
                    password_hash=password_hash,
                    **user_data
                )
                db.add(new_user)
                print(f"[OK] Created User: {user_data['full_name']} ({user_data['email']})")
        
        db.commit()
        print("\n[SUCCESS] Missing users seeded successfully!")
        
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_missing_users()
