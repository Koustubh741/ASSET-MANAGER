import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:Koustubh%40123@127.0.0.1:5432/ITSM")

def check_schema():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        tables = [
            'patch_deployment_jobs',
            'patch_logs',
            'system_patches',
            'patch_deployments',
            'agent_commands'
        ]
        
        print("--- Database Schema Audit ---")
        for table in tables:
            cur.execute(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'asset' AND table_name = '{table}';
            """)
            cols = cur.fetchall()
            if not cols:
                # Some tables might be in 'system' schema
                cur.execute(f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_schema = 'system' AND table_name = '{table}';
                """)
                cols = cur.fetchall()
                schema = 'system' if cols else 'asset'
            else:
                schema = 'asset'
                
            if cols:
                print(f"\n[+] Table: {schema}.{table}")
                for col, dtype in cols:
                    print(f"  - {col}: {dtype}")
            else:
                print(f"\n[!] Table: {table} NOT FOUND in 'asset' or 'system' schema")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
