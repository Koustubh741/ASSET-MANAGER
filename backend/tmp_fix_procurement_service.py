import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\services\procurement_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for AssetRequest re-fetches in procurement_service
# select(AssetRequest).filter(...)
p1 = re.compile(r'select\(AssetRequest\)\.filter')
new_content = p1.sub('select(AssetRequest).options(joinedload(AssetRequest.requester).joinedload(User.dept_obj), joinedload(AssetRequest.purchase_orders).joinedload(PurchaseOrder.invoice)).filter', content)

# Need to ensure joinedload and User, PurchaseOrder, invoice (via model PurchaseOrder) are available.
# Actually joinedload is NOT imported in procurement_service yet.
# And PurchaseOrder is imported at line 4. PurchaseInvoice at line 4.

if 'from sqlalchemy.orm import joinedload' not in new_content:
    new_content = new_content.replace('from sqlalchemy.future import select', 'from sqlalchemy.future import select\nfrom sqlalchemy.orm import joinedload')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully updated procurement_service.py with relationship pre-fetching.")
