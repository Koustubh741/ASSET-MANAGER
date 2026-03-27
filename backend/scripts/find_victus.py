
import sys
import os

# Internal imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database.database import SessionLocal
from app.models.models import Asset

def find_victus():
    session = SessionLocal()
    try:
        a = session.query(Asset).filter(Asset.name.ilike('%victus%')).first()
        if a:
            print(f"ID: {a.id}")
            print(f"Name: {a.name}")
            print(f"Status: {a.status}")
        else:
            print("Victus not found.")
    finally:
        session.close()

if __name__ == "__main__":
    find_victus()
