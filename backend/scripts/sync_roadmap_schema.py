import sys
import os
from sqlalchemy import text

# Add backend to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import engine, Base
from app.models.models import Location, SoftwareLicense, MaintenanceRecord

def sync_schema():
    print("Starting schema synchronization...")
    
    with engine.connect() as conn:
        # 1. Create new tables
        print("Creating new tables (if not exists)...")
        Base.metadata.create_all(bind=engine, tables=[
            Location.__table__, 
            SoftwareLicense.__table__, 
            MaintenanceRecord.__table__
        ])
        
        # 2. Alter existing Asset table
        print("Altering 'asset.assets' table...")
        try:
            # Check if columns already exist to be idempotent
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'asset' AND table_name = 'assets'"))
            existing_columns = [row[0] for row in result]
            
            if 'location_id' not in existing_columns:
                print("Adding column 'location_id'...")
                conn.execute(text("ALTER TABLE asset.assets ADD COLUMN location_id UUID REFERENCES asset.locations(id)"))
            
            if 'location_text' not in existing_columns:
                print("Adding column 'location_text'...")
                conn.execute(text("ALTER TABLE asset.assets ADD COLUMN location_text VARCHAR(255)"))
                # Migrate existing location data
                if 'location' in existing_columns:
                    conn.execute(text("UPDATE asset.assets SET location_text = location"))
            
            if 'assigned_to_id' not in existing_columns:
                print("Adding column 'assigned_to_id'...")
                conn.execute(text("ALTER TABLE asset.assets ADD COLUMN assigned_to_id UUID REFERENCES auth.users(id)"))
            
            if 'assigned_to_name' not in existing_columns:
                print("Adding column 'assigned_to_name'...")
                conn.execute(text("ALTER TABLE asset.assets ADD COLUMN assigned_to_name VARCHAR(255)"))
                if 'assigned_to' in existing_columns:
                    conn.execute(text("UPDATE asset.assets SET assigned_to_name = assigned_to"))

            conn.commit()
            print("Schema alteration successful.")
        except Exception as e:
            print(f"Error during alteration: {e}")
            conn.rollback()

if __name__ == "__main__":
    sync_schema()
