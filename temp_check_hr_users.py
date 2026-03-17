
import sys
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

# Import models
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.models.models import User
from app.database.database import engine

def check_hr_users():
    with Session(engine) as session:
        print("--- Checking HR Users ---")
        query = select(User).filter(User.department == 'Human Resources')
        users = session.execute(query).scalars().all()
        for user in users:
            print(f"User: {user.email} | Role: {user.role} | Pos: {user.position}")

if __name__ == "__main__":
    check_hr_users()
