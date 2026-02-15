
from app.database.database import engine
from sqlalchemy import text

def inspect_table():
    try:
        with engine.connect() as connection:
            print("\n=== INSPECTING ASSET_ASSIGNMENTS TABLE ===\n")
            
            query = text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'asset' 
                AND table_name = 'asset_assignments'
            """)
            
            result = connection.execute(query)
            columns = result.fetchall()
            
            print(f"Found {len(columns)} columns:")
            for col in columns:
                print(f"- {col[0]} ({col[1]})")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_table()
