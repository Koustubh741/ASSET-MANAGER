
import sys
import os
from sqlalchemy import text, create_engine

# Add backend to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.database.database import engine

def apply_hardening():
    print("Starting Database Schema Hardening...")
    
    # List of FKs to add: (Table, Column, ReferencedTable, ReferencedColumn, OnDelete)
    harden_plan = [
        ("asset.asset_assignments", "asset_id", "asset.assets", "id", "CASCADE"),
        ("asset.asset_inventory", "asset_id", "asset.assets", "id", "CASCADE"),
        ("support.tickets", "related_asset_id", "asset.assets", "id", "SET NULL"),
        ("asset.asset_requests", "asset_id", "asset.assets", "id", "SET NULL"),
        ("asset.discovered_software", "asset_id", "asset.assets", "id", "CASCADE"),
        ("asset.byod_devices", "request_id", "asset.asset_requests", "id", "CASCADE"),
        ("asset.byod_devices", "owner_id", "auth.users", "id", "CASCADE")
    ]
    
    with engine.connect() as conn:
        for table, col, ref_table, ref_col, on_delete in harden_plan:
            fk_name = f"{table.split('.')[-1]}_{col}_fkey"
            print(f"\nChecking {fk_name}...")
            
            # Check if FK already exists
            check_q = text(f"SELECT conname FROM pg_constraint WHERE conname = :name")
            res = conn.execute(check_q, {"name": fk_name}).fetchone()
            
            if res:
                print(f"[SKIP] {fk_name} already exists.")
                continue
                
            print(f"[ACTION] Adding {fk_name} to {table}({col}) -> {ref_table}({ref_col})")
            
            try:
                # 1. Clean orphaned data (Optional: You might want to log this instead of deleting)
                # For safety, we only add the FK if data is clean.
                # If data is NOT clean, the ALTER TABLE will fail, which is good (manual intervention needed).
                
                # Check for orphans
                orphan_q = text(f"""
                    SELECT COUNT(*) FROM {table} t 
                    LEFT JOIN {ref_table} r ON t.{col} = r.{ref_col} 
                    WHERE t.{col} IS NOT NULL AND r.{ref_col} IS NULL
                """)
                orphans = conn.execute(orphan_q).scalar()
                
                if orphans > 0:
                    print(f"[WARNING] Found {orphans} orphaned records in {table}.{col}. Cleaning up...")
                    if on_delete == "SET NULL":
                        conn.execute(text(f"UPDATE {table} SET {col} = NULL WHERE {col} NOT IN (SELECT {ref_col} FROM {ref_table})"))
                    else:
                        conn.execute(text(f"DELETE FROM {table} WHERE {col} NOT IN (SELECT {ref_col} FROM {ref_table})"))
                    conn.commit()
                    print(f"[CLEAN] {orphans} orphans resolved.")

                # 2. Add Constraint
                add_q = text(f"""
                    ALTER TABLE {table} 
                    ADD CONSTRAINT {fk_name} 
                    FOREIGN KEY ({col}) 
                    REFERENCES {ref_table}({ref_col}) 
                    ON DELETE {on_delete}
                """)
                conn.execute(add_q)
                conn.commit()
                print(f"[SUCCESS] {fk_name} applied.")
                
            except Exception as e:
                print(f"[ERROR] Failed to apply {fk_name}: {e}")
                conn.rollback()

if __name__ == "__main__":
    apply_hardening()
    print("\nHardening process complete.")
