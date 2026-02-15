from app.database.database import SessionLocal
from app.services.user_service import get_password_hash
from app.models.models import User
import sys
import os

def standardize_users():
    db = SessionLocal()
    try:
        users_to_reset = [
            # email, role, position, full_name
            ('admin@itsm.com', 'ADMIN', 'MANAGER', 'System Administrator'),
            ('manager@gmail.com', 'END_USER', 'MANAGER', 'Department Manager'),
            ('it_manager@itsm.com', 'IT_MANAGEMENT', 'MANAGER', 'IT Manager'),
            ('endtest@gmail.com', 'END_USER', 'TEAM_MEMBER', 'Standard Employee'),
            ('pro@test.com', 'FINANCE', 'TEAM_MEMBER', 'Finance Officer'),
            ('asset@test.com', 'ASSET_MANAGER', 'TEAM_MEMBER', 'Inventory Lead')
        ]
        
        password = "password123"
        hashed = get_password_hash(password)
        
        for email, role, pos, name in users_to_reset:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                # Create if missing
                u = User(
                    email=email,
                    password_hash=hashed,
                    full_name=name,
                    role=role,
                    status='ACTIVE',
                    position=pos
                )
                db.add(u)
                print(f"Created {email}")
            else:
                # Update if exists
                u.password_hash = hashed
                u.status = 'ACTIVE'
                u.role = role
                u.position = pos
                print(f"Standardized {email}")
        
        db.commit()
        print("\nAll workflow accounts are now set to password: password123")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    standardize_users()
