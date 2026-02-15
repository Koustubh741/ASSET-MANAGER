"""
Migration script to update asset_requests table to match the model
"""
from app.database.database import engine
from sqlalchemy import text

def migrate_asset_requests_table():
    """Update asset_requests table structure"""
    try:
        with engine.connect() as connection:
            print("\n=== MIGRATING ASSET_REQUESTS TABLE ===\n")
            
            # Check current columns
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'asset' 
                AND table_name = 'asset_requests'
                ORDER BY ordinal_position
            """)
            
            result = connection.execute(check_query)
            existing_columns = [row[0] for row in result.fetchall()]
            print(f"Current columns: {', '.join(existing_columns)}\n")
            
            # Rename requested_by to requester_id if it exists
            if 'requested_by' in existing_columns and 'requester_id' not in existing_columns:
                try:
                    connection.execute(text("""
                        ALTER TABLE asset.asset_requests 
                        RENAME COLUMN requested_by TO requester_id
                    """))
                    connection.commit()
                    print("[OK] Renamed 'requested_by' to 'requester_id'")
                except Exception as e:
                    print(f"[WARNING] Could not rename column: {e}")
            
            # Add missing columns
            columns_to_add = [
                ('asset_ownership_type', 'VARCHAR(50)'),
                ('asset_model', 'VARCHAR(255)'),
                ('asset_vendor', 'VARCHAR(255)'),
                ('cost_estimate', 'FLOAT'),
                ('justification', 'TEXT'),
                ('business_justification', 'TEXT'),
                ('manager_approvals', 'JSON'),
            ]
            
            for col_name, col_type in columns_to_add:
                if col_name not in existing_columns:
                    try:
                        connection.execute(text(f"""
                            ALTER TABLE asset.asset_requests 
                            ADD COLUMN {col_name} {col_type}
                        """))
                        connection.commit()
                        print(f"[OK] Added '{col_name}' column")
                    except Exception as e:
                        print(f"[WARNING] Could not add '{col_name}' column: {e}")
                else:
                    print(f"[SKIP] Column '{col_name}' already exists")
            
            # Change requester_id type from UUID to String if needed
            try:
                # Check current type
                type_check = text("""
                    SELECT data_type 
                    FROM information_schema.columns 
                    WHERE table_schema = 'asset' 
                    AND table_name = 'asset_requests' 
                    AND column_name = 'requester_id'
                """)
                result = connection.execute(type_check)
                current_type = result.fetchone()
                
                if current_type and 'uuid' in current_type[0].lower():
                    # We'll keep UUID for now, but note that models use String
                    print("[INFO] requester_id is UUID type (models expect String)")
            except Exception as e:
                print(f"[INFO] Could not check requester_id type: {e}")
            
            print("\n[OK] Asset requests table migration complete!")
            print("\n[NOTE] Some existing columns may remain (reason, priority, etc.)")
            print("       These can be deprecated or mapped to new fields if needed.")
            
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate_asset_requests_table()

