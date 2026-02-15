
from sqlalchemy import text
from app.database.database import engine

def find_fks():
    with engine.connect() as conn:
        query = text("""
            SELECT
                tc.table_schema, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
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
            print(f"Table: {r.table_schema}.{r.table_name}, Column: {r.column_name} -> {r.foreign_table_schema}.{r.foreign_table_name}.{r.foreign_column_name}")

if __name__ == "__main__":
    find_fks()
