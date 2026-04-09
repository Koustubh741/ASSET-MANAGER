import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\models\models.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# AssetRequest.requester -> lazy="selectin"
content = content.replace('requester = relationship("User", foreign_keys=[requester_id])', 
                         'requester = relationship("User", foreign_keys=[requester_id], lazy="selectin")')

# AssetRequest.purchase_orders -> lazy="selectin"
content = content.replace('purchase_orders = relationship("PurchaseOrder", backref="asset_request", cascade="all, delete-orphan", order_by="desc(PurchaseOrder.created_at)")',
                         'purchase_orders = relationship("PurchaseOrder", backref="asset_request", cascade="all, delete-orphan", order_by="desc(PurchaseOrder.created_at)", lazy="selectin")')

# User.dept_obj -> lazy="selectin" (this is already there? check it)
# Wait, check if dept_obj has lazy="selectin"
if 'dept_obj = relationship("Department"' in content and 'lazy="selectin"' not in content:
     content = content.replace('dept_obj = relationship("Department", back_populates="users", foreign_keys=[department_id])',
                              'dept_obj = relationship("Department", back_populates="users", foreign_keys=[department_id], lazy="selectin")')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated models.py to use lazy='selectin' for async safety.")
