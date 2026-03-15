from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_
from typing import List, Dict, Any
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

from ..database.database import get_db
from ..models.models import Asset, Ticket, MaintenanceRecord, User, PurchaseOrder, SoftwareLicense
from ..utils.auth_utils import get_current_user

router = APIRouter(
    prefix="/analytics/oem",
    tags=["oem-analytics"]
)

class OEMMetric(BaseModel):
    vendor: str
    asset_count: int
    ticket_count: int
    procurement_cost: float
    maintenance_cost: float
    license_cost: float
    total_cost: float
    avg_mttr_hours: float
    reliability_score: float
    freq_penalty: float
    mttr_penalty: float
    investment_rating: str # Invest, Watch, Avoid

class OEMAnalyticsResponse(BaseModel):
    metrics: List[OEMMetric]
    fleet_health_index: float
    top_performer: str
    under_performer: str

@router.get("/metrics", response_model=OEMAnalyticsResponse)
async def get_oem_metrics(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Calculate OEM performance metrics based on asset data, tickets, and maintenance logs.
    """
    # 1. Fetch all assets
    asset_result = await db.execute(select(Asset))
    assets = asset_result.scalars().all()
    
    # 2. Fetch all maintenance records
    maint_result = await db.execute(select(MaintenanceRecord))
    maintenance_records = maint_result.scalars().all()
    
    # 3. Fetch all tickets
    ticket_result = await db.execute(select(Ticket).where(Ticket.related_asset_id != None))
    tickets = ticket_result.scalars().all()
    
    # 4. Fetch all Purchase Orders (Audited Financials)
    po_result = await db.execute(select(PurchaseOrder))
    purchase_orders = po_result.scalars().all()
    
    # 5. Fetch all Software Licenses (Vendor Overhead)
    license_result = await db.execute(select(SoftwareLicense))
    software_licenses = license_result.scalars().all()
    
    # Organize data by vendor
    oem_data = {}
    
    for a in assets:
        vendor = a.vendor or "Unknown Vendor"
        if vendor not in oem_data:
            oem_data[vendor] = {
                "asset_count": 0,
                "ticket_count": 0,
                "maintenance_cost": 0.0,
                "procurement_cost_asset": 0.0, # Fallback
                "procurement_cost_audited": 0.0, # From POs
                "license_cost": 0.0,
                "mttr_sums": [],
                "asset_ids": set(),
                "request_ids": set(),
                "po_ids_processed": set()
            }
        
        oem_data[vendor]["asset_count"] += 1
        oem_data[vendor]["procurement_cost_asset"] += a.cost or 0.0
        oem_data[vendor]["asset_ids"].add(str(a.id))
        if a.request_id:
            oem_data[vendor]["request_ids"].add(str(a.request_id))
        
    # Aggregate Audited Procurement Costs from POs
    for po in purchase_orders:
        req_id_str = str(po.asset_request_id)
        # Find which vendor this PO belongs to (via asset list)
        for vendor, data in oem_data.items():
            if req_id_str in data["request_ids"] and str(po.id) not in data["po_ids_processed"]:
                # Audited TCO includes tax and shipping
                po_total = (po.total_cost or 0.0) + (po.tax_amount or 0.0) + (po.shipping_handling or 0.0)
                data["procurement_cost_audited"] += po_total
                data["po_ids_processed"].add(str(po.id))
                break

    # Aggregate License Costs by Vendor
    for sl in software_licenses:
        if sl.vendor:
            for vendor in oem_data.keys():
                if sl.vendor.lower() in vendor.lower() or vendor.lower() in sl.vendor.lower():
                    oem_data[vendor]["license_cost"] += sl.cost or 0.0

    # Aggregate Maintenance Costs
    for m in maintenance_records:
        asset = next((a for a in assets if a.id == m.asset_id), None)
        if asset:
            vendor = asset.vendor or "Unknown Vendor"
            if vendor in oem_data:
                oem_data[vendor]["maintenance_cost"] += m.cost or 0.0
                
    # Aggregate Tickets and MTTR
    for t in tickets:
        asset_id_str = str(t.related_asset_id)
        for vendor, data in oem_data.items():
            if asset_id_str in data["asset_ids"]:
                data["ticket_count"] += 1
                if t.status in ["Closed", "Resolved", "RESOLVED"]:
                    duration = t.updated_at - t.created_at
                    hours = duration.total_seconds() / 3600
                    data["mttr_sums"].append(hours)
                break

    metrics_list = []
    total_reliability = 0.0
    
    for vendor, data in oem_data.items():
        avg_mttr = sum(data["mttr_sums"]) / len(data["mttr_sums"]) if data["mttr_sums"] else 0.0
        
        # Reliability math
        ticket_freq = data["ticket_count"] / data["asset_count"] if data["asset_count"] > 0 else 0
        freq_penalty = round(ticket_freq * 50, 1)
        mttr_penalty = round(avg_mttr * 0.5, 1)
        reliability = max(100 - freq_penalty - mttr_penalty, 0)
        
        # Investment Rating
        if reliability > 85: rating = "Invest"
        elif reliability > 60: rating = "Watch"
        else: rating = "Avoid"
        
        total_reliability += reliability
        
        # Final Procurement Choice: Use audited if available, fallback to asset sum
        final_procurement = data["procurement_cost_audited"] if data["procurement_cost_audited"] > 0 else data["procurement_cost_asset"]
        
        metrics_list.append(OEMMetric(
            vendor=vendor,
            asset_count=data["asset_count"],
            ticket_count=data["ticket_count"],
            maintenance_cost=data["maintenance_cost"],
            procurement_cost=final_procurement,
            license_cost=data["license_cost"],
            total_cost=final_procurement + data["maintenance_cost"] + data["license_cost"],
            avg_mttr_hours=round(avg_mttr, 1),
            reliability_score=round(reliability, 1),
            freq_penalty=freq_penalty,
            mttr_penalty=mttr_penalty,
            investment_rating=rating
        ))
        
    metrics_list.sort(key=lambda x: x.reliability_score, reverse=True)
    avg_fleet_health = total_reliability / len(metrics_list) if metrics_list else 0.0
    
    return OEMAnalyticsResponse(
        metrics=metrics_list,
        fleet_health_index=round(avg_fleet_health, 1),
        top_performer=metrics_list[0].vendor if metrics_list else "N/A",
        under_performer=metrics_list[-1].vendor if metrics_list else "N/A"
    )
