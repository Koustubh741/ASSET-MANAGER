from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from ..models.models import PurchaseOrder, PurchaseInvoice, ProcurementLog, AssetRequest
from ..services import pdf_extraction_service
import asyncio
import os
import uuid
from uuid import UUID
from datetime import datetime

UPLOAD_DIR = "uploads/procurement"

def ensure_upload_dir():
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR, exist_ok=True)

async def handle_po_upload(db: AsyncSession, asset_request_id: UUID, uploader_id: UUID, file_path: str):
    """
    Handle PO PDF upload and automated extraction (Asynchronous).
    """
    # PDF extraction is CPU-bound/blocking. Offload it to a worker thread so we don't block the event loop.
    extracted = await asyncio.to_thread(pdf_extraction_service.extract_po_details, file_path)
    
    # Create PurchaseOrder record with fallbacks to AssetRequest data
    result = await db.execute(select(AssetRequest).filter(AssetRequest.id == asset_request_id))
    request = result.scalars().first()
    
    vendor_name = extracted.get("vendor_name")
    if (not vendor_name or vendor_name == "Unknown Vendor") and request:
        vendor_name = request.asset_vendor or "Manual Entry Required"
        
    total_cost = extracted.get("total_cost") or 0.0
    if total_cost <= 0.0 and request:
        total_cost = request.cost_estimate or 0.0
        
    quantity = extracted.get("quantity") or 1
    unit_price = extracted.get("unit_price") or 0.0
    if total_cost > 0 and unit_price <= 0:
        unit_price = round(total_cost / quantity, 2)

    po = PurchaseOrder(
        id=uuid.uuid4(),
        asset_request_id=asset_request_id,
        uploaded_by=uploader_id,
        po_pdf_path=file_path,
        vendor_name=vendor_name,
        total_cost=total_cost,
        quantity=quantity,
        unit_price=unit_price,
        extracted_data=extracted,
        status="UPLOADED"
    )
    db.add(po)
    
    # Comprehensive Audit Log
    confidence_score = extracted.get("confidence_score", 0)
    is_low_confidence = confidence_score < 0.6
    
    if is_low_confidence:
        print(f"WARNING: Low confidence extraction ({confidence_score}) for request {asset_request_id}")
    
    log = ProcurementLog(
        id=uuid.uuid4(),
        reference_id=po.id,
        action="PO_UPLOADED",
        performed_by=str(uploader_id),
        role="PROCUREMENT",
        metadata_={
            "asset_request_id": str(asset_request_id),
            "vendor": po.vendor_name,
            "total_cost": po.total_cost,
            "extracted_at": datetime.now().isoformat(),
            "extraction_success": confidence_score > 0.3,
            "low_confidence": is_low_confidence,
            "confidence_score": round(confidence_score, 2)
        }
    )
    db.add(log)
    
    # Update AssetRequest status to PO_UPLOADED
    result = await db.execute(select(AssetRequest).filter(AssetRequest.id == asset_request_id))
    request = result.scalars().first()
    if request:
        request.status = "PO_UPLOADED"
        request.procurement_finance_status = "PO_UPLOADED"
        from .asset_request_service import sync_request_state
        sync_request_state(request)
    
    await db.commit()
    await db.refresh(po)
    
    # Notify procurement team to validate PO
    from .notification_service import send_notification
    await send_notification(db, asset_request_id, "status_change", old_status="SUBMITTED", new_status="PO_UPLOADED", reviewer_name="System/Procurement Scanner")
    
    return po


