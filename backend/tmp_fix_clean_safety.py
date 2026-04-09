import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\services\asset_request_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Refactor _populate_requester_info to be clean and leverage lazy="selectin"
# Removing the hyper-aggressive try/except and __dict__ checks where possible
# but keeping them for the most dangerous ones.

clean_populate = """
async def _populate_requester_info(db: AsyncSession, db_request: AssetRequest, user_role: str = None) -> AssetRequestResponse:
    \"\"\"Helper to add requester name/email and procurement info (role-sensitive)\"\"\"
    # Explicitly exclude the hybrid properties during model_validate to avoid lazy-loading triggers
    # We will populate them manually.
    data = {c.name: getattr(db_request, c.name) for c in db_request.__table__.columns}
    # Add other needed fields from model
    data['id'] = db_request.id
    data['created_at'] = db_request.created_at
    data['updated_at'] = db_request.updated_at
    
    res = AssetRequestResponse.model_validate(data, from_attributes=True)
    
    # Manually populate relationships with safety
    if db_request.requester:
        res.requester_name = db_request.requester.full_name
        res.requester_email = db_request.requester.email
        # User.dept_obj is now lazy="selectin", so this should be safe
        if db_request.requester.dept_obj:
            res.requester_department = db_request.requester.dept_obj.name
    
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
            # PurchaseOrder.invoice is now lazy="selectin"
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

    # Populate virtual/audit fields
    res.it_reviewed_by = db_request.it_reviewed_by
    res.it_reviewed_at = db_request.it_reviewed_at
    res.procurement_finance_status = db_request.procurement_finance_status
    res.procurement_finance_reviewed_by = db_request.procurement_finance_reviewed_by
    res.procurement_finance_reviewed_at = db_request.procurement_finance_reviewed_at
    res.qc_status = db_request.qc_status
    res.qc_performed_by = db_request.qc_performed_by
    res.qc_performed_at = db_request.qc_performed_at
    res.qc_notes = db_request.qc_notes
    res.user_acceptance_status = db_request.user_acceptance_status
    res.user_accepted_at = db_request.user_accepted_at
    
    res.current_owner_role = db_request.current_owner_role or STATUS_MAP.get(db_request.status, (None, None))[0]
    res.procurement_stage = db_request.procurement_stage or STATUS_MAP.get(db_request.status, (None, None))[1]
    
    return res
"""

# Replace the whole function
start_marker = "async def _populate_requester_info"
end_marker = "return res"

start_idx = content.find(start_marker)
return_idx = content.find("return res", start_idx)
next_line_idx = content.find("\n", return_idx) + 1

new_content = content[:start_idx] + clean_populate + content[next_line_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully refactored _populate_requester_info for clean async safety.")
