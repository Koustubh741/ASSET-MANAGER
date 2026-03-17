from app.database.database import engine
from sqlalchemy import inspect

def dump_columns():
    inspector = inspect(engine)
    for schema in ['helpdesk', 'support']:
        print(f"\nColumns in {schema}.tickets:")
        columns = inspector.get_columns('tickets', schema=schema)
        for col in columns:
            print(f"  - {col['name']} ({col['type']})")

if __name__ == "__main__":
    dump_columns()
