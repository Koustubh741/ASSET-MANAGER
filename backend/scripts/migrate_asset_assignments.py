
"""
Migration script to add missing columns to asset_assignments table
"""
from app.database.database import engine
from sqlalchemy import text

def migrate_asset_assignments():
    """Add location column to asset_assignments table"""
    try:
        with engine.connect() as connection:
            print("\n=== MIGRATING ASSET_ASSIGNMENTS TABLE ===\n")
            
            # Check for location column
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'asset' 
                AND table_name = 'asset_assignments' 
                AND column_name = 'location'
            """)
            result = connection.execute(check_query)
            
            if result.fetchone():
                print("[SKIP] Column 'location' already exists")
            else:
                print("Adding 'location' column...")
                connection.execute(text("""
                    ALTER TABLE asset.asset_assignments 
                    ADD COLUMN location VARCHAR(255)
                """))
                connection.commit()
                print("[OK] Added 'location' column")
                
            print("\n[OK] Migration complete!")
            
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate_asset_assignments()
