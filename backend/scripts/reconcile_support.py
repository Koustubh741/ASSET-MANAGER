from sqlalchemy import text
from app.database.database import engine

def reconcile_support_schema():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Reconciling support.tickets schema...")
            
            # 1. Subject/Title
            conn.execute(text("""
                DO $$ 
                BEGIN 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='support' AND table_name='tickets' AND column_name='title') THEN
                        ALTER TABLE support.tickets RENAME COLUMN title TO subject;
                    END IF;
                END $$;
            """))

            # 2. Add missing columns
            cols_to_add = [
                ("category", "VARCHAR(100)"),
                ("requestor_id", "VARCHAR"),
                ("assigned_to_id", "VARCHAR"),
                ("related_asset_id", "VARCHAR"),
                ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
            ]
            
            for col_name, col_type in cols_to_add:
                conn.execute(text(f"""
                    ALTER TABLE support.tickets 
                    ADD COLUMN IF NOT EXISTS {col_name} {col_type}
                """))
            
            # 3. Handle data if created_by exists
            conn.execute(text("""
                DO $$ 
                BEGIN 
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='support' AND table_name='tickets' AND column_name='created_by') THEN
                        UPDATE support.tickets SET requestor_id = created_by::text WHERE requestor_id IS NULL;
                    END IF;
                END $$;
            """))

            trans.commit()
            print("Successfully reconciled support.tickets!")
        except Exception as e:
            trans.rollback()
            print(f"Failed to reconcile: {e}")

if __name__ == "__main__":
    reconcile_support_schema()
