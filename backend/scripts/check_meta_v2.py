from app.database.database import engine
from sqlalchemy import text

def check_nullability():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT column_name, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'support' AND table_name = 'tickets'
            ORDER BY column_name
        """))
        print("COL_START")
        for row in result:
            print(f"{row[0]}|{row[1]}|{row[2]}")
        print("COL_END")

if __name__ == "__main__":
    check_nullability()
