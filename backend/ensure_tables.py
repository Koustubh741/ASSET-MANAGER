import sys
import os

# Add root directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine, Base
import models # Load all models into metadata

def create_all():
    print("[*] Creating all unified model tables...")
    Base.metadata.create_all(bind=engine)
    print("[+] Done.")

if __name__ == "__main__":
    create_all()
