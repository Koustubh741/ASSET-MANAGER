import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\services\asset_request_service.py'

with open(file_path, 'r') as f:
    content = f.read()

# Pattern 1: joinedload(AssetRequest.purchase_orders) -> joinedload(AssetRequest.purchase_orders).joinedload(PurchaseOrder.invoice)
# Specifically targeting the ones that don't have it yet.
# We match optional trailing whitespace.

pattern = re.compile(r'joinedload\(AssetRequest\.purchase_orders\)(?!\.joinedload\(PurchaseOrder\.invoice\))')
new_content = pattern.sub('joinedload(AssetRequest.purchase_orders).joinedload(PurchaseOrder.invoice)', content)

# Also fix the specific lines that use select(AssetRequest).options(...) to include the extra nested load
# But the regex above should catch them if they are in the format joinedload(AssetRequest.purchase_orders).

with open(file_path, 'w') as f:
    f.write(new_content)

print("Successfully updated asset_request_service.py with nested relationship loading.")
