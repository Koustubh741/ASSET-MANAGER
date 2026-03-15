import sys
import os

# Adjust path to import from parent directory
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import engine
from sqlalchemy import text

def list_admins():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT email, role, status FROM auth.users WHERE role != 'END_USER'"))
        admins = result.fetchall()
        print("Admins found:")
        for admin in admins:
            print(f"Email: {admin[0]}, Role: {admin[1]}, Status: {admin[2]}")

if __name__ == "__main__":
    list_admins()
