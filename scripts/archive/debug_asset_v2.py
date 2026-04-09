
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

try:
    from backend.app.models.models import Asset
    from sqlalchemy import inspect
    import uuid

    print("--- Asset Model Inspection ---")
    mapper = inspect(Asset)
    
    for attr in mapper.all_orm_descriptors:
        if hasattr(attr, 'key'):
            col = getattr(Asset, attr.key)
            if hasattr(col, 'expression'):
                print(f"Attribute: {attr.key} -> Column: {col.expression.name} (Type: {col.expression.type})")
            else:
                print(f"Attribute: {attr.key} (Non-column)")
                
    print("\n--- Asset Instance Check ---")
    a = Asset(
        id=uuid.uuid4(),
        name="Test Asset",
        type="Networking",
        model="Neighbor Node",
        vendor="Unknown Vendor",
        serial_number="STUB-123456"
    )

    print(f"Instance model value: {a.model}")
    print(f"Instance vendor value: {a.vendor}")
    print(f"Instance serial_number value: {a.serial_number}")

    # Inspect the state
    from sqlalchemy import inspect
    state = inspect(a)
    print("\n--- Instance State ---")
    for attr in state.attrs:
        print(f"{attr.key}: {attr.value}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
