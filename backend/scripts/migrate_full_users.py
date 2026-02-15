
from app.database.database import engine
from sqlalchemy import text

def migrate_users():
    print("=== STARTING FULL USER TABLE MIGRATION ===")
    
    with engine.connect() as conn:
        # Get existing columns
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='users'"))
        existing_cols = [r[0] for r in result.fetchall()]
        print(f"Existing columns: {existing_cols}")
        
        # Define fields to ensure exist
        fields_to_add = [
            ("full_name", "VARCHAR(255)"),
            ("password_hash", "VARCHAR(255)"),
            ("status", "VARCHAR(50) DEFAULT 'PENDING'"),
            ("position", "VARCHAR(50)"),
            ("domain", "VARCHAR(50)"),
            ("department", "VARCHAR(100)"),
            ("location", "VARCHAR(100)"),
            ("phone", "VARCHAR(20)"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
        ]
        
        for col_name, col_def in fields_to_add:
            if col_name not in existing_cols:
                print(f"Adding column: {col_name}")
                try:
                    conn.execute(text(f"ALTER TABLE auth.users ADD COLUMN {col_name} {col_def}"))
                    conn.commit()
                except Exception as e:
                    print(f"Error adding {col_name}: {e}")
                    conn.rollback()
            else:
                print(f"Column {col_name} already exists.")
                
        # Handle password_hash migration if 'password' exists but 'password_hash' doesn't
        if 'password' in existing_cols and 'password_hash' not in existing_cols:
             print("Migrating data from 'password' to 'password_hash'...")
             # This requires adding password_hash first (handled above)
             try:
                 conn.execute(text("UPDATE auth.users SET password_hash = password WHERE password_hash IS NULL"))
                 conn.commit()
             except Exception as e:
                 print(f"Error migrating password data: {e}")

        # Handle updated_at default
        if "updated_at" in existing_cols or "updated_at" in [f[0] for f in fields_to_add]:
             pass # Already added or exists

    print("=== MIGRATION COMPLETE ===")

if __name__ == "__main__":
    try:
        migrate_users()
    except Exception as e:
        print(f"Migration failed: {e}")
