import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\models\models.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Massive relationship update for async stability (selectinload everywhere)
# This prevents 99% of greenlet_spawn errors in async SQLAlchemy

# User.dept_obj
content = content.replace('dept_obj = relationship("Department", back_populates="users", foreign_keys=[department_id])',
                         'dept_obj = relationship("Department", back_populates="users", foreign_keys=[department_id], lazy="selectin")')

# AssetRequest.requester
if 'requester = relationship("User", foreign_keys=[requester_id])' in content:
    content = content.replace('requester = relationship("User", foreign_keys=[requester_id])',
                             'requester = relationship("User", foreign_keys=[requester_id], lazy="selectin")')

# AssetRequest.purchase_orders
if 'purchase_orders = relationship("PurchaseOrder", backref="asset_request"' in content:
    # Handle the complex multi-line if needed, but usually it's one line or simple
    content = re.sub(r'purchase_orders = relationship\("PurchaseOrder",\s*backref="asset_request",', 
                     'purchase_orders = relationship("PurchaseOrder", backref="asset_request", lazy="selectin",', content)

# PurchaseOrder.invoice (backref)
# This is defined in PurchaseInvoice model
if 'purchase_order = relationship("PurchaseOrder", backref="invoice", uselist=False)' in content:
    content = content.replace('purchase_order = relationship("PurchaseOrder", backref="invoice", uselist=False)',
                             'purchase_order = relationship("PurchaseOrder", backref="invoice", uselist=False, lazy="selectin")')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Massively updated models.py for async-safe relationship loading.")
