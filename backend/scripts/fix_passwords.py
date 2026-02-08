import sys
import os
from sqlalchemy.orm import Session

# Add current directory and backend to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))

try:
    from app.database.database import SessionLocal
    from app.models.models import User
    from app.services.user_service import get_password_hash
except ImportError:
    # Try alternate paths
    from backend.app.database.database import SessionLocal
    from backend.app.models.models import User
    from backend.app.services.user_service import get_password_hash

def reset_passwords():
    db = SessionLocal()
    try:
        credentials = [
            ("admin@itsm.com", "password123"),
            ("it_manager@itsm.com", "password123"),
            ("asset@test.com", "password123")
        ]
        
        for email, pwd in credentials:
            user = db.query(User).filter(User.email == email).first()
            if user:
                user.password_hash = get_password_hash(pwd)
                user.status = "ACTIVE"
                print(f"[OK] Password reset for {email}")
            else:
                print(f"[WARN] User {email} not found")
        
        db.commit()
        print("Done.")
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_passwords()
