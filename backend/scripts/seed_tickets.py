import sys
import os
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

# Add parent directory to path to import models and database
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")

from app.database.database import SessionLocal
from app.models.models import Ticket, Asset, User

def seed_tickets():
    db = SessionLocal()
    try:
        # Get some assets and users
        assets = db.query(Asset).limit(5).all()
        users = db.query(User).limit(5).all()
        
        if not assets or not users:
            print("No assets or users found. Please seed assets and users first.")
            return

        ticket_scenarios = [
            {"subject": "Keyboard keys sticking", "desc": "The 'A' and 'S' keys on my laptop keyboard are sticking and hard to press.", "priority": "Medium"},
            {"subject": "Blue screen on startup", "desc": "Laptop showing BSOD with error CRITICAL_PROCESS_DIED intermittently.", "priority": "High"},
            {"subject": "VPN connection issues", "desc": "Cannot connect to the corporate VPN from home network.", "priority": "Medium"},
            {"subject": "Request for Adobe Creative Cloud", "desc": "Need Adobe Illustrator for the new marketing project.", "priority": "Low"},
            {"subject": "Monitor flickering", "desc": "External monitor flickers every few minutes when connected via HDMI.", "priority": "Medium"},
        ]

        for i, scenario in enumerate(ticket_scenarios):
            target_asset = assets[i % len(assets)]
            target_user = users[i % len(users)]
            
            new_ticket = Ticket(
                subject=scenario["subject"],
                description=scenario["desc"],
                priority=scenario["priority"],
                status="OPEN",
                requestor_id=target_user.id,
                related_asset_id=target_asset.id,
                created_at=datetime.utcnow() - timedelta(days=i),
                timeline=[
                    {
                        "action": "CREATED",
                        "byRole": "END_USER",
                        "byUser": target_user.full_name,
                        "timestamp": (datetime.utcnow() - timedelta(days=i)).isoformat(),
                        "comment": "Ticket created via portal"
                    }
                ]
            )
            db.add(new_ticket)
            db.commit() # Commit one by one to avoid batch insert issues
            print(f"Seeded ticket {i+1}: {scenario['subject']}")
        
        print("Successfully seeded all tickets.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_tickets()
