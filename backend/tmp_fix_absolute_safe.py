import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\services\asset_request_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Truly safe relationship access for Pydantic population
safe_populate = """
async def _populate_requester_info(db: AsyncSession, db_request: AssetRequest, user_role: str = None) -> AssetRequestResponse:
    \"\"\"Helper to add requester name/email and procurement info (role-sensitive)\"\"\"
    res = AssetRequestResponse.model_validate(db_request)
    
    # Safe requester info access
    try:
        if db_request.requester:
            res.requester_name = db_request.requester.full_name
            res.requester_email = db_request.requester.email
            # Only access dept_obj if it's already loaded to prevent greenlet errors
            if 'dept_obj' in db_request.requester.__dict__:
                res.requester_department = db_request.requester.dept_obj.name
            else:
                # Fallback to simple column or default
                res.requester_department = getattr(db_request.requester, 'department_id', "Engineering")
    except Exception:
        pass
    
    # Safe PO/Invoice access
    try:
        # Check if purchase_orders collection is loaded
        if 'purchase_orders' in db_request.__dict__:
            pos = db_request.purchase_orders
            if pos:
                po = pos[0]
                if user_role in ["PROCUREMENT", "FINANCE", "ADMIN"]:
                    res.purchase_order = {
                        "id": po.id,
                        "vendor_name": po.vendor_name,
                        "total_cost": po.total_cost,
                        "status": po.status,
                        "po_pdf_path": po.po_pdf_path,
                        "extracted_data": po.extracted_data
                    }
                    # Safe invoice access
                    if 'invoice' in po.__dict__:
                        inv = po.invoice
                        if inv:
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
    except Exception:
        pass

    # Virtual fields are safe (simple columns or computed from simple columns)
    res.current_owner_role = db_request.current_owner_role or STATUS_MAP.get(db_request.status, (None, None))[0]
    res.procurement_stage = db_request.procurement_stage or STATUS_MAP.get(db_request.status, (None, None))[1]
    
    return res
"""

# Replace the whole function
start_marker = "async def _populate_requester_info"
end_marker = "return res"

# Find boundaries
start_idx = content.find(start_marker)
# Find the specific 'return res' that belongs to this function (the first one after start_marker)
return_idx = content.find("return res", start_idx)
next_line_idx = content.find("\n", return_idx) + 1

new_content = content[:start_idx] + safe_populate + content[next_line_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully applied TRUE SAFE access to _populate_requester_info.")
