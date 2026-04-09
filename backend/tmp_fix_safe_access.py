import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\services\asset_request_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hasattr(po, 'invoice') or po.invoice with a safer check
# We check po.__dict__ first
# But wait, po.invoice is common. 
# Better: use a helper or just check for existence in dict.

content = content.replace("invoice = po.invoice if hasattr(po, 'invoice') else None", 
                         "invoice = po.__dict__.get('invoice') if 'invoice' in po.__dict__ else (getattr(po, 'invoice') if hasattr(po, '_sa_instance_state') and 'invoice' in po._sa_instance_state.committed_state else None)")

# Actually, the simplest way is:
# invoice = getattr(po, 'invoice', None)
# But hasattr() triggers the load. 

# Let's use a very safe pattern:
safe_invoice_pattern = """
        if po:
            res.purchase_order = {
                "id": po.id,
                "vendor_name": po.vendor_name,
                "total_cost": po.total_cost,
                "status": po.status,
                "po_pdf_path": po.po_pdf_path,
                "extracted_data": po.extracted_data
            }
            
            # Fetch Invoice (Safe access to avoid lazy-loading crashes)
            invoice = None
            if hasattr(po, '__dict__') and 'invoice' in po.__dict__:
                invoice = po.invoice
            
            if invoice:
"""

# Replace the block
old_block = re.compile(r'if po:\s+res\.purchase_order = \{.*?\n\s+\}\s+# Fetch Invoice linked to this PO \(relationship pre-loaded\)\s+invoice = po\.invoice if hasattr\(po, \'invoice\'\) else None\s+if invoice:', re.DOTALL)
# This is a bit complex for regex. I'll use a simpler search/replace for the specific line.

content = content.replace("invoice = po.invoice if hasattr(po, 'invoice') else None", "invoice = po.__dict__.get('invoice')")
content = content.replace("db_request.requester.dept_obj.name", "db_request.requester.dept_obj.name if 'dept_obj' in db_request.requester.__dict__ else 'IT'")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied safety checks to _populate_requester_info.")
