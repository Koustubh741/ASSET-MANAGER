import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
import models
from services.user_service import get_password_hash

def reset_admin_password():
    db = SessionLocal()
    try:
        admin_email = "admin@itsm.com"
        new_password = "password123"
        hashed = get_password_hash(new_password)
        
        user = db.query(models.User).filter(models.User.email == admin_email).first()
        if user:
            user.password_hash = hashed
            user.status = "ACTIVE"
            db.commit()
            print(f"[OK] Reset password for {admin_email} to '{new_password}'")
        else:
            print(f"[ERROR] User {admin_email} not found")
            
        # Also let's fix the other main ones
        others = [
            ("it_manager@itsm.com", "password123"),
            ("it@test.com", "password123"),
            ("asset@test.com", "password123")
        ]
        
        for email, pwd in others:
            u = db.query(models.User).filter(models.User.email == email).first()
            if u:
                u.password_hash = get_password_hash(pwd)
                u.status = "ACTIVE"
                print(f"[OK] Reset password for {email} to '{pwd}'")
        
        db.commit()
        
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin_password()
