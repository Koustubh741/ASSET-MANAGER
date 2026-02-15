
import sys
import os
import uuid
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import engine
from sqlalchemy import text

def seed_cloud_location():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Check if exists
            query = text("SELECT id FROM asset.locations WHERE name = 'Cloud'")
            result = conn.execute(query).first()
            
            if result:
                print(f"EXISTS:{result[0]}")
            else:
                new_id = uuid.uuid4()
                insert_query = text("INSERT INTO asset.locations (id, name, timezone) VALUES (:id, :name, :tz)")
                conn.execute(insert_query, {"id": new_id, "name": "Cloud", "tz": "UTC"})
                print(f"CREATED:{new_id}")
            
            trans.commit()
        except Exception as e:
            trans.rollback()
            print(f"ERROR:{e}")

if __name__ == "__main__":
    seed_cloud_location()
