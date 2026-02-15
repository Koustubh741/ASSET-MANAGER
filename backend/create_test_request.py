import sys
import os
import traceback

# Add app to path
sys.path.append(os.path.join(os.getcwd(), "app"))

from app.database.database import SessionLocal
from app.models.models import AssetRequest

def run():
    db = SessionLocal()
    try:
        req = db.query(AssetRequest).filter(AssetRequest.asset_name == "VS Test").first()
        if req:
            print("Resetting to PROCUREMENT_REQUESTED for upload test...")
            req.procurement_finance_status = "PROCUREMENT_REQUESTED"
            db.commit()
            print("Done.")
            
    except Exception:
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run()
