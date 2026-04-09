import os
import re

model_file = r'd:\ASSET-MANAGER\backend\app\models\models.py'
service_file = r'd:\ASSET-MANAGER\backend\app\services\asset_request_service.py'
router_file = r'd:\ASSET-MANAGER\backend\app\routers\asset_requests.py'

# 1. Remove hybrid property from models.py to prevent Pydantic triggers
with open(model_file, 'r', encoding='utf-8') as f:
    m_content = f.read()

m_content = re.sub(r'\s+@hybrid_property\s+def requester_department\(self\):.*?\n\s+return self\.requester\.department if self\.requester else None\n', '', m_content, flags=re.DOTALL)

with open(model_file, 'w', encoding='utf-8') as f:
    f.write(m_content)

# 2. Restore notifications in router_file
with open(router_file, 'r', encoding='utf-8') as f:
    r_content = f.read()

r_content = r_content.replace('# await send_notification(db, id, "status_change"', 'await send_notification(db, id, "status_change"')

with open(router_file, 'w', encoding='utf-8') as f:
    f.write(r_content)

# 3. Final, clean _populate_requester_info in service_file
# This version avoids model_validate(db_request) and manually maps fields
# It uses model_validate(data_dict) which is 100% async-safe.

clean_service = """
async def _populate_requester_info(db: AsyncSession, db_request: AssetRequest, user_role: str = None) -> AssetRequestResponse:
    \"\"\"Helper to add requester name/email and procurement info (role-sensitive) without triggering lazy-loads\"\"\"
    # Map basic fields from model to dict
    data = {c.name: getattr(db_request, c.name) for c in db_request.__table__.columns}
    data['id'] = db_request.id
    # Handle fields that might have different names or logic
    data['created_at'] = db_request.created_at
    data['updated_at'] = db_request.updated_at
    
    # Instantiate Response with only base fields first
    res = AssetRequestResponse.model_validate(data)
    
    # Manually populate requester fields with safety
    if db_request.requester:
        res.requester_name = db_request.requester.full_name
        res.requester_email = db_request.requester.email
        if db_request.requester.dept_obj:
            res.requester_department = db_request.requester.dept_obj.name
        else:
            res.requester_department = "N/A"
            
    # Populate PO/Invoice
    if db_request.purchase_orders:
        po = db_request.purchase_orders[0]
        if user_role in ["PROCUREMENT", "FINANCE", "ADMIN"]:
            res.purchase_order = {
                "id": po.id,
                "vendor_name": po.vendor_name,
                "total_cost": po.total_cost,
                "status": po.status,
                "po_pdf_path": po.po_pdf_path,
                "extracted_data": po.extracted_data
            }
            if po.invoice:
                inv = po.invoice
                res.purchase_invoice = {
                    "purchase_date": inv.purchase_date.isoformat() if inv.purchase_date else None,
                    "total_amount": inv.total_amount,
                    "invoice_pdf_path": inv.invoice_pdf_path
                }
        elif user_role == "IT_MANAGEMENT":
            res.purchase_order = {
                "status": po.status,
                "vendor_name": po.vendor_name
            }

    # Virtual/Audit fields (already loaded or computed)
    res.current_owner_role = db_request.current_owner_role or STATUS_MAP.get(db_request.status, (None, None))[0]
    res.procurement_stage = db_request.procurement_stage or STATUS_MAP.get(db_request.status, (None, None))[1]
    
    return res
"""

with open(service_file, 'r', encoding='utf-8') as f:
    s_content = f.read()

# Replace the function
start_marker = "async def _populate_requester_info"
return_idx = s_content.find("return res", s_content.find(start_marker))
next_line_idx = s_content.find("\n", return_idx) + 1

s_new = s_content[:s_content.find(start_marker)] + clean_service + s_content[next_line_idx:]

with open(service_file, 'w', encoding='utf-8') as f:
    f.write(s_new)

print("Applied final decoupling fix: Removed hybrid properties and used dict-based Pydantic population.")
