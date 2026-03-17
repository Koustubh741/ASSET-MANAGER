from app.database.database import SessionLocal
from app.models.models import Asset
from sqlalchemy import text

def verify_assets_from_collect():
    db = SessionLocal()
    try:
        print("\n" + "="*70)
        print("ASSETS CREATED VIA /api/v1/collect ENDPOINT")
        print("="*70)
        
        # Query all assets
        assets = db.query(Asset).order_by(Asset.created_at.desc()).limit(10).all()
        
        if assets:
            print(f"\nTotal assets in database: {db.query(Asset).count()}")
            print(f"\nShowing latest {len(assets)} assets:\n")
            
            for asset in assets:
                print(f"Asset ID: {asset.id}")
                print(f"  Name: {asset.name}")
                print(f"  Type: {asset.type}")
                print(f"  Serial Number: {asset.serial_number}")
                print(f"  Vendor: {asset.vendor}")
                print(f"  Model: {asset.model}")
                print(f"  Segment: {asset.segment}")
                print(f"  Location: {asset.location}")
                print(f"  Status: {asset.status}")
                print(f"  Specifications: {asset.specifications}")
                print(f"  Created: {asset.created_at}")
                print("-" * 70)
        else:
            print("\nNo assets found in database.")
        
        print("\nTo query assets directly in PostgreSQL:")
        print("  SELECT * FROM asset.assets ORDER BY created_at DESC LIMIT 10;")
        print("="*70 + "\n")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_assets_from_collect()
