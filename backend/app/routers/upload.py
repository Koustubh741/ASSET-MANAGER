from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import pandas as pd
import io
import os
import uuid
import shutil
import re
from ..database.database import get_db
from ..models.models import PurchaseOrder, AssetRequest, User
from ..services import asset_service, asset_request_service, procurement_service, user_service
from ..schemas import asset_schema, asset_request_schema, procurement_schema, user_schema
from ..database.database import get_db
from ..models.models import PurchaseOrder, AssetRequest
from ..utils.auth_utils import get_current_user
from datetime import datetime
from uuid import UUID

router = APIRouter(
    prefix="/upload",
    tags=["upload"]
)

STAFF_ROLES = {"ADMIN", "PROCUREMENT", "ASSET_MANAGER", "FINANCE", "IT_MANAGEMENT"}

@router.post("/smart")
async def smart_upload(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload CSV or Excel.")

    contents = await file.read()
    print(f"DEBUG: Processing file: {file.filename}")
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        print(f"ERROR: Failed to parse file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    # Normalize headers to lowercase and remove spaces/dashes
    raw_cols = list(df.columns)
    df.columns = [str(c).lower().strip().replace(' ', '_').replace('-', '_') for c in df.columns]
    print(f"DEBUG: Detected headers: {list(df.columns)}")
    print(f"DEBUG: Original headers: {raw_cols}")
    
    results = {
        "asset_requests_created": 0,
        "procurement_requests_created": 0,
        "users_imported": 0,
        "errors": []
    }

    # Helper for robust field extraction
    ALIASES = {
        'requester': ['requester_id', 'requester', 'user_email', 'employee_email', 'email', 'user', 'owner', 'assigned_to', 'assignee', 'employee', 'staff', 'id', 'user_id', 'employee_id', 'staff_id', 'work_email', 'mail', 'email_address', 'username', 'login', 'account'],
        'asset_name': ['name', 'asset_name', 'asset', 'item', 'product', 'model_name', 'device', 'hardware'],
        'asset_type': ['type', 'asset_type', 'category', 'device_type', 'asset_category', 'class'],
        'asset_model': ['model', 'asset_model', 'hardware_model', 'model_number', 'version'],
        'asset_vendor': ['vendor', 'asset_vendor', 'manufacturer', 'make', 'brand', 'supplier'],
        'serial_number': ['serial_number', 'serial', 's/n', 'sn', 'service_tag', 'asset_tag', 'barcode'],
        'record_type': ['record_type', 'type', 'mode', 'category', 'action'],
        'priority': ['priority', 'urgency', 'level', 'importance', 'severity']
    }

    def get_field(r, field):
        aliases = ALIASES.get(field, [])
        # Try exact matches first
        for alias in aliases:
            if alias in r and not pd.isna(r[alias]) and str(r[alias]).strip():
                return str(r[alias]).strip(), alias
        # Try fuzzy match (column name contains alias)
        for col in r.index:
            col_str = str(col).lower()
            for alias in aliases:
                # Avoid overly broad matches for short aliases
                if len(alias) <= 3 and col_str != alias:
                    continue
                if alias in col_str and not pd.isna(r[col]) and str(r[col]).strip():
                    return str(r[col]).strip(), col
        return None, None

    for index, row in df.iterrows():
        try:
            # 1. Determine Record Type
            raw_type, _ = get_field(row, 'record_type')
            record_type = str(raw_type or '').lower()
            
            # 2. Extract Requester Info
            requester_id_raw, matched_col = get_field(row, 'requester')
            requester_id = None
            
            print(f"DEBUG: Row {index+1} - Matched column for requester: '{matched_col}', value: '{requester_id_raw}'")

            if requester_id_raw:
                # Aggressive Email Cleaning: remove ALL whitespace (including internal)
                search_str = re.sub(r'\s+', '', str(requester_id_raw)).lower()
                
                # Try to parse as UUID
                try:
                    requester_id = UUID(search_str)
                except (ValueError, AttributeError):
                    # Try to lookup by email
                    if '@' in search_str:
                        user = await user_service.get_user_by_email(db, search_str)
                        if user:
                            requester_id = user.id
                    else:
                        # Fallback: Search for user by full name
                        from ..models.models import User
                        stmt = select(User).filter(User.full_name.ilike(requester_id_raw.strip()))
                        user_res = await db.execute(stmt)
                        user_by_name = user_res.scalars().first()
                        if user_by_name:
                            requester_id = user_by_name.id
                            print(f"DEBUG: Row {index+1} - Resolved requester '{requester_id_raw}' by Name to ID: {requester_id}")
            
            # 3. Handle User Import
            should_handle_user = record_type == 'user'
            if not requester_id and requester_id_raw and '@' in str(requester_id_raw):
                should_handle_user = True
            
            if should_handle_user and requester_id_raw:
                # Clean email for UserCreate schema
                email = re.sub(r'\s+', '', str(requester_id_raw)).lower()
                existing_user = await user_service.get_user_by_email(db, email)
                
                if not existing_user:
                    # Create new user
                    user_data = {
                        "email": email,
                        "full_name": row.get('name') or row.get('full_name') or row.get('display_name') or email.split('@')[0].capitalize(),
                        "password": "TemporaryPassword123!",
                        "role": str(row.get('role', 'END_USER')).upper(),
                        "department": row.get('department'),
                        "domain": row.get('domain'),
                        "position": row.get('position'),
                        "location": row.get('location'),
                    }
                    
                    manager_val = row.get('manager_email') or row.get('manager')
                    if manager_val and '@' in str(manager_val):
                        manager = await user_service.get_user_by_email(db, str(manager_val).replace(' ', '').lower())
                        if manager:
                            user_data["manager_id"] = manager.id

                    created_user = await user_service.create_user(db, user_schema.UserCreate(**user_data))
                    await db.flush()
                    requester_id = created_user.id
                    results["users_imported"] += 1
                else:
                    requester_id = existing_user.id
                    if record_type == 'user':
                        results["errors"].append(f"Row {index+1}: User {email} already exists (skipping creation)")
            
            # 4. Check if this is also an asset record
            asset_name, _ = get_field(row, 'asset_name')
            is_procurement = False
            
            # Heuristic for procurement: no serial number but has cost or reason
            if record_type in ['procurement', 'request']:
                is_procurement = True
            elif pd.isna(row.get('serial_number')) and (not pd.isna(row.get('estimated_cost')) or not pd.isna(row.get('reason'))):
                is_procurement = True
            
            # If we have a requester and an asset name, create a request
            if requester_id and asset_name:
                request_create_data = asset_request_schema.AssetRequestCreate(
                    asset_id=None,
                    asset_name=asset_name,
                    asset_type=get_field(row, 'asset_type')[0] or 'Laptop',
                    asset_ownership_type=row.get('asset_ownership_type', 'COMPANY_OWNED'),
                    asset_model=get_field(row, 'asset_model')[0] or '',
                    asset_vendor=get_field(row, 'asset_vendor')[0] or '',
                    serial_number=get_field(row, 'serial_number')[0],
                    os_version=row.get('os_version'),
                    cost_estimate=float(row.get('cost_estimate', 0)) if not pd.isna(row.get('cost_estimate')) else None,
                    justification=row.get('justification', ''),
                    business_justification=row.get('business_justification') or row.get('reason') or row.get('justification') or "Uploaded via bulk import",
                    priority=get_field(row, 'priority')[0] or 'Medium',
                    specifications={}
                )

                if is_procurement:
                    await asset_request_service.create_asset_request_v2(
                        db,
                        request_create_data,
                        requester_id=requester_id,
                        initial_status="PROCUREMENT_REQUESTED"
                    )
                    results["procurement_requests_created"] += 1
                else:
                    await asset_request_service.create_asset_request_v2(
                        db,
                        request_create_data,
                        requester_id=requester_id,
                        initial_status="SUBMITTED"
                    )
                    results["asset_requests_created"] += 1
            
            elif not record_type == 'user':
                # Only error if it's not a pure user record and we couldn't resolve requester
                if not requester_id:
                    lookup_str = str(requester_id_raw) if requester_id_raw else "None"
                    results['errors'].append(f"Row {index+1}: Missing or unresolvable requester/email in column '{matched_col or 'N/A'}': '{lookup_str}'")

        except Exception as e:
            # ROLLBACK to clear transaction state after ANY failure in row processing
            await db.rollback()
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
    if current_user.role not in STAFF_ROLES:
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
    if current_user.role not in STAFF_ROLES:
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
    if current_user.role not in STAFF_ROLES:
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
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    result = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.id == po_id))
    po = result.scalars().first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
        
    if update.vendor_name is not None:
        po.vendor_name = update.vendor_name
    if update.total_cost is not None:
        po.total_cost = update.total_cost
    if update.capex_opex is not None:
        po.capex_opex = update.capex_opex
    if update.tax_amount is not None:
        po.tax_amount = update.tax_amount
    if update.shipping_handling is not None:
        po.shipping_handling = update.shipping_handling
    if update.expected_delivery_date is not None:
        po.expected_delivery_date = update.expected_delivery_date
    if update.extracted_data is not None:
        po.extracted_data = update.extracted_data
        
    await db.commit()
    await db.refresh(po)
    return po

@router.get("/po/{request_id}/view")
async def get_view_po(
    request_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Serve the PO PDF for viewing."""
    result = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.asset_request_id == request_id))
    po = result.scalars().first()
    
    if not po or not po.po_pdf_path:
        raise HTTPException(status_code=404, detail="Purchase Order PDF not found")
        
    # Reuse security logic from get_po_details
    if current_user.role not in STAFF_ROLES:
        req_result = await db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
        asset_request = req_result.scalars().first()
        if not asset_request or asset_request.requester_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to view this Purchase Order")
            
    if not os.path.exists(po.po_pdf_path):
         raise HTTPException(status_code=404, detail="Physical PDF file missing from storage")

    return FileResponse(
        po.po_pdf_path, 
        media_type='application/pdf', 
        filename=os.path.basename(po.po_pdf_path)
    )
