"""
Financial summary and reporting endpoints (Asynchronous)
"""
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from uuid import UUID
from ..database.database import get_db
from ..models.models import Asset, PurchaseOrder, PurchaseInvoice, FinanceRecord, User, AssetRequest, Department
from ..utils.auth_utils import get_current_user
from fastapi import HTTPException, status
from ..services.notification_service import send_notification

router = APIRouter(
    prefix="/financials",
    tags=["financials"]
)

# Root Fix: Standardized staff roles for all financial/procurement dashboards
STAFF_ROLES = {"ADMIN", "PROCUREMENT", "ASSET_MANAGER", "FINANCE", "IT_MANAGEMENT"}


class FinancialSummaryResponse(BaseModel):
    total_asset_value: float
    total_assets: int
    assets_in_use: int
    assets_in_stock: int
    assets_retired: int
    
    # Cost breakdown
    average_asset_cost: float
    highest_value_asset: Optional[float] = None
    lowest_value_asset: Optional[float] = None
    
    # Procurement data
    total_procurement_cost: float
    pending_po_count: int
    
    # Renewal costs
    upcoming_renewal_cost: float
    renewals_due_30_days: int
    renewals_due_90_days: int
    
    # By segment
    it_assets_value: float
    non_it_assets_value: float
    
    # Status
    status: str = "ok"


class AssetCostBreakdown(BaseModel):
    asset_type: str
    count: int
    total_value: float
    average_value: float


class MonthlySpendResponse(BaseModel):
    month: str
    total_spend: float
    po_count: int


