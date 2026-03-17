import sys
import os

# Adjust path to import from parent directory
sys.path.append(os.getcwd())

from app.database.database import SessionLocal
import models
from services.user_service import get_password_hash

def reset_all_passwords():
    db = SessionLocal()
    try:
        new_password = "123"
        print(f"Hashing new password: {new_password}...")
        hashed = get_password_hash(new_password)
        
        print("Fetching all users...")
        users = db.query(models.User).all()
        total = len(users)
        
        print(f"Resetting passwords for {total} users...")
        for user in users:
            user.password_hash = hashed
            # Ensure they are active so the user can actually log in
            user.status = "ACTIVE"
            
        db.commit()
        print(f"\n[SUCCESS] Successfully reset passwords for all {total} users to '123'.")
        print("[INFO] All users have also been set to 'ACTIVE' status.")
        
    except Exception as e:
        print(f"\n[ERROR] Failed to reset passwords: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    confirm = input("This will reset ALL user passwords in the database to '123'. Proceed? (y/n): ")
    if confirm.lower() == 'y':
        reset_all_passwords()
    else:
        print("Operation cancelled.")
