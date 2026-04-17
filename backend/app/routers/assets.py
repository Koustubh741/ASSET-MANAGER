"""
Asset CRUD endpoints (Asynchronous)
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from uuid import UUID
import uuid
from ..utils.uuid_gen import get_uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..schemas.asset_schema import AssetCreate, AssetUpdate, AssetResponse, AssetAssignmentRequest, AssetStatusUpdate, AssetVerificationRequest
from ..schemas.common_schema import PaginatedResponse
from ..services.asset_service import (
    get_all_assets,
    get_all_assets_scoped,
    get_asset_by_id,
    get_asset_by_serial_number,
    get_asset_events,
    get_asset_stats,
    create_asset,
    update_asset,
    assign_asset,
    verify_asset_assignment,
    finalize_asset_assignment,
    get_assets_by_assigned_to,
    get_assets_by_agent,
    get_user_by_id_db,
)
from ..services import asset_service
from ..services import asset_request_service
from ..database.database import get_db
from ..models.models import AssetRequest
from ..utils.auth_utils import get_current_user, STAFF_ROLES
from datetime import date, datetime, timezone

router = APIRouter(
    prefix="/assets",
    tags=["assets"]
)


@router.get("", response_model=PaginatedResponse[AssetResponse])
async def get_all_assets(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all assets with pagination (Asynchronous).
    Root Fix: Implemented for 100k user scalability.
    """
    privileged_roles = STAFF_ROLES
    if current_user.role not in privileged_roles and current_user.position != "MANAGER":
        raise HTTPException(
            status_code=403, 
            detail=f"Unauthorized: You can only view your own assets via /my-assets."
        )
    
    # Enforce department scoping for managers
    department = None
    assigned_to = None
    if current_user.role not in privileged_roles and current_user.position == "MANAGER":
        department = (current_user.dept_obj.name if current_user.dept_obj else current_user.domain)
        assigned_to = current_user.full_name
        
    skip = (page - 1) * size
    
    try:
        if department:
            data, total = await asset_service.get_all_assets_scoped(db, department=department, assigned_to=assigned_to, skip=skip, limit=size)
        else:
            data, total = await asset_service.get_all_assets(db, skip=skip, limit=size)
            
        return PaginatedResponse(
            total=total,
            page=page,
            size=size,
            data=data
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my-assets", response_model=List[AssetResponse])
async def get_my_assets(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get assets assigned to the current user (Asynchronous).
    """
    return await asset_service.get_assets_by_assigned_to(db, current_user.full_name)


@router.get("/stats")
async def get_asset_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get asset statistics for dashboard (Asynchronous).
    """
    return await asset_service.get_asset_stats(db)


@router.get("/renewals")
async def get_assets_for_renewal(
    days_ahead: int = 90,
    expiry_type: str = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get assets with upcoming expiry dates for renewal calendar.
    expiry_type can be: warranty, contract, license, or None for all.
    """
    from sqlalchemy import or_, and_
    from ..models.models import Asset
    
    today = dt_date.today()
    cutoff_date = today + timedelta(days=days_ahead)
    
    filters = []
    if not expiry_type or expiry_type == "warranty":
        filters.append(and_(Asset.warranty_expiry >= today, Asset.warranty_expiry <= cutoff_date))
    if not expiry_type or expiry_type == "contract":
        filters.append(and_(Asset.contract_expiry >= today, Asset.contract_expiry <= cutoff_date))
    if not expiry_type or expiry_type == "license":
        filters.append(and_(Asset.license_expiry >= today, Asset.license_expiry <= cutoff_date))
        
    query = select(Asset).filter(or_(*filters))
    result = await db.execute(query)
    all_assets = result.scalars().all()
    
    renewals = []
    for asset in all_assets:
        expiry_dates = []
        if asset.warranty_expiry and today <= asset.warranty_expiry <= cutoff_date:
            expiry_dates.append({"type": "warranty", "date": asset.warranty_expiry.isoformat()})
        if asset.contract_expiry and today <= asset.contract_expiry <= cutoff_date:
            expiry_dates.append({"type": "contract", "date": asset.contract_expiry.isoformat()})
        if asset.license_expiry and today <= asset.license_expiry <= cutoff_date:
            expiry_dates.append({"type": "license", "date": asset.license_expiry.isoformat()})
            
        renewals.append({
            "asset_id": str(asset.id),
            "asset_name": asset.name,
            "asset_type": asset.type,
            "serial_number": asset.serial_number,
            "status": asset.status,
            "cost": asset.cost,
            "expiry_dates": expiry_dates
        })
    
    renewals.sort(key=lambda x: min(e["date"] for e in x["expiry_dates"]))
    return {"total_count": len(renewals), "renewals": renewals}


@router.get("/by-agent/{agent_id}", response_model=List[AssetResponse])
async def get_assets_by_agent(
    agent_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all assets discovered by a specific agent (Asynchronous).
    """
    return await asset_service.get_assets_by_agent(db, agent_id)


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get asset by ID or serial number (Asynchronous).
    Supports both UUID and human-readable identifiers like serial numbers.
    """
    # Try UUID parsing first
    asset = None
    try:
        uuid_id = UUID(asset_id)
        asset = await asset_service.get_asset_by_id(db, uuid_id)
    except ValueError:
        # Not a valid UUID, try serial number lookup
        asset = await asset_service.get_asset_by_serial_number(db, asset_id)
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # ROOT FIX: Security & Privacy Wall
    # 1. Privileged roles see global inventory
    privileged_roles = STAFF_ROLES
    if current_user.role in privileged_roles:
        return asset

    # 2. Managers see their own assets OR assets within their department
    if current_user.position == "MANAGER":
        is_owner = asset.assigned_to_id == current_user.id
        # Check if the asset's current assignee or specific metadata matches dept
        # We'll rely on our 'assigned_to_dept' check if available, or just personal ownership if unsure.
        # But for 'Root Fix', if assigned_to_id matches someone in their dept, they should see it.
        # However, without joining User, we'll check if they are the owner or if they can view the list.
        # Let's keep it safe: Managers see what they own OR what is in their department list view.
        if is_owner:
            return asset
            
        # Optional: Deep check if asset belongs to their department
        # For now, let's enforce personal ownership for single-asset GET unless privileged.
        # Special case: If the manager is requesting a specific asset via a request, they can see it.
        if not is_owner:
            raise HTTPException(status_code=403, detail="Unauthorized: Asset is not assigned to you")
        return asset

    # 3. Regular End Users ONLY see their own personal assets
    if asset.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this asset")
            
    return asset


@router.post("", response_model=AssetResponse, status_code=201)
async def create_asset(
    asset: AssetCreate,
    db: AsyncSession = Depends(get_db),
    request_id: Optional[UUID] = Query(None, description="Asset request ID"),
    current_user = Depends(get_current_user)
):
    """
    Create a new asset (Asynchronous).
    """
    if request_id:
        asset_request = await asset_request_service.get_asset_request_by_id(db, request_id)
        if not asset_request:
            raise HTTPException(status_code=404, detail="Asset request not found")
        if asset_request.status != "IT_APPROVED":
            raise HTTPException(status_code=403, detail="Asset request not IT approved")
    
    return await asset_service.create_asset(
        db, 
        asset, 
        performed_by_id=current_user.id, 
        performed_by_name=current_user.full_name
    )


@router.patch("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: UUID, 
    asset_update: AssetUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update an asset (Asynchronous).
    """
    # RBAC: Only Asset Managers, IT Management, or IT Support can update assets
    # ROOT FIX: Centralized RBAC
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(
            status_code=403, 
            detail=f"Access Denied: Role {current_user.role} is not authorized for global asset view."
        )
    
    try:
        updated_asset = await asset_service.update_asset(
            db, 
            asset_id, 
            asset_update,
            performed_by_id=current_user.id,
            performed_by_name=current_user.full_name
        )
        if not updated_asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        return updated_asset
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.patch("/{asset_id}/assign", response_model=AssetResponse)
async def assign_asset(
    asset_id: UUID,
    assignment: AssetAssignmentRequest,
    db: AsyncSession = Depends(get_db),
    request_id: Optional[UUID] = Query(None, description="Asset request ID"),
    current_user = Depends(get_current_user)
):
    """
    Assign an asset to a user (Asynchronous).
    """
    if request_id:
        asset_request = await asset_request_service.get_asset_request_by_id(db, request_id)
        if not asset_request:
            raise HTTPException(status_code=404, detail="Asset request not found")
        if asset_request.status != "IT_APPROVED":
            raise HTTPException(status_code=403, detail="Asset request not IT approved")
    else:
        # Try to find request by asset_id
        result = await db.execute(select(AssetRequest).filter(AssetRequest.asset_id == asset_id))
        asset_request_db = result.scalars().first()
        if asset_request_db and asset_request_db.status != "IT_APPROVED":
            raise HTTPException(status_code=403, detail="Asset request not IT approved")
    
    assign_date = assignment.assignment_date or date.today()
    
    assigned_asset = await asset_service.assign_asset(
        db,
        asset_id, 
        assignment.assigned_to, 
        assignment.location or "Office", 
        assign_date,
        assigned_by_id=current_user.id,
        assigned_by_name=current_user.full_name
    )
    if not assigned_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return assigned_asset


@router.patch("/{asset_id}/status", response_model=AssetResponse)
async def update_asset_status(
    asset_id: UUID, 
    status_update: AssetStatusUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update asset status (Asynchronous).
    Accepts JSON body with 'status' field.
    """
    # RBAC: Only Asset Managers, IT Management, or IT Support can update asset status
    privileged_update_roles = STAFF_ROLES
    if current_user.role not in privileged_update_roles:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Insufficient permissions to update asset status"
        )
    
    updated_asset = await asset_service.update_asset(
        db, 
        asset_id, 
        AssetUpdate(status=status_update.status),
        performed_by_id=current_user.id,
        performed_by_name=current_user.full_name
    )
    if not updated_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return updated_asset

@router.patch("/{asset_id}/verification", response_model=AssetResponse)
async def verify_asset(
    asset_id: UUID,
    verification_req: AssetVerificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    End user API to accept or reject an assigned asset (Asynchronous).
    """
    asset = await asset_service.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized: You can only verify assets assigned to you")

    if verification_req.acceptance_status not in ["ACCEPTED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid acceptance_status. Must be ACCEPTED or REJECTED")

    updated_asset = await asset_service.verify_asset_assignment(
        db,
        asset_id,
        acceptance_status=verification_req.acceptance_status,
        reason=verification_req.reason,
        performed_by_id=current_user.id,
        performed_by_name=current_user.full_name
    )

    return updated_asset


@router.get("/{asset_id}/events")
async def get_asset_events(
    asset_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get asset event history (Asynchronous).
    """
    asset = await asset_service.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Security Root Fix: Ownership check
    if current_user.role == "END_USER" and current_user.position != "MANAGER":
        if asset.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to view this asset's events")
            
    from ..services.asset_service import get_asset_events as _get_asset_events
    events = await _get_asset_events(db, asset_id)
    return events


@router.get("/{asset_id}/timeline")
async def get_asset_timeline(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get full asset lifecycle timeline (Asynchronous).
    """
    asset = await asset_service.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Security Root Fix: Ownership check
    if current_user.role == "END_USER" and current_user.position != "MANAGER":
        if asset.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to view this asset's timeline")
            
    from ..services.timeline_service import timeline_service
    timeline = await timeline_service.get_asset_timeline(db, asset_id)
    return timeline


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: UUID,
    hard_delete: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete an asset (Asynchronous).
    By default, performs a soft delete by setting status to 'Retired'.
    Set hard_delete=true to permanently remove the asset from the database.
    """
    from ..models.models import Asset, AuditLog
    import uuid as _uuid
    
    # Get the asset
    asset = await asset_service.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Check if asset is currently assigned
    if asset.assigned_to and asset.status == "In Use":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete an asset that is currently assigned. Unassign it first."
        )
    
    if hard_delete:
        # Hard delete - remove from database
        result = await db.execute(
            select(Asset).filter(Asset.id == asset_id)
        )
        asset_to_delete = result.scalars().first()
        if asset_to_delete:
            await db.delete(asset_to_delete)
            
            # Create audit log
            audit_log = AuditLog(
                id=str(get_uuid()),
                entity_type="Asset",
                entity_id=str(asset_id),
                action="HARD_DELETED",
                performed_by=current_user.id,
                details={"asset_name": asset.name, "serial_number": asset.serial_number}
            )
            db.add(audit_log)
            await db.commit()
            
            return {"status": "success", "message": f"Asset {asset_id} permanently deleted"}
    else:
        # Soft delete - set status to Retired
        updated_asset = await asset_service.update_asset(
            db, 
            asset_id, 
            AssetUpdate(status="Retired", disposal_status="SOFT_DELETED")
        )
        
        # Create audit log
        audit_log = AuditLog(
            id=str(get_uuid()),
            entity_type="Asset",
            entity_id=str(asset_id),
            action="SOFT_DELETED",
            performed_by=current_user.id,
            details={"asset_name": asset.name, "previous_status": asset.status}
        )
        db.add(audit_log)
        await db.commit()
        
        return {"status": "success", "message": f"Asset {asset_id} marked as Retired"}


# ===================== CMDB Relationship Endpoints =====================

@router.get("/relationships/all")
async def get_all_relationships(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all asset relationships across the entire platform (Admin/Manager only).
    """
    from ..models.models import AssetRelationship
    
    # RBAC check
    if current_user.role not in ["ASSET_MANAGER", "IT_MANAGEMENT", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized to view all relationships")
        
    result = await db.execute(select(AssetRelationship))
    relationships = result.scalars().all()
    
    return [
        {
            "id": str(rel.id),
            "source_asset_id": str(rel.source_asset_id),
            "target_asset_id": str(rel.target_asset_id),
            "relationship_type": rel.relationship_type,
            "criticality": rel.criticality,
            "description": rel.description
        }
        for rel in relationships
    ]


@router.get("/{asset_id}/relationships")
async def get_asset_relationships(
    asset_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all relationships for an asset (both upstream and downstream).
    """
    from ..models.models import Asset, AssetRelationship
    
    # Verify asset exists
    asset = await asset_service.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Get relationships where this asset is the source (downstream/outgoing)
    downstream_result = await db.execute(
        select(AssetRelationship).filter(AssetRelationship.source_asset_id == asset_id)
    )
    downstream_rels = downstream_result.scalars().all()
    
    # Get relationships where this asset is the target (upstream/incoming)
    upstream_result = await db.execute(
        select(AssetRelationship).filter(AssetRelationship.target_asset_id == asset_id)
    )
    upstream_rels = upstream_result.scalars().all()
    
    # Build response with asset details
    async def enrich_relationship(rel, direction):
        if direction == "downstream":
            related_asset = await asset_service.get_asset_by_id(db, rel.target_asset_id)
        else:
            related_asset = await asset_service.get_asset_by_id(db, rel.source_asset_id)
        
        return {
            "id": str(rel.id),
            "relationship_type": rel.relationship_type,
            "direction": direction,
            "criticality": rel.criticality,
            "description": rel.description,
            "related_asset": {
                "id": str(related_asset.id) if related_asset else None,
                "name": related_asset.name if related_asset else "Unknown",
                "type": related_asset.type if related_asset else None,
                "status": related_asset.status if related_asset else None,
            } if related_asset else None,
            "created_at": rel.created_at.isoformat() if rel.created_at else None
        }
    
    upstream = []
    for rel in upstream_rels:
        upstream.append(await enrich_relationship(rel, "upstream"))
    
    downstream = []
    for rel in downstream_rels:
        downstream.append(await enrich_relationship(rel, "downstream"))
    
    return {
        "asset_id": str(asset_id),
        "asset_name": asset.name,
        "upstream": upstream,
        "downstream": downstream,
        "total_relationships": len(upstream) + len(downstream)
    }


from pydantic import BaseModel as PydanticBaseModel
from typing import Optional as OptType


class CreateRelationshipRequest(PydanticBaseModel):
    target_asset_id: UUID
    relationship_type: str  # parent_of, depends_on, connected_to, runs_on, backs_up_to
    description: OptType[str] = None
    criticality: OptType[float] = 3.0


@router.post("/{asset_id}/relationships")
async def create_asset_relationship(
    asset_id: UUID,
    request: CreateRelationshipRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new relationship between two assets.
    """
    from ..models.models import Asset, AssetRelationship
    import uuid as _uuid
    
    # Valid relationship types
    valid_types = ["parent_of", "child_of", "depends_on", "depended_by", "connected_to", "runs_on", "backs_up_to"]
    if request.relationship_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid relationship type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Verify source asset exists
    source_asset = await asset_service.get_asset_by_id(db, asset_id)
    if not source_asset:
        raise HTTPException(status_code=404, detail="Source asset not found")
    
    # Verify target asset exists
    target_asset = await asset_service.get_asset_by_id(db, request.target_asset_id)
    if not target_asset:
        raise HTTPException(status_code=404, detail="Target asset not found")
    
    # Prevent self-referencing
    if asset_id == request.target_asset_id:
        raise HTTPException(status_code=400, detail="Cannot create relationship with self")
    
    # Check for existing relationship
    existing = await db.execute(
        select(AssetRelationship).filter(
            AssetRelationship.source_asset_id == asset_id,
            AssetRelationship.target_asset_id == request.target_asset_id,
            AssetRelationship.relationship_type == request.relationship_type
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Relationship already exists")
    
    new_relationship = AssetRelationship(
        id=get_uuid(),
        source_asset_id=asset_id,
        target_asset_id=request.target_asset_id,
        relationship_type=request.relationship_type,
        description=request.description,
        criticality=request.criticality,
        created_by=current_user.id
    )
    
    db.add(new_relationship)
    await db.commit()
    await db.refresh(new_relationship)
    
    return {
        "status": "success",
        "relationship": {
            "id": str(new_relationship.id),
            "source_asset": {"id": str(asset_id), "name": source_asset.name},
            "target_asset": {"id": str(request.target_asset_id), "name": target_asset.name},
            "relationship_type": request.relationship_type,
            "criticality": request.criticality
        }
    }


@router.delete("/{asset_id}/relationships/{relationship_id}")
async def delete_asset_relationship(
    asset_id: UUID,
    relationship_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete a specific relationship.
    """
    from ..models.models import AssetRelationship
    
    # Find the relationship
    result = await db.execute(
        select(AssetRelationship).filter(
            AssetRelationship.id == relationship_id,
            (AssetRelationship.source_asset_id == asset_id) | (AssetRelationship.target_asset_id == asset_id)
        )
    )
    relationship = result.scalars().first()
    
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    await db.delete(relationship)
    await db.commit()
    
    return {"status": "success", "message": f"Relationship {relationship_id} deleted"}
@router.post("/{asset_id}/provision")
async def provision_software(
    asset_id: UUID,
    software_name: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Log a software provisioning event for an asset.
    """
    from ..models.models import AuditLog
    import json
    
    audit_entry = AuditLog(
        entity_type="Asset",
        entity_id=str(asset_id),
        action="SOFTWARE_PROVISIONED",
        performed_by=current_user.id,
        details={
            "software": software_name,
            "status": "Installed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
    db.add(audit_entry)
    await db.commit()
    return {"status": "success", "message": f"Provisioned {software_name}"}
