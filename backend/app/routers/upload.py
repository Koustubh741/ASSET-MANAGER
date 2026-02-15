from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import pandas as pd
import io
import os
import uuid
import shutil
from ..services import asset_service
from ..services import asset_request_service
from ..services import procurement_service
from ..schemas import asset_schema, asset_request_schema, procurement_schema
from ..database.database import get_db
from ..models.models import PurchaseOrder, AssetRequest
from ..utils.auth_utils import get_current_user
from datetime import datetime
from uuid import UUID

router = APIRouter(
    prefix="/upload",
    tags=["upload"]
)

@router.post("/smart")
async def smart_upload(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["ADMIN", "SYSTEM_ADMIN", "IT_MANAGEMENT"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload CSV or Excel.")

    contents = await file.read()
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    # Normalize headers to lowercase
    df.columns = df.columns.str.lower().str.replace(' ', '_')
    
    results = {
        "asset_requests_created": 0,
        "procurement_requests_created": 0,
        "errors": []
    }

    for index, row in df.iterrows():
        try:
            is_procurement = False
            if 'record_type' in df.columns and str(row['record_type']).lower() in ['procurement', 'request']:
                is_procurement = True
            elif pd.isna(row.get('serial_number')) and (not pd.isna(row.get('estimated_cost')) or not pd.isna(row.get('reason'))):
                is_procurement = True
            
            requester_id = row.get('requester_id') or row.get('requester')
            if not requester_id:
                results['errors'].append(f"Row {index+1}: Missing requester_id/requester")
                continue
            
            request_data = {
                "requester_id": str(requester_id),
                "asset_name": row.get('name') or row.get('asset_name') or "Unknown Asset",
                "asset_type": row.get('type', 'Laptop'),
                "asset_ownership_type": row.get('asset_ownership_type', 'COMPANY_OWNED'),
                "asset_model": row.get('model', ''),
                "asset_vendor": row.get('vendor', ''),
                "cost_estimate": float(row.get('cost_estimate', 0)) if not pd.isna(row.get('cost_estimate')) else None,
                "justification": row.get('justification', ''),
                "business_justification": row.get('business_justification') or row.get('reason') or row.get('justification') or "Uploaded via bulk import"
            }
            
            if not request_data['business_justification']:
                results['errors'].append(f"Row {index+1}: Missing business_justification")
                continue
            
            if is_procurement:
                created_request = await asset_request_service.create_asset_request(
                    db,
                    asset_request_schema.AssetRequestCreate(**request_data),
                    initial_status="PROCUREMENT_REQUESTED"
                )
                if created_request:
                    results["procurement_requests_created"] += 1
            else:
                created_request = await asset_request_service.create_asset_request(
                    db,
                    asset_request_schema.AssetRequestCreate(**request_data),
                    initial_status="SUBMITTED"
                )
                if created_request:
                    results["asset_requests_created"] += 1

        except Exception as e:
            results["errors"].append(f"Row {index+1}: {str(e)}")

    return results

@router.post("/po/{request_id}")
async def upload_po(
    request_id: UUID, 
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Step 2: PO PDF upload (Asynchronous).
    """
    # Verify user role for procurement
    if current_user.role not in ["PROCUREMENT_FINANCE", "PROCUREMENT", "FINANCE", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed for POs")

    procurement_service.ensure_upload_dir()
    
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(procurement_service.UPLOAD_DIR, f"PO_{request_id}_{file_id}{file_ext}")
    
    # Simple synchronous file write is typically acceptable for local disk IO in smaller apps
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    return await procurement_service.handle_po_upload(db, request_id, current_user.id, file_path)

@router.post("/invoice/{po_id}")
async def upload_invoice(
    po_id: UUID, 
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Step 5: Invoice / Purchase Confirmation Upload (Asynchronous).
    """
    # Verify user role for procurement
    if current_user.role not in ["PROCUREMENT_FINANCE", "PROCUREMENT", "FINANCE", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed for Invoices")

    procurement_service.ensure_upload_dir()
    
    file_id = str(uuid.uuid4())
    file_path = os.path.join(procurement_service.UPLOAD_DIR, f"INV_{po_id}_{file_id}.pdf")
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    return await procurement_service.handle_invoice_upload(db, po_id, current_user.id, file_path)

@router.get("/po/{request_id}")
async def get_po_details(
    request_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Fetch PO details (Asynchronous). Returns None if not found."""
    result = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.asset_request_id == request_id))
    po = result.scalars().first()
    
    if not po:
        return None
        
    # Security Root Fix: Authorization check
    if current_user.role not in ["FINANCE", "PROCUREMENT", "PROCUREMENT_FINANCE", "ADMIN"]:
        # Verify if current user is the requester of the associated asset request
        req_result = await db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
        asset_request = req_result.scalars().first()
        if not asset_request or asset_request.requester_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to view this Purchase Order")
            
    return po

@router.patch("/po/{po_id}")
async def update_po_details(
    po_id: UUID,
    update: procurement_schema.PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update Purchase Order metadata (Manual correction).
    """
    if current_user.role not in ["FINANCE", "PROCUREMENT", "PROCUREMENT_FINANCE", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    result = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.id == po_id))
    po = result.scalars().first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
        
    if update.vendor_name is not None:
        po.vendor_name = update.vendor_name
    if update.total_cost is not None:
        po.total_cost = update.total_cost
    if update.expected_delivery_date is not None:
        po.expected_delivery_date = update.expected_delivery_date
        
    await db.commit()
    await db.refresh(po)
    return po
