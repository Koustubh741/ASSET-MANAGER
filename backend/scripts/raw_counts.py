from sqlalchemy import text
from app.database.database import SessionLocal

def run_counts():
    db = SessionLocal()
    try:
        tables = [
            "asset.assets",
            "asset.byod_devices",
            "asset.asset_requests",
            "auth.users"
        ]
        for table in tables:
            try:
                result = db.execute(text(f"SELECT count(*) FROM {table}")).scalar()
                print(f"Count for {table}: {result}")
            except Exception as e:
                print(f"Error counting {table}: {e}")
                
        # Also check for any asset IDs mentioned in requests that don't exist in assets table
        print("\nChecking for orphaned asset IDs in requests...")
        orphans = db.execute(text("""
            SELECT requester_id, asset_id, status, asset_name 
            FROM asset.asset_requests 
            WHERE asset_id IS NOT NULL 
            AND asset_id NOT IN (SELECT id FROM asset.assets)
        """)).all()
        
        if orphans:
            print(f"Found {len(orphans)} orphaned asset IDs in requests:")
            for o in orphans:
                print(f"Request by {o.requester_id} for '{o.asset_name}' (Status: {o.status}) points to missing Asset ID: {o.asset_id}")
        else:
            print("No orphaned asset IDs found.")

    finally:
        db.close()

if __name__ == "__main__":
    run_counts()
