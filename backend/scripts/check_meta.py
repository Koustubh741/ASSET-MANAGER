from app.database.database import engine
from sqlalchemy import text

def check_nullability():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT column_name, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'support' AND table_name = 'tickets'
        """))
        for row in result:
            print(f"Column: {row[0]}, Nullable: {row[1]}, Default: {row[2]}")

if __name__ == "__main__":
    check_nullability()
