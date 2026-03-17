import psycopg2
from app.database.database import DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD

def migrate_users_db():
    try:
        conn = psycopg2.connect(
            host=DATABASE_HOST,
            port=DATABASE_PORT,
            database=DATABASE_NAME,
            user=DATABASE_USER,
            password=DATABASE_PASSWORD
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        # Add missing columns
        columns = [
            ("phone", "VARCHAR(20)"),
            ("position", "VARCHAR(50)"),
            ("domain", "VARCHAR(50)"),
            ("department", "VARCHAR(100)"),
            ("location", "VARCHAR(100)")
        ]
        
        for col_name, col_type in columns:
            try:
                cur.execute(f"ALTER TABLE auth.users ADD COLUMN {col_name} {col_type};")
                print(f"Added column {col_name} to auth.users")
            except psycopg2.errors.DuplicateColumn:
                print(f"Column {col_name} already exists in auth.users")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")
                
        cur.close()
        conn.close()
        print("Migration complete.")
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    migrate_users_db()
