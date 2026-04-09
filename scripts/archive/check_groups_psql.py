import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

DB_URL = os.environ.get("DATABASE_URL")
if DB_URL and "postgresql+asyncpg://" in DB_URL:
    DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://")


def check_groups():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        print("--- Assignment Groups (support.assignment_groups) ---")
        cur.execute("SELECT name, department FROM support.assignment_groups ORDER BY name;")
        groups = cur.fetchall()
        for name, dept in groups:
            print(f"Name: {name} | Dept: {dept}")

        print("\n--- Departments (auth.departments) ---")
        cur.execute("SELECT name, slug FROM auth.departments ORDER BY name;")
        depts = cur.fetchall()
        for name, slug in depts:
            print(f"Name: {name} | Slug: {slug}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_groups()
