
from sqlalchemy import text
from app.database.database import engine

def find_fks_with_names():
    with engine.connect() as conn:
        query = text("""
            SELECT
                tc.constraint_name,
                tc.table_schema, 
                tc.table_name, 
                kcu.column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND ccu.table_name='assets'
              AND ccu.table_schema='asset';
        """)
        results = conn.execute(query)
        print("Foreign keys pointing to asset.assets:")
        for r in results:
            print(f"Constraint: {r.constraint_name}, Table: {r.table_schema}.{r.table_name}, Column: {r.column_name}")

if __name__ == "__main__":
    find_fks_with_names()
