import sys
import os
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import engine
from sqlalchemy import text

def check():
    uid = 'e27e0658-4218-46b9-9cdb-30fbf35b38d7'
    sn = 'LAP-NDLSS-01-2026'
    with engine.connect() as conn:
        asset = conn.execute(text("SELECT id, serial_number FROM asset.assets WHERE id = :id"), {'id': uid}).fetchone()
        existing_sn = conn.execute(text("SELECT id FROM asset.assets WHERE serial_number = :sn"), {'sn': sn}).fetchone()
        print(f"Asset existence: {asset}")
        print(f"Serial existence: {existing_sn}")

if __name__ == "__main__":
    check()
