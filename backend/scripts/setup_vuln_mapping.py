import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.database.database import engine
from app.models.models import VulnerabilityMapping

def run():
    print("Creating VulnerabilityMapping table...")
    VulnerabilityMapping.__table__.create(engine, checkfirst=True)
    print("Table created successfully.")

if __name__ == "__main__":
    run()