@router.get("/summary", response_model=FinancialSummaryResponse)
async def get_financial_summary(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get comprehensive financial summary for the dashboard.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized to view financial data")
    
    # Root Fix: FINANCE and PROCUREMENT are centralized roles — they must see ALL assets (like ADMIN)
    if user_role in {"ADMIN", "FINANCE", "PROCUREMENT"}:
        result = await db.execute(select(Asset))
        po_query = select(PurchaseOrder)
    else:
        # Scope assets by owner's domain/department for IT_MANAGEMENT and ASSET_MANAGER
        user_domain = current_user.domain or ""
        user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
        result = await db.execute(
            select(Asset).join(User, Asset.assigned_to_id == User.id)
            .outerjoin(Department, User.department_id == Department.id)
            .where(or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%")))
        )
        # Scope POs via AssetRequest -> User
        po_query = select(PurchaseOrder).join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id).join(User, AssetRequest.requester_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )
    
    assets = result.scalars().all()
    
    total_assets = len(assets)
    total_value = sum(a.cost or 0 for a in assets)
    
    # Count by status
    assets_in_use = len([a for a in assets if a.status == "In Use" or a.status == "Active"])
    assets_in_stock = len([a for a in assets if a.status == "In Stock"])
    assets_retired = len([a for a in assets if a.status in ["Retired", "Disposed"]])
    
    # Cost metrics
    costs = [a.cost for a in assets if a.cost and a.cost > 0]
    avg_cost = sum(costs) / len(costs) if costs else 0
    highest_cost = max(costs) if costs else None
    lowest_cost = min(costs) if costs else None
    
    # By segment
    it_value = sum(a.cost or 0 for a in assets if a.segment == "IT")
    non_it_value = sum(a.cost or 0 for a in assets if a.segment != "IT")
    
    # Procurement totals (using scoped query)
    po_result = await db.execute(po_query)
    pos = po_result.scalars().all()
    total_procurement = sum(po.total_cost or 0 for po in pos)
    pending_po = len([po for po in pos if po.status in ["UPLOADED", "PENDING"]])
    
    # Renewals due
    today = date.today()
    thirty_days = today + timedelta(days=30)
    ninety_days = today + timedelta(days=90)
    
    renewals_30 = len([a for a in assets if a.warranty_expiry and a.warranty_expiry <= thirty_days and a.warranty_expiry >= today])
    renewals_90 = len([a for a in assets if a.warranty_expiry and a.warranty_expiry <= ninety_days and a.warranty_expiry >= today])
    
    # Estimate renewal cost (based on renewal_cost field or 10% of asset cost)
    upcoming_renewal_cost = sum(
        (a.renewal_cost or (a.cost * 0.1 if a.cost else 0))
        for a in assets 
        if a.warranty_expiry and a.warranty_expiry <= ninety_days and a.warranty_expiry >= today
    )
    
    return FinancialSummaryResponse(
        total_asset_value=total_value,
        total_assets=total_assets,
        assets_in_use=assets_in_use,
        assets_in_stock=assets_in_stock,
        assets_retired=assets_retired,
        average_asset_cost=avg_cost,
        highest_value_asset=highest_cost,
        lowest_value_asset=lowest_cost,
        total_procurement_cost=total_procurement,
        pending_po_count=pending_po,
        upcoming_renewal_cost=upcoming_renewal_cost,
        renewals_due_30_days=renewals_30,
        renewals_due_90_days=renewals_90,
        it_assets_value=it_value,
        non_it_assets_value=non_it_value,
        status="ok"
    )


@router.get("/by-type", response_model=List[AssetCostBreakdown])
async def get_costs_by_asset_type(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get cost breakdown by asset type.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized to view financial data")
    
    if user_role in {"ADMIN", "FINANCE", "PROCUREMENT"}:
        result = await db.execute(select(Asset))
    else:
        user_domain = current_user.domain or ""
        user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
        result = await db.execute(
            select(Asset).join(User, Asset.assigned_to_id == User.id)
            .outerjoin(Department, User.department_id == Department.id)
            .where(or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%")))
        )
    assets = result.scalars().all()
    
    # Group by type
    type_map = {}
    for asset in assets:
        asset_type = asset.type or "Unknown"
        if asset_type not in type_map:
            type_map[asset_type] = {"count": 0, "total_value": 0}
        type_map[asset_type]["count"] += 1
        type_map[asset_type]["total_value"] += asset.cost or 0
    
    breakdown = []
    for asset_type, data in type_map.items():
        breakdown.append(AssetCostBreakdown(
            asset_type=asset_type,
            count=data["count"],
            total_value=data["total_value"],
            average_value=data["total_value"] / data["count"] if data["count"] > 0 else 0
        ))
    
    # Sort by total value descending
    breakdown.sort(key=lambda x: x.total_value, reverse=True)
    return breakdown


@router.get("/monthly-spend", response_model=List[MonthlySpendResponse])
async def get_monthly_spend(
    months: int = 12,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get monthly spend data for the last N months.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized to view financial data")
    
    if user_role in {"ADMIN", "FINANCE", "PROCUREMENT"}:
        query = select(PurchaseOrder)
    else:
        user_domain = current_user.domain or ""
        user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
        query = select(PurchaseOrder).join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id).join(User, AssetRequest.requester_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )
        
    result = await db.execute(query)
    pos = result.scalars().all()
    
    # Group by month
    monthly_data = {}
    for po in pos:
        if po.created_at:
            month_key = po.created_at.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = {"total_spend": 0, "po_count": 0}
            monthly_data[month_key]["total_spend"] += po.total_cost or 0
            monthly_data[month_key]["po_count"] += 1
    
    # Create response for last N months
    response = []
    today = date.today()
    for i in range(months):
        month_date = today - timedelta(days=30 * i)
        month_key = month_date.strftime("%Y-%m")
        data = monthly_data.get(month_key, {"total_spend": 0, "po_count": 0})
        response.append(MonthlySpendResponse(
            month=month_key,
            total_spend=data["total_spend"],
            po_count=data["po_count"]
        ))
    
    # Sort chronologically
    response.sort(key=lambda x: x.month)
    return response


@router.get("/depreciation")
async def get_depreciation_data(
    method: str = "straight-line",
    useful_life_years: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Calculate depreciation for all assets.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized to view financial data")
    
    if user_role in {"ADMIN", "FINANCE", "PROCUREMENT"}:
        result = await db.execute(select(Asset))
    else:
        user_domain = current_user.domain or ""
        user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
        result = await db.execute(
            select(Asset).join(User, Asset.assigned_to_id == User.id)
            .outerjoin(Department, User.department_id == Department.id)
            .where(or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%")))
        )
    assets = result.scalars().all()
    
    depreciation_data = []
    total_current_value = 0
    total_depreciation = 0
    
    for asset in assets:
        if not asset.cost or not asset.purchase_date:
            continue
        
        # Calculate age in years
        if isinstance(asset.purchase_date, str):
            purchase_date = datetime.fromisoformat(asset.purchase_date).date()
        else:
            purchase_date = asset.purchase_date
        
        age_days = (date.today() - purchase_date).days
        age_years = age_days / 365.25
        
        # Straight-line depreciation
        annual_depreciation = asset.cost / useful_life_years
        total_depreciated = min(annual_depreciation * age_years, asset.cost)
        current_value = max(asset.cost - total_depreciated, 0)
        
        depreciation_data.append({
            "asset_id": str(asset.id),
            "asset_name": asset.name,
            "original_cost": asset.cost,
            "current_value": round(current_value, 2),
            "total_depreciation": round(total_depreciated, 2),
            "age_years": round(age_years, 2),
            "fully_depreciated": age_years >= useful_life_years
        })
        
        total_current_value += current_value
        total_depreciation += total_depreciated
    
    return {
        "method": method,
        "useful_life_years": useful_life_years,
        "total_original_value": sum(a.cost or 0 for a in assets if a.cost and a.purchase_date),
        "total_current_value": round(total_current_value, 2),
        "total_depreciation": round(total_depreciation, 2),
        "assets": depreciation_data
    }


class ProcurementSummaryResponse(BaseModel):
    pending_po_count: int
    pending_po_total_value: float
    monthly_po_value: List[MonthlySpendResponse]


@router.get("/procurement-summary", response_model=ProcurementSummaryResponse)
async def get_procurement_summary(
    months: int = 6,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Procurement dashboard: pending PO count, total value, and monthly spend for charts.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
    
    try:
        if user_role == "ADMIN":
            query = select(PurchaseOrder)
        else:
            query = select(PurchaseOrder).join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id).join(User, AssetRequest.requester_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
                or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
            )
        result = await db.execute(query)
        pos = result.scalars().all()
    except Exception:
        return ProcurementSummaryResponse(
            pending_po_count=0,
            pending_po_total_value=0.0,
            monthly_po_value=[
                MonthlySpendResponse(month=(date.today() - timedelta(days=30 * i)).strftime("%Y-%m"), total_spend=0.0, po_count=0)
                for i in range(months)
            ]
        )
    pending_po_count = len([po for po in pos if (po.status or "").upper() in ("UPLOADED", "PENDING", "EXTRACTED", "")])
    pending_po_total_value = sum(po.total_cost or 0 for po in pos)
    monthly_data = {}
    for po in pos:
        if po.created_at:
            month_key = po.created_at.strftime("%Y-%m") if hasattr(po.created_at, "strftime") else str(po.created_at)[:7]
            if month_key not in monthly_data:
                monthly_data[month_key] = {"total_spend": 0, "po_count": 0}
            monthly_data[month_key]["total_spend"] += po.total_cost or 0
            monthly_data[month_key]["po_count"] += 1
    response = []
    for i in range(months):
        month_date = date.today() - timedelta(days=30 * i)
        month_key = month_date.strftime("%Y-%m")
        data = monthly_data.get(month_key, {"total_spend": 0, "po_count": 0})
        response.append(MonthlySpendResponse(month=month_key, total_spend=data["total_spend"], po_count=data["po_count"]))
    response.sort(key=lambda x: x.month)
    return ProcurementSummaryResponse(
        pending_po_count=pending_po_count,
        pending_po_total_value=pending_po_total_value,
        monthly_po_value=response
    )


# ---------------------------------------------------------------------------
# Purchase Orders
# ---------------------------------------------------------------------------

class PurchaseOrderResponse(BaseModel):
    id: str
    asset_request_id: Optional[str] = None
    vendor_name: Optional[str] = None
    total_cost: Optional[float] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    status: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all purchase orders."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
    
    if user_role == "ADMIN":
        query = select(PurchaseOrder).order_by(PurchaseOrder.created_at.desc())
    else:
        query = (
            select(PurchaseOrder)
            .join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id)
            .join(User, AssetRequest.requester_id == User.id)
            .outerjoin(Department, User.department_id == Department.id)
            .where(or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%")))
            .order_by(PurchaseOrder.created_at.desc())
        )
        
    result = await db.execute(query)
    pos = result.scalars().all()
    return [
        PurchaseOrderResponse(
            id=str(po.id),
            asset_request_id=str(po.asset_request_id) if po.asset_request_id else None,
            vendor_name=po.vendor_name,
            total_cost=po.total_cost,
            quantity=po.quantity,
            unit_price=po.unit_price,
            status=po.status,
            expected_delivery_date=po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
            created_at=po.created_at.isoformat() if po.created_at else None,
        )
        for po in pos
    ]


@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a single PO by ID."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
    
    # Validation check: scoped query
    query = select(PurchaseOrder).where(PurchaseOrder.id == str(po_id))
    if user_role != "ADMIN":
        query = query.join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id).join(User, AssetRequest.requester_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )
        
    result = await db.execute(query)
    po = result.scalars().first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found or unauthorized")
        
    return PurchaseOrderResponse(
        id=str(po.id),
        asset_request_id=str(po.asset_request_id) if po.asset_request_id else None,
        vendor_name=po.vendor_name,
        total_cost=po.total_cost,
        quantity=po.quantity,
        unit_price=po.unit_price,
        status=po.status,
        expected_delivery_date=po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
        created_at=po.created_at.isoformat() if po.created_at else None,
    )


class POAuditRequest(BaseModel):
    total_cost: float
    tax_amount: float
    shipping_handling: float

@router.patch("/purchase-orders/{po_id}/audit")
async def audit_purchase_order(
    po_id: UUID,
    audit_data: POAuditRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Manually audit PO financial data."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    query = select(PurchaseOrder).where(PurchaseOrder.id == str(po_id))
    if user_role != "ADMIN":
        user_domain = current_user.domain or ""
        user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
        query = query.join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id).join(User, AssetRequest.requester_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )
        
    result = await db.execute(query)
    po = result.scalars().first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found or unauthorized")
        
    po.total_cost = audit_data.total_cost
    po.tax_amount = audit_data.tax_amount
    po.shipping_handling = audit_data.shipping_handling
    po.status = "VALIDATED"  # Auditing automatically validates the PO
    
    await db.commit()
    return {"status": "audited", "po_id": str(po_id)}

@router.patch("/purchase-orders/{po_id}/status")
async def update_po_status(
    po_id: UUID,
    new_status: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update PO status (VALIDATED / REJECTED)."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
    
    query = select(PurchaseOrder).where(PurchaseOrder.id == str(po_id))
    if user_role != "ADMIN":
        query = query.join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id).join(User, AssetRequest.requester_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )
        
    result = await db.execute(query)
    po = result.scalars().first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found or unauthorized")
        
    po.status = new_status
    await db.commit()
    return {"status": "updated", "new_status": new_status}


# ---------------------------------------------------------------------------
# Deliveries
# ---------------------------------------------------------------------------

@router.get("/deliveries", response_model=List[PurchaseOrderResponse])
async def list_deliveries(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List POs that have an expected delivery date (delivery tracking)."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
    
    if user_role == "ADMIN":
        query = select(PurchaseOrder).order_by(PurchaseOrder.expected_delivery_date.asc())
    else:
        query = (
            select(PurchaseOrder)
            .join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id)
            .join(User, AssetRequest.requester_id == User.id)
            .outerjoin(Department, User.department_id == Department.id)
            .where(or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%")))
            .order_by(PurchaseOrder.expected_delivery_date.asc())
        )
        
    result = await db.execute(query)
    pos = result.scalars().all()
    return [
        PurchaseOrderResponse(
            id=str(po.id),
            asset_request_id=str(po.asset_request_id) if po.asset_request_id else None,
            vendor_name=po.vendor_name,
            total_cost=po.total_cost,
            quantity=po.quantity,
            unit_price=po.unit_price,
            status=po.status,
            expected_delivery_date=po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
            created_at=po.created_at.isoformat() if po.created_at else None,
        )
        for po in pos
    ]


@router.patch("/deliveries/{po_id}/receive")
async def mark_po_received(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Mark a PO as received (delivery confirmed)."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in {"ADMIN", "PROCUREMENT", "ASSET_MANAGER"}:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
    
    query = select(PurchaseOrder).where(PurchaseOrder.id == str(po_id))
    if user_role != "ADMIN":
        query = query.join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id).join(User, AssetRequest.requester_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )
        
    result = await db.execute(query)
    po = result.scalars().first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found or unauthorized")
        
    po.status = "RECEIVED"
    await db.commit()
    return {"status": "received", "po_id": str(po_id)}


# ---------------------------------------------------------------------------
# Budget Queue (Finance approval queue)
# ---------------------------------------------------------------------------

class BudgetQueueItem(BaseModel):
    id: str
    asset_request_id: Optional[str] = None
    purchase_order_id: Optional[str] = None
    finance_status: Optional[str] = None
    finance_approver_name: Optional[str] = None
    finance_decision_reason: Optional[str] = None
    payment_reference: Optional[str] = None
    payment_status: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/budget-queue", response_model=List[BudgetQueueItem])
async def list_budget_queue(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List FinanceRecords pending approval."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
    
    if user_role == "ADMIN":
        query = select(FinanceRecord).order_by(FinanceRecord.created_at.desc())
    else:
        # Join via AssetRequest or PO
        query = (
            select(FinanceRecord)
            .join(AssetRequest, FinanceRecord.asset_request_id == AssetRequest.id)
            .join(User, AssetRequest.requester_id == User.id)
            .outerjoin(Department, User.department_id == Department.id)
            .where(or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%")))
            .order_by(FinanceRecord.created_at.desc())
        )
        
    result = await db.execute(query)
    records = result.scalars().all()
    return [
        BudgetQueueItem(
            id=str(r.id),
            asset_request_id=str(r.asset_request_id) if r.asset_request_id else None,
            purchase_order_id=str(r.purchase_order_id) if r.purchase_order_id else None,
            finance_status=r.finance_status,
            finance_approver_name=r.finance_approver_name,
            finance_decision_reason=r.finance_decision_reason,
            payment_reference=r.payment_reference,
            payment_status=r.payment_status,
            created_at=r.created_at.isoformat() if r.created_at else None,
        )
        for r in records
    ]


@router.post("/budget-queue/{record_id}/approve")
async def approve_budget_record(
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Finance approves a budget record."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in {"ADMIN", "FINANCE"}:
        raise HTTPException(status_code=403, detail="Only Finance or Admin can approve")
    
    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
    
    query = select(FinanceRecord).where(FinanceRecord.id == str(record_id))
    if user_role != "ADMIN":
        query = query.join(AssetRequest, FinanceRecord.asset_request_id == AssetRequest.id).join(User, AssetRequest.requester_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )
        
    result = await db.execute(query)
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Finance record not found or unauthorized")
        
    record.finance_status = "APPROVED"
    record.finance_approver_id = current_user.id
    record.finance_approver_name = current_user.full_name
    
    # Root Fix: Trigger unified notification (Email + UI)
    await send_notification(
        db=db,
        request_id=record.asset_request_id,
        event_type="status_change",
        old_status="PO_VALIDATED",
        new_status="FINANCE_APPROVED",
        reviewer_name=current_user.full_name
    )
    
    await db.commit()
    return {"status": "approved"}


@router.post("/budget-queue/{record_id}/reject")
async def reject_budget_record(
    record_id: UUID,
    reason: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Finance rejects a budget record with optional reason."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in {"ADMIN", "FINANCE"}:
        raise HTTPException(status_code=403, detail="Only Finance or Admin can reject")
    
    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""
    
    query = select(FinanceRecord).where(FinanceRecord.id == str(record_id))
    if user_role != "ADMIN":
        query = query.join(AssetRequest, FinanceRecord.asset_request_id == AssetRequest.id).join(User, AssetRequest.requester_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )
        
    result = await db.execute(query)
    record = result.scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Finance record not found or unauthorized")
        
    record.finance_status = "REJECTED"
    record.finance_approver_id = current_user.id
    record.finance_approver_name = current_user.full_name
    record.finance_decision_reason = reason
    
    # Root Fix: Trigger unified notification (Email + UI)
    await send_notification(
        db=db,
        request_id=record.asset_request_id,
        event_type="status_change",
        old_status="PO_VALIDATED",
        new_status="FINANCE_REJECTED",
        reviewer_name=current_user.full_name,
        reason=reason
    )
    
    await db.commit()
    return {"status": "rejected"}
