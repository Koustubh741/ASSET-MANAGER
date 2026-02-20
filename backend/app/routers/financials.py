"""
Financial summary and reporting endpoints (Asynchronous)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from ..database.database import get_db
from ..models.models import Asset, PurchaseOrder, PurchaseInvoice
from ..utils.auth_utils import get_current_user
from fastapi import HTTPException, status

router = APIRouter(
    prefix="/financials",
    tags=["financials"]
)


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
    if not _role_allowed(getattr(current_user, "role", None)):
        raise HTTPException(status_code=403, detail="Unauthorized to view financial data")
    # Get all assets
    result = await db.execute(select(Asset))
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
    
    # Procurement totals
    po_result = await db.execute(select(PurchaseOrder))
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
    if not _role_allowed(getattr(current_user, "role", None)):
        raise HTTPException(status_code=403, detail="Unauthorized to view financial data")
    result = await db.execute(select(Asset))
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
    if current_user.role not in ["ADMIN", "SYSTEM_ADMIN", "FINANCE", "PROCUREMENT", "IT_MANAGEMENT"]:
        raise HTTPException(status_code=403, detail="Unauthorized to view financial data")
    result = await db.execute(select(PurchaseOrder))
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
    if not _role_allowed(getattr(current_user, "role", None)):
        raise HTTPException(status_code=403, detail="Unauthorized to view financial data")
    result = await db.execute(select(Asset))
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


# Roles that can view financials/procurement summary (Procurement & Finance pages + Asset/Inventory Managers with nav access)
_ALLOWED_FINANCIALS_ROLES = ["ADMIN", "SYSTEM_ADMIN", "FINANCE", "PROCUREMENT", "IT_MANAGEMENT", "ASSET_MANAGER", "ASSET_INVENTORY_MANAGER"]


def _role_allowed(user_role: Optional[str]) -> bool:
    if not user_role:
        return False
    return (user_role.strip().upper()) in [r.upper() for r in _ALLOWED_FINANCIALS_ROLES]


@router.get("/procurement-summary", response_model=ProcurementSummaryResponse)
async def get_procurement_summary(
    months: int = 6,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Procurement dashboard: pending PO count, total value, and monthly spend for charts.
    """
    if not _role_allowed(getattr(current_user, "role", None)):
        raise HTTPException(status_code=403, detail="Unauthorized")
    try:
        result = await db.execute(select(PurchaseOrder))
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

