from sqlalchemy import text
from app.database.database import engine

def apply_migration():
    """
    Adds resolution details columns to the support.tickets table
    to reflect the new ticket resolution workflow.
    """
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Applying migration to support.tickets...")
            
            # Check if columns already exist to avoid errors
            # 1. resolution_notes
            conn.execute(text("""
                ALTER TABLE support.tickets 
                ADD COLUMN IF NOT EXISTS resolution_notes TEXT
            """))
            
            # 2. resolution_checklist
            conn.execute(text("""
                ALTER TABLE support.tickets 
                ADD COLUMN IF NOT EXISTS resolution_checklist JSON
            """))
            
            # 3. resolution_percentage
            conn.execute(text("""
                ALTER TABLE support.tickets 
                ADD COLUMN IF NOT EXISTS resolution_percentage FLOAT DEFAULT 0.0
            """))
            
            trans.commit()
            print("Migration successful! Resolution columns added to support.tickets.")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    apply_migration()
