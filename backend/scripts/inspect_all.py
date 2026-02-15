
from sqlalchemy import inspect
from app.database.database import engine

def inspect_all():
    inspector = inspect(engine)
    for schema in ['asset', 'helpdesk', 'auth', 'procurement', 'exit', 'system']:
        tables = inspector.get_table_names(schema=schema)
        for table in tables:
            print(f"Table: {schema}.{table}")
            columns = inspector.get_columns(table, schema=schema)
            for col in columns:
                if 'id' in col['name'].lower():
                    print(f"  Column: {col['name']}, Type: {col['type']}")

if __name__ == "__main__":
    inspect_all()
