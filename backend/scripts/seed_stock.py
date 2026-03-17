import uuid
from datetime import datetime, date
from app.database.database import SessionLocal
from app.models.models import Asset, AssetInventory

def add_dummy_stock():
    db = SessionLocal()
    try:
        dummy_items = [
            ("MacBook Pro 14\"", "Laptop", "Apple", "M2 Pro", "LPT-MBP-14-001", "Headquarters", 1999.99),
            ("Dell XPS 15", "Laptop", "Dell", "9530", "LPT-XPS-15-002", "New York", 1799.00),
            ("ThinkPad T14", "Laptop", "Lenovo", "Gen 4", "LPT-TP-T14-003", "London", 1249.50),
            ("iPad Pro 12.9", "Tablet", "Apple", "6th Gen", "TBL-IPAD-12-004", "San Francisco", 1099.00),
            ("Samsung S23 Ultra", "Mobile", "Samsung", "SM-S918B", "MOB-S23U-005", "Tokyo", 1199.00),
            ("Cisco Router C1111", "Network", "Cisco", "C1111-8P", "NET-CIS-1111-006", "Data Center A", 850.00),
            ("HP LaserJet Pro", "Printer", "HP", "M404dn", "PRN-HP-LJ-007", "Finance Office", 349.00),
            ("Sony WH-1000XM5", "Peripherals", "Sony", "WH1000XM5", "PER-SNY-XM5-008", "HR Dept", 399.99),
            ("LG UltraWide 34\"", "Monitor", "LG", "34WP65G", "MON-LG-34-009", "Design Lab", 449.00),
            ("Logitech MX Master 3S", "Peripherals", "Logitech", "910-006557", "PER-LOG-MX3S-010", "Engineering", 99.00),
        ]

        print(f"Adding 10 stock items...")
        for name, a_type, vendor, model, serial, loc, cost in dummy_items:
            # Check if serial exists to avoid uniques violation
            existing = db.query(Asset).filter(Asset.serial_number == serial).first()
            if existing:
                print(f"Skipping {serial} - already exists")
                continue

            # Create Asset
            asset_id = str(uuid.uuid4())
            new_asset = Asset(
                id=asset_id,
                name=name,
                type=a_type,
                vendor=vendor,
                model=model,
                serial_number=serial,
                status="In Stock",
                location=loc,
                cost=cost,
                purchase_date=date.today(),
                segment="IT"
            )
            db.add(new_asset)

            # Create Inventory Entry
            inventory_id = str(uuid.uuid4())
            new_inv = AssetInventory(
                id=inventory_id,
                asset_id=asset_id,
                location=loc,
                status="Available",
                availability_flag=True,
                stocked_at=datetime.now()
            )
            db.add(new_inv)
            
            print(f"Added: {name} ({serial})")

        db.commit()
        print("Successfully committed 10 items to stock.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding stock: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_dummy_stock()
