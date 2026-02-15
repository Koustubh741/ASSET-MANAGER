"""
Migration script to add status, position, and domain columns to auth.users table
"""
from app.database.database import engine
from sqlalchemy import text

def migrate_user_table():
    """Add missing columns to users table"""
    try:
        with engine.connect() as connection:
            print("\n=== MIGRATING USER TABLE ===\n")
            
            # Check if columns already exist
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'auth' 
                AND table_name = 'users' 
                AND column_name IN ('status', 'position', 'domain')
            """)
            
            result = connection.execute(check_query)
            existing_columns = [row[0] for row in result.fetchall()]
            
            # Add status column if it doesn't exist
            if 'status' not in existing_columns:
                try:
                    connection.execute(text("""
                        ALTER TABLE auth.users 
                        ADD COLUMN status VARCHAR(50) DEFAULT 'PENDING'
                    """))
                    connection.commit()
                    print("[OK] Added 'status' column (default: 'PENDING')")
                except Exception as e:
                    print(f"[WARNING] Could not add 'status' column: {e}")
            else:
                print("[SKIP] Column 'status' already exists")
            
            # Add position column if it doesn't exist
            if 'position' not in existing_columns:
                try:
                    connection.execute(text("""
                        ALTER TABLE auth.users 
                        ADD COLUMN position VARCHAR(50)
                    """))
                    connection.commit()
                    print("[OK] Added 'position' column")
                except Exception as e:
                    print(f"[WARNING] Could not add 'position' column: {e}")
            else:
                print("[SKIP] Column 'position' already exists")
            
            # Add domain column if it doesn't exist
            if 'domain' not in existing_columns:
                try:
                    connection.execute(text("""
                        ALTER TABLE auth.users 
                        ADD COLUMN domain VARCHAR(50)
                    """))
                    connection.commit()
                    print("[OK] Added 'domain' column")
                except Exception as e:
                    print(f"[WARNING] Could not add 'domain' column: {e}")
            else:
                print("[SKIP] Column 'domain' already exists")
            
            # Update existing users to have ACTIVE status if they don't have one
            try:
                connection.execute(text("""
                    UPDATE auth.users 
                    SET status = 'ACTIVE' 
                    WHERE status IS NULL OR status = ''
                """))
                connection.commit()
                print("[OK] Updated existing users to ACTIVE status")
            except Exception as e:
                print(f"[WARNING] Could not update existing users: {e}")
            
            print("\n[OK] User table migration complete!")
            
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate_user_table()

