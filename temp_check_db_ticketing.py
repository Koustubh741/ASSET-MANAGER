
import sys
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from uuid import UUID

# Import models
# Adjust path to include the backend directory
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.models.models import User, AssignmentGroup, Ticket
from app.database.database import engine

def check_db_integrity():
    with Session(engine) as session:
        print("--- Checking Users ---")
        emails = ['it_mgr@enterprise.com', 'coo@enterprise.com', 'finance_mgr@enterprise.com', 'it_mgmt@enterprise.com']
        for email in emails:
            user = session.execute(select(User).filter(User.email == email)).scalars().first()
            if user:
                print(f"User: {user.email} | Role: {user.role} | Dept: {user.department} | Pos: {user.position}")
            else:
                print(f"User: {email} NOT FOUND")
        
        print("\n--- Checking Assignment Groups ---")
        groups = session.execute(select(AssignmentGroup)).scalars().all()
        for g in groups:
            print(f"Group: {g.name} | Dept: {g.department} | ID: {g.id}")
        
        print("\n--- Checking Tickets count ---")
        count = session.query(Ticket).count()
        print(f"Total tickets: {count}")

if __name__ == "__main__":
    check_db_integrity()
