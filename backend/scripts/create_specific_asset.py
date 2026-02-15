
from app.database.database import SessionLocal
from app.models.models import Asset
from datetime import date

def create_specific_asset():
    db = SessionLocal()
    try:
        # Check if asset already exists
        existing = db.query(Asset).filter(Asset.id == "AST-736").first()
        if existing:
            print("Asset AST-736 already exists.")
            return

        new_asset = Asset(
            id="AST-736",
            name="MacBook Pro 16",
            type="Laptop",
            model="M3 Max",
            vendor="Apple",
            serial_number="SN-736-SPECIFIC",
            status="In Stock",
            location="Main Office",
            segment="IT",
            cost=3500.0,
            purchase_date=date.today()
        )
        
        db.add(new_asset)
        db.commit()
        print("Successfully created asset with ID: AST-736")
    except Exception as e:
        db.rollback()
        print(f"Error creating asset: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_specific_asset()
