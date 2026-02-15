from sqlalchemy import text
from app.database.database import engine

def fix_constraints():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Fixing constraints on support.tickets...")
            
            # Make columns nullable or add defaults
            conn.execute(text("ALTER TABLE support.tickets ALTER COLUMN created_at SET DEFAULT NOW()"))
            conn.execute(text("ALTER TABLE support.tickets ALTER COLUMN created_at DROP NOT NULL"))
            
            conn.execute(text("ALTER TABLE support.tickets ALTER COLUMN created_by DROP NOT NULL"))
            
            # Ensure priority and status have defaults if possible, but they are handled by model
            
            trans.commit()
            print("Successfully fixed constraints!")
        except Exception as e:
            trans.rollback()
            print(f"Failed to fix: {e}")

if __name__ == "__main__":
    fix_constraints()
