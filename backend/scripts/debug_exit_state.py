
"""
Debug script to check Users, Assets, and Assignments
"""
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal
from app.models.models import User, Asset, AssetAssignment, ExitRequest
from sqlalchemy import func

def debug_db():
    session = SessionLocal()
    try:
        print("=== USERS ===")
        users = session.query(User).all()
        for u in users:
            print(f"ID: {u.id} | Name: {u.full_name} | Email: {u.email} | Role: {u.role}")

        print("\n=== ASSET ASSIGNMENTS (Table) ===")
        assignments = session.query(AssetAssignment).all()
        for a in assignments:
            print(f"AssetID: {a.asset_id} -> UserID: {a.user_id}")

        print("\n=== ASSETS (Raw 'assigned_to' field) ===")
        assets = session.query(Asset).filter(Asset.assigned_to.isnot(None)).all()
        for a in assets:
            print(f"Asset: {a.name} | AssignedTo: {a.assigned_to}")

        print("\n=== EXIT REQUESTS ===")
        exits = session.query(ExitRequest).all()
        for e in exits:
            print(f"ExitID: {e.id} | UserID: {e.user_id} | Snapshot Len: {len(e.assets_snapshot) if e.assets_snapshot else 0}")
            
    finally:
        session.close()

if __name__ == "__main__":
    debug_db()
