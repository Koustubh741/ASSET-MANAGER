
from sqlalchemy import text
from app.database.database import SessionLocal

def migrate():
    db = SessionLocal()
    try:
        print("Starting migration for procurement.purchase_requests...")
        
        # 1. Check existing columns
        res = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'procurement' AND table_name = 'purchase_requests'")).fetchall()
        existing_cols = [r[0] for r in res]
        print(f"Existing columns: {existing_cols}")

        updates = []
        
        # Add missing columns
        if 'asset_id' not in existing_cols:
            updates.append("ALTER TABLE procurement.purchase_requests ADD COLUMN asset_id VARCHAR")
            
        if 'requester_id' not in existing_cols:
            if 'requested_by' in existing_cols:
                # Rename if requested_by exists and requester_id doesn't
                updates.append("ALTER TABLE procurement.purchase_requests RENAME COLUMN requested_by TO requester_id")
            else:
                updates.append("ALTER TABLE procurement.purchase_requests ADD COLUMN requester_id VARCHAR")

        if 'asset_name' not in existing_cols:
            updates.append("ALTER TABLE procurement.purchase_requests ADD COLUMN asset_name VARCHAR(255)")

        if 'asset_type' not in existing_cols:
            updates.append("ALTER TABLE procurement.purchase_requests ADD COLUMN asset_type VARCHAR(100)")

        if 'asset_model' not in existing_cols:
            updates.append("ALTER TABLE procurement.purchase_requests ADD COLUMN asset_model VARCHAR(255)")

        if 'asset_vendor' not in existing_cols:
            updates.append("ALTER TABLE procurement.purchase_requests ADD COLUMN asset_vendor VARCHAR(255)")

        if 'cost_estimate' not in existing_cols:
            if 'estimated_cost' in existing_cols:
                updates.append("ALTER TABLE procurement.purchase_requests RENAME COLUMN estimated_cost TO cost_estimate")
            else:
                updates.append("ALTER TABLE procurement.purchase_requests ADD COLUMN cost_estimate FLOAT")

        if 'updated_at' not in existing_cols:
            updates.append("ALTER TABLE procurement.purchase_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")

        if updates:
            for sql in updates:
                print(f"Executing: {sql}")
                db.execute(text(sql))
            db.commit()
            print("Migration completed successfully.")
        else:
            print("No updates needed.")

    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
