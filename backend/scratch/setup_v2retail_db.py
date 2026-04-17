import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    user="postgres",
    password="Koustubh@123",
    dbname="postgres" # Connect to default db to create a new one
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

cursor = conn.cursor()
try:
    cursor.execute("CREATE DATABASE \"ITSM_V2RETAIL\"")
    print("Database ITSM_V2RETAIL created successfully.")
except psycopg2.errors.DuplicateDatabase:
    print("Database ITSM_V2RETAIL already exists.")
finally:
    cursor.close()
    conn.close()
