from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class PurchaseOrderBase(BaseModel):
    asset_request_id: str
    vendor_name: Optional[str] = None
    total_cost: Optional[float] = None
    expected_delivery_date: Optional[datetime] = None

class PurchaseOrderUpdate(BaseModel):
    vendor_name: Optional[str] = None
    total_cost: Optional[float] = None
    expected_delivery_date: Optional[datetime] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    uploaded_by: str
    po_pdf_path: str
    extracted_data: Optional[Dict[str, Any]] = None

class PurchaseOrderResponse(PurchaseOrderCreate):
    id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class PurchaseInvoiceCreate(BaseModel):
    purchase_order_id: str
    invoice_pdf_path: str
    purchase_date: Optional[datetime] = None
    total_amount: Optional[float] = None
    created_by: str

class PurchaseInvoiceResponse(PurchaseInvoiceCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
