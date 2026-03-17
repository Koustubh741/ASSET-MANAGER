
from sqlalchemy import text
from app.database.database import engine

def migrate():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Dynamically dropping all foreign keys pointing to asset.assets(id)...")
            drop_query = text("""
                DO $$ 
                DECLARE 
                    r RECORD;
                BEGIN
                    FOR r IN (
                        SELECT tc.constraint_name, tc.table_schema, tc.table_name
                        FROM information_schema.table_constraints AS tc 
                        JOIN information_schema.constraint_column_usage AS ccu 
                          ON ccu.constraint_name = tc.constraint_name 
                          AND ccu.table_schema = tc.table_schema
                        WHERE tc.constraint_type = 'FOREIGN KEY' 
                          AND ccu.table_name = 'assets' 
                          AND ccu.table_schema = 'asset'
                    ) LOOP
                        EXECUTE 'ALTER TABLE ' || r.table_schema || '.' || r.table_name || ' DROP CONSTRAINT ' || r.constraint_name;
                    END LOOP;
                END $$;
            """)
            conn.execute(drop_query)
            
            print("Altering ALL ID-related columns in 'asset' schema to VARCHAR...")
            # We already know which tables and columns might be affected
            # But let's be thorough for the ones we saw
            
            # 1. Main assets table
            conn.execute(text("ALTER TABLE asset.assets ALTER COLUMN id TYPE VARCHAR(255) USING id::text"))
            
            # 2. Referencing columns we found
            conn.execute(text("ALTER TABLE asset.asset_assignments ALTER COLUMN asset_id TYPE VARCHAR(255) USING asset_id::text"))
            conn.execute(text("ALTER TABLE asset.maintenance ALTER COLUMN asset_id TYPE VARCHAR(255) USING asset_id::text"))
            
            # Check if asset_requests has allocated_asset_id
            conn.execute(text("ALTER TABLE asset.asset_requests ALTER COLUMN allocated_asset_id TYPE VARCHAR(255) USING allocated_asset_id::text"))
            
            # If there are any other columns, they are no longer constrained so they won't block the alter of 'assets.id'
            # But it's good to hit the common ones.
            
            trans.commit()
            print("Migration successful! Assets can now have custom IDs like 'AST-736'.")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
