"""
Migration script to initialize Exit Workflow tables
"""
from app.database.database import engine
from sqlalchemy import text

def migrate_exit_workflow():
    """Create exit schema and tables"""
    try:
        with engine.connect() as connection:
            print("\n=== MIGRATING EXIT WORKFLOW TABLES ===\n")
            
            # 1. Create 'exit' schema if not exists
            print("Checking 'exit' schema...")
            connection.execute(text("CREATE SCHEMA IF NOT EXISTS exit"))
            connection.commit()
            print("[OK] Schema 'exit' verified")
            
            # 2. Create exit_requests table
            print("Checking 'exit_requests' table...")
            
            # Check if table exists
            check_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'exit' 
                AND table_name = 'exit_requests'
            """)
            result = connection.execute(check_query)
            
            if result.fetchone():
                print("[SKIP] Table 'exit.exit_requests' already exists")
            else:
                # Create table
                # Note: We use text/JSON types for snapshots which maps to JSON in model
                create_table_query = text("""
                    CREATE TABLE exit.exit_requests (
                        id VARCHAR PRIMARY KEY,
                        user_id VARCHAR NOT NULL,
                        status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
                        assets_snapshot JSON,
                        byod_snapshot JSON,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                connection.execute(create_table_query)
                
                # Add indices
                connection.execute(text("CREATE INDEX IF NOT EXISTS ix_exit_exit_requests_id ON exit.exit_requests (id)"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS ix_exit_exit_requests_user_id ON exit.exit_requests (user_id)"))
                
                connection.commit()
                print("[OK] Created table 'exit.exit_requests'")
            
            print("\n[OK] Exit workflow migration complete!")
            
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate_exit_workflow()
