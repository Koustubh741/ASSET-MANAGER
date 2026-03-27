
import sys
import os
import uuid

# Internal imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database.database import SessionLocal
from app.models.models import Asset

def fix_workflow_junk():
    session = SessionLocal()
    try:
        # 1. Fix assets with type 'i' -> 'Infrastructure'
        assets_i = session.query(Asset).filter(Asset.type == 'i').all()
        for a in assets_i:
            print(f"Fixing Type for Asset {a.id} ({a.name}): i -> Infrastructure")
            a.type = "Infrastructure"

        # 2. Fix assets with email-like names (e.g. contains '@' or looks like a domain)
        # We'll rename them to 'Device <SERIAL or SHORT_ID>'
        malformed_names = session.query(Asset).filter(
            (Asset.name.ilike('%@%')) | 
            ((Asset.name.ilike('%.com')) & (~Asset.name.ilike('Asset%')))
        ).all()
        
        for a in malformed_names:
            old_name = a.name
            new_name = f"Device-{a.serial_number}" if a.serial_number else f"Device-{str(a.id)[:8]}"
            print(f"Fixing Name for Asset {a.id}: {old_name} -> {new_name}")
            a.name = new_name

        # 3. Ensure renewal_urgency is set if null but warranty exists
        from datetime import date
        today = date.today()
        null_urgency = session.query(Asset).filter(Asset.warranty_expiry != None, Asset.renewal_urgency == None).all()
        for a in null_urgency:
            days_left = (a.warranty_expiry - today).days
            if days_left <= 7: u = "Immediate"
            elif days_left <= 30: u = "High"
            elif days_left <= 60: u = "Medium"
            else: u = "Low"
            print(f"Updating Urgency for Asset {a.id}: None -> {u}")
            a.renewal_urgency = u

        session.commit()
        print("--- Cleanup Complete ---")
    except Exception as e:
        print(f"ERROR: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    fix_workflow_junk()
