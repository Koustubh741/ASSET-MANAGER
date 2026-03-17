from sqlalchemy import create_engine, MetaData
from app.database.database import SYNC_DATABASE_URL
from app.models.models import DiscoveredSoftware

def create_table():
    print(f"[*] Creating table in {SYNC_DATABASE_URL}...")
    engine = create_engine(SYNC_DATABASE_URL)
    
    # We only want to create the DiscoveredSoftware table
    # Base.metadata.create_all(engine) would create everything, which is safer
    # but we can also use the model's __table__ object
    try:
        DiscoveredSoftware.__table__.create(engine)
        print("[SUCCESS] DiscoveredSoftware table created.")
    except Exception as e:
        print(f"[!] Error or table already exists: {e}")

if __name__ == "__main__":
    create_table()
