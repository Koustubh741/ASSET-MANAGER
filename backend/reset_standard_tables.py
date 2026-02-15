import sys
import os
from sqlalchemy import text

# Add root directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine, Base
import models # Load all models

def reset_tables():
    tables_to_reset = [
        "exit.exit_requests",
        "system.audit_logs",
        "system.api_tokens",
        "audit.procurement_logs",
        "procurement.purchase_orders",
        "procurement.purchase_invoices"
    ]
    
    with engine.begin() as conn:
        print("[*] Dropping standardized tables for re-initialization...")
        for table in tables_to_reset:
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
                print(f"[+] Dropped {table}")
            except Exception as e:
                print(f"[-] Error dropping {table}: {e}")
        
    print("[*] Creating all tables via unified metadata...")
    Base.metadata.create_all(bind=engine)
    print("[+] Done.")

if __name__ == "__main__":
    reset_tables()
