
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import engine
from sqlalchemy import text

def list_locations():
    with engine.connect() as conn:
        query = text("SELECT id, name FROM asset.locations")
        results = conn.execute(query).fetchall()
        for r in results:
            print(f"{r[0]} | {r[1]}")

if __name__ == "__main__":
    list_locations()
