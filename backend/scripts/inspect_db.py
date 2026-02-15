
from sqlalchemy import inspect
from app.database.database import engine

def inspect_schema():
    inspector = inspect(engine)
    columns = inspector.get_columns('assets', schema='asset')
    print("Columns in asset.assets:")
    for col in columns:
        print(f"Name: {col['name']}, Type: {col['type']}")

if __name__ == "__main__":
    inspect_schema()
