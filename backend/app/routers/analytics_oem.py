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
    ticket_breakdown: Dict[str, int]
    severity_breakdown: Dict[str, int]
    primary_impact: str # Hardware, Software, etc.
    asset_days: int

class OEMAnalyticsResponse(BaseModel):
    metrics: List[OEMMetric]
    fleet_health_index: float
    top_performer: str
    under_performer: str
    unlinked_technical_count: int
    smart_attributed_count: int
    data_quality_score: float

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
    
    # 3. Fetch all tickets (including orphaned for Phase 4 analysis)
    ticket_result = await db.execute(select(Ticket))
    tickets = ticket_result.scalars().all()
    
    # 4. Fetch all Purchase Orders (Audited Financials)
    po_result = await db.execute(select(PurchaseOrder))
    purchase_orders = po_result.scalars().all()
    
    # 5. Fetch all Software Licenses (Vendor Overhead)
    license_result = await db.execute(select(SoftwareLicense))
    software_licenses = license_result.scalars().all()
    
    # Organize data by vendor and user asset ownership
    oem_data = {}
    user_assets = {} # Map requestor_id to their assets
    
    for a in assets:
        if a.assigned_to_id:
            uid = str(a.assigned_to_id)
            if uid not in user_assets: user_assets[uid] = []
            user_assets[uid].append(a)

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
                "po_ids_processed": set(),
                "ticket_breakdown": {},
                "severity_breakdown": {"High": 0, "Medium": 0, "Low": 0},
                "weighted_penalty": 0.0,
                "asset_days": 0
            }
        
        oem_data[vendor]["asset_count"] += 1
        oem_data[vendor]["procurement_cost_asset"] += a.cost or 0.0
        oem_data[vendor]["asset_ids"].add(str(a.id))
        
        # Calculate asset age in days for normalization
        age_delta = datetime.now(a.created_at.tzinfo) - a.created_at
        days_active = max(age_delta.days, 1) # Minimum 1 day
        oem_data[vendor]["asset_days"] += days_active

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
                
    # Aggregate Tickets, MTTR, and Smart Attribution
    unlinked_technical_count = 0
    smart_attributed_count = 0
    technical_categories = ["Hardware", "Software", "BIOS", "Performance", "Display", "Network"]

    for t in tickets:
        asset_id_str = str(t.related_asset_id) if t.related_asset_id else None
        linked = False

        if asset_id_str:
            for vendor, data in oem_data.items():
                if asset_id_str in data["asset_ids"]:
                    data["ticket_count"] += 1
                    linked = True
                    # Category breakdown
                    cat = t.category or "Other"
                    data["ticket_breakdown"][cat] = data["ticket_breakdown"].get(cat, 0) + 1
                    
                    # Severity weights
                    prio = t.priority or "Medium"
                    data["severity_breakdown"][prio] = data["severity_breakdown"].get(prio, 0) + 1
                    
                    weights = {"High": 5.0, "Medium": 2.0, "Low": 1.0}
                    prio_weight = weights.get(prio, 2.0)
                    data["weighted_penalty"] += prio_weight

                    if t.status in ["Closed", "Resolved", "RESOLVED"]:
                        duration = t.updated_at - t.created_at
                        hours = duration.total_seconds() / 3600
                        data["mttr_sums"].append(hours)
                    break
        
        # Phase 4: Smart Attribution for orphaned technical tickets
        if not linked and (t.category in technical_categories or any(kw in (t.subject or "").lower() for kw in ["error", "fail", "broken"])):
            unlinked_technical_count += 1
            if t.requestor_id:
                uid_str = str(t.requestor_id)
                owned = user_assets.get(uid_str, [])
                
                # Refined Attribution: If all assets owned by the user are from the SAME vendor
                if len(owned) > 0:
                    vendors = {a.vendor for a in owned if a.vendor}
                    if len(vendors) == 1:
                        target_vendor = list(vendors)[0]
                        if target_vendor in oem_data:
                            data = oem_data[target_vendor]
                            data["ticket_count"] += 1
                            smart_attributed_count += 1
                            cat = t.category or "Smart-Attributed"
                            data["ticket_breakdown"][cat] = data["ticket_breakdown"].get(cat, 0) + 1
                            
                            prio = t.priority or "Medium"
                            data["severity_breakdown"][prio] = data["severity_breakdown"].get(prio, 0) + 1
                            data["weighted_penalty"] += 2.0 
                            linked = True

                # Secondary Fallback: Text matching in Subject/Description
                if not linked:
                    search_text = f"{(t.subject or '')} {(t.description or '')}".lower()
                    for v_name in oem_data.keys():
                        if v_name.lower() in search_text and v_name != "Unknown Vendor" and v_name != "Various":
                            data = oem_data[v_name]
                            data["ticket_count"] += 1
                            smart_attributed_count += 1
                            data["ticket_breakdown"]["Text-Attributed"] = data["ticket_breakdown"].get("Text-Attributed", 0) + 1
                            
                            prio = t.priority or "Medium"
                            data["severity_breakdown"][prio] = data["severity_breakdown"].get(prio, 0) + 1
                            data["weighted_penalty"] += 2.0
                            linked = True
                            break

    metrics_list = []
    total_reliability = 0.0
    
    for vendor, data in oem_data.items():
        avg_mttr = sum(data["mttr_sums"]) / len(data["mttr_sums"]) if data["mttr_sums"] else 0.0
        
        # Reliability math (Phase 3: Normalized by Asset Days and Weighted by Priority)
        # Formula: 100 - (WeightedPenalty / (AssetDays/30) * 10) - (AvgMTTR * 0.5)
        # We divide AssetDays by 30 to get "Asset Months" as a more stable denominator
        asset_months = max(data["asset_days"] / 30, 1)
        freq_penalty = round((data["weighted_penalty"] / asset_months) * 5, 1)
        mttr_penalty = round(avg_mttr * 0.5, 1)
        reliability = max(100 - freq_penalty - mttr_penalty, 0)
        
        # Investment Rating
        if reliability > 85: rating = "Invest"
        elif reliability > 60: rating = "Watch"
        else: rating = "Avoid"
        
        total_reliability += reliability
        
        # Final Procurement Choice: Use audited if available, fallback to asset sum
        final_procurement = data["procurement_cost_audited"] if data["procurement_cost_audited"] > 0 else data["procurement_cost_asset"]

        # Primary Impact Analysis
        primary_impact = "None"
        if data["ticket_breakdown"]:
            primary_impact = max(data["ticket_breakdown"], key=data["ticket_breakdown"].get)

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
            investment_rating=rating,
            ticket_breakdown=data["ticket_breakdown"],
            severity_breakdown=data["severity_breakdown"],
            primary_impact=primary_impact,
            asset_days=data["asset_days"]
        ))

        
    metrics_list.sort(key=lambda x: x.reliability_score, reverse=True)
    avg_fleet_health = total_reliability / len(metrics_list) if metrics_list else 0.0
    
    # Calculate Data Quality Score (Percentage of technical tickets that are linked)
    total_tech = unlinked_technical_count + (sum(m.ticket_count for m in metrics_list) - smart_attributed_count)
    dq_score = 100 - (unlinked_technical_count / max(total_tech, 1) * 100) if total_tech > 0 else 100.0

    return OEMAnalyticsResponse(
        metrics=metrics_list,
        fleet_health_index=round(avg_fleet_health, 1),
        top_performer=metrics_list[0].vendor if metrics_list else "N/A",
        under_performer=metrics_list[-1].vendor if metrics_list else "N/A",
        unlinked_technical_count=unlinked_technical_count,
        smart_attributed_count=smart_attributed_count,
        data_quality_score=round(dq_score, 1)
    )