async def validate_po_completeness(db: AsyncSession, po_id: UUID, reviewer_id: UUID, action: str, reason: str = None):
    """
    PROCUREMENT role: Validate PO completeness and vendor compliance.
    Actions: VALIDATE or REJECT
    """
    result = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.id == po_id))
    po = result.scalars().first()
    if not po:
        raise ValueError("Purchase Order not found")
        
    if po.status == "VALIDATED" and action != "REJECT":
        return po

    req_result = await db.execute(select(AssetRequest).filter(AssetRequest.id == po.asset_request_id))
    request = req_result.scalars().first()
    
    if action == "VALIDATE":
        po.status = "VALIDATED"
        log_action = "PO_VALIDATED"
        if request:
            request.status = "PO_VALIDATED"
            request.updated_at = datetime.now()
            from .asset_request_service import sync_request_state
            sync_request_state(request)
    else:
        po.status = "REJECTED"
        log_action = "PO_REJECTED"
        if request:
            request.status = "PO_REJECTED"
            request.updated_at = datetime.now()
            from .asset_request_service import sync_request_state
            sync_request_state(request)
        
    # Audit Log
    log = ProcurementLog(
        id=uuid.uuid4(),
        reference_id=po.id,
        action=log_action,
        performed_by=str(reviewer_id),
        role="PROCUREMENT",
        metadata_={
            "reason": reason,
            "vendor": po.vendor_name,
            "total_cost": po.total_cost,
            "completeness_check": action == "VALIDATE"
        }
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(po)
    
    # Notify following budget approval or rejection
    from .notification_service import send_notification
    await send_notification(db, po.asset_request_id, "status_change", old_status="PO_UPLOADED", new_status=log_action, reviewer_name=str(reviewer_id), reason=reason)
    
    return po

async def validate_finance_budget(db: AsyncSession, po_id: UUID, reviewer_id: UUID, action: str, reason: str = None):
    """
    FINANCE role: Validate budget availability and financial compliance.
    Actions: APPROVE or REJECT
    """
    result = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.id == po_id))
    po = result.scalars().first()
    if not po:
        raise ValueError("Purchase Order not found")
        
    if po.status not in ["VALIDATED", "UPLOADED"]:
        raise ValueError("PO must be uploaded and optionally validated by PROCUREMENT before FINANCE review")

    req_result = await db.execute(select(AssetRequest).filter(AssetRequest.id == po.asset_request_id))
    request = req_result.scalars().first()
    
    if action == "APPROVE":
        log_action = "FINANCE_APPROVED"
        if request:
            request.status = "FINANCE_APPROVED"
            request.procurement_finance_status = "APPROVED"
            request.updated_at = datetime.now()
            from .asset_request_service import sync_request_state
            sync_request_state(request)
    else:
        log_action = "FINANCE_REJECTED"
        if request:
            request.status = "FINANCE_REJECTED"
            request.procurement_finance_status = "REJECTED"
            request.updated_at = datetime.now()
            from .asset_request_service import sync_request_state
            sync_request_state(request)
        
    # Budget validation logic
    budget_pass = True
    if request and po.total_cost:
        budget_pass = po.total_cost <= (request.cost_estimate or 0) * 1.1  # 10% tolerance
    
    # Audit Log
    log = ProcurementLog(
        id=uuid.uuid4(),
        reference_id=po.id,
        action=log_action,
        performed_by=str(reviewer_id),
        role="FINANCE",
        metadata_={
            "reason": reason,
            "po_total": po.total_cost,
            "request_estimate": request.cost_estimate if request else None,
            "budget_pass": budget_pass,
            "action": action
        }
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(po)
    return po

async def handle_invoice_upload(db: AsyncSession, po_id: UUID, uploader_id: UUID, file_path: str):
    """
    Handle Finance-uploaded purchase confirmation / invoice PDF (Asynchronous).
    """
    # PDF extraction is CPU-bound/blocking. Offload it to a worker thread so we don't block the event loop.
    extracted = await asyncio.to_thread(pdf_extraction_service.extract_invoice_details, file_path)
    
    # Create PurchaseInvoice record
    invoice = PurchaseInvoice(
        id=uuid.uuid4(),
        purchase_order_id=po_id,
        invoice_pdf_path=file_path,
        purchase_date=datetime.now(), 
        total_amount=extracted.get("total_cost"),
        created_by=uploader_id
    )
    db.add(invoice)
    
    # Log action
    log = ProcurementLog(
        id=uuid.uuid4(),
        reference_id=invoice.id,
        action="INVOICE_UPLOADED",
        performed_by=str(uploader_id),
        role="FINANCE",
        metadata_={
            "po_id": str(po_id),
            "final_cost": invoice.total_amount,
            "timestamp": datetime.now().isoformat()
        }
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(invoice)
    return invoice

async def get_procurement_logs(db: AsyncSession, reference_id: UUID = None):
    """
    Retrieve audit logs for procurement (Asynchronous).
    """
    query = select(ProcurementLog)
    if reference_id:
        query = query.filter(ProcurementLog.reference_id == reference_id)
    query = query.order_by(desc(ProcurementLog.created_at))
    result = await db.execute(query)
    return result.scalars().all()
