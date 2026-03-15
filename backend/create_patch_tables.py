import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base

# Add backend to path
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from app.database.database import SYNC_DATABASE_URL, Base
from app.models.models import SystemPatch, PatchDeployment, RemoteSession

def create_new_tables():
    engine = create_engine(SYNC_DATABASE_URL)
    print(f"Connecting to {SYNC_DATABASE_URL}...")
    
    # We only want to create the new tables, but create_all is safe as it skips existing ones
    Base.metadata.create_all(bind=engine)
    print("New tables created successfully (if they didn't exist).")

if __name__ == "__main__":
    create_new_tables()
