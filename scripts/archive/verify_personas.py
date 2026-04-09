import sys
import os
import asyncio
from sqlalchemy import select

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from backend.app.database.database import SessionLocal
from backend.app.models.models import User

def verify_persona_mapping():
    print("--- Verifying Functional Persona Mapping ---")
    emails_to_check = [
        "it_mgr@enterprise.com",
        "it_manager@itsm.com",
        "it1@enterprise.com",
        "it2@enterprise.com"
    ]
    
    with SessionLocal() as db:
        for email in emails_to_check:
            user = db.query(User).filter(User.email == email).first()
            if user:
                print(f"User: {email}")
                print(f"  Role: {user.role}")
                print(f"  Position: {user.position}")
                print(f"  Persona: {user.persona}")
                print("-" * 20)
            else:
                print(f"User: {email} NOT FOUND")

if __name__ == "__main__":
    verify_persona_mapping()
