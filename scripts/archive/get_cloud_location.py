
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import engine
from sqlalchemy import text

def get_cloud_location():
    with engine.connect() as conn:
        query = text("SELECT id, name FROM asset.locations WHERE name ILIKE 'Cloud%' OR name ILIKE 'Remote%' LIMIT 1")
        result = conn.execute(query).first()
        if result:
            print(f"FOUND_ID:{result[0]}")
            print(f"FOUND_NAME:{result[1]}")
        else:
            print("NOT_FOUND")

if __name__ == "__main__":
    get_cloud_location()
