
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

try:
    from backend.app.models.models import Asset
    from sqlalchemy.orm import attributes
    import uuid

    print("Checking Asset model...")
    a = Asset(
        id=uuid.uuid4(),
        name="Test Asset",
        type="Networking",
        model="Neighbor Node",
        vendor="Unknown Vendor",
        serial_number="STUB-123456",
        status="Discovered",
        segment="IT"
    )

    print(f"ID: {a.id}")
    print(f"Name: {a.name}")
    print(f"Type: {a.type}")
    print(f"Model: {a.model}")
    print(f"Vendor: {a.vendor}")
    print(f"Serial Number: {a.serial_number}")
    print(f"Segment: {a.segment}")
    print(f"Status: {a.status}")

    # Check if they are mapped columns
    from sqlalchemy import inspect
    mapper = inspect(Asset)
    for col in ["model", "vendor", "serial_number"]:
        if col in mapper.attrs:
            print(f"Column '{col}' is correctly mapped.")
        else:
            print(f"Column '{col}' is NOT mapped!")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
