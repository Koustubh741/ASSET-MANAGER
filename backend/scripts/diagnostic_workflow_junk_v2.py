
import sys
import os

# Internal imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database.database import SessionLocal
from app.models.models import Asset

def inspect_workflow_junk():
    session = SessionLocal()
    try:
        # Look for the specific assets from the screenshot
        assets = session.query(Asset).filter(
            (Asset.name.ilike('%dhankhar%')) | (Asset.type == 'i')
        ).all()

        print(f"--- Diagnostic Report: Malformed Assets ---")
        if not assets:
            print("No malformed assets found matching the criteria.")
        for a in assets:
            print(f"ID: {a.id}")
            print(f"Name: {a.name}")
            print(f"Type: {a.type}")
            print(f"Status: {a.status}")
            print(f"Warranty: {a.warranty_expiry}")
            print(f"Cost: {a.cost}")
            print("-" * 30)
    finally:
        session.close()

if __name__ == "__main__":
    inspect_workflow_junk()
