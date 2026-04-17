import psycopg2

conn = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    user="postgres",
    password="Koustubh@123",
    dbname="ITSM_V2RETAIL"
)
conn.autocommit = True
cursor = conn.cursor()

schemas = [
    "asset", "auth", "support", "procurement", 
    "finance", "exit", "system", "audit", "public"
]

for schema in schemas:
    try:
        cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema};")
        print(f"Created schema {schema}")
    except Exception as e:
        print(f"Failed to create schema {schema}: {e}")

cursor.close()
conn.close()
