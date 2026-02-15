"""
Asset service layer - Database operations using SQLAlchemy (Asynchronous)
"""
import uuid
from uuid import UUID
from datetime import datetime, date, timedelta
from typing import List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, and_, select, delete, update
from sqlalchemy.orm import selectinload
from ..models.models import Asset, ByodDevice, User, AssetAssignment, AssetInventory
from ..schemas.asset_schema import AssetCreate, AssetUpdate, AssetResponse



async def get_user_by_id_db(db: AsyncSession, user_id: UUID) -> Optional[User]:
    """
    Get a user by ID (returns DB model)
    """
    result = await db.execute(select(User).filter(User.id == user_id))
    return result.scalars().first()


async def finalize_asset_assignment(
    db: AsyncSession,
    asset_id: UUID,
    requester_id: UUID,
    manager_id: Optional[UUID] = None,
    manager_name: Optional[str] = None
) -> bool:
    """
    Finalize asset assignment: set status to In Use, update owner, and log fulfillment.
    """
    try:
        from .timeline_service import timeline_service
        
        a_result = await db.execute(select(Asset).filter(Asset.id == asset_id))
        asset = a_result.scalars().first()
        if not asset:
            return False
            
        asset.status = "In Use"
        asset.assignment_date = datetime.now().date()
        
        # Ensure ownership is finalized
        user = await get_user_by_id_db(db, requester_id)
        if user:
            asset.assigned_to = user.full_name
            asset.assigned_to_id = user.id
        
        # Log the finalization
        await timeline_service.log_event(
            db, asset.id, "ASSIGNMENT_FINALIZED",
            f"Assignment finalized. Asset is now In Use by {user.full_name if user else 'Unknown User'}.",
            performed_by_id=manager_id,
            performed_by_name=manager_name or "System/Manager"
        )
        return True
    except Exception as e:
        print(f"Error finalizing asset assignment: {e}")
        return False


async def get_all_assets_scoped(db: AsyncSession, department: str) -> List[AssetResponse]:
    """
    Get all assets scoped by department or domain (Asynchronous)
    """
    from sqlalchemy import or_
    
    # 1. Fetch standard assets joined with User
    query = select(Asset).join(User, Asset.assigned_to_id == User.id).filter(
        or_(
            User.department.ilike(f"%{department}%"),
            User.domain.ilike(f"%{department}%")
        )
    )
    result = await db.execute(query)
    standard_assets = result.scalars().all()
    results = [AssetResponse.model_validate(asset) for asset in standard_assets]
    
    # 2. Fetch BYOD devices for users in this department
    byod_query = select(ByodDevice, User).join(User, ByodDevice.owner_id == User.id).filter(
        or_(
            User.department.ilike(f"%{department}%"),
            User.domain.ilike(f"%{department}%")
        )
    )
    byod_result = await db.execute(byod_query)
    byods = byod_result.all()
    
    for byod, owner in byods:
        results.append(AssetResponse(
            id=byod.id,
            name=f"BYOD: {byod.device_model}",
            type="BYOD",
            model=byod.device_model,
            vendor="Personal",
            serial_number=byod.serial_number,
            status="In Use",
            assigned_to=owner.full_name,
            location=owner.location or "Remote",
            segment="IT",
            specifications={"os_version": byod.os_version},
            created_at=byod.created_at or datetime.now(),
            updated_at=byod.created_at or datetime.now(),
            assignment_date=(byod.created_at or datetime.now()).date()
        ))
        
    return results


async def get_all_assets(db: AsyncSession) -> List[AssetResponse]:
    """
    Get all assets from the database
    """
    # 1. Fetch standard assets
    result = await db.execute(select(Asset))
    standard_assets = result.scalars().all()
    results = [AssetResponse.model_validate(asset) for asset in standard_assets]
    
    # 2. Fetch BYOD devices and map them to AssetResponse
    byod_query = select(ByodDevice, User).join(User, ByodDevice.owner_id == User.id)
    byod_result = await db.execute(byod_query)
    byods = byod_result.all()
    
    for byod, owner in byods:
        results.append(AssetResponse(
            id=byod.id,
            name=f"BYOD: {byod.device_model}",
            type="BYOD",
            model=byod.device_model,
            vendor="Personal",
            serial_number=byod.serial_number,
            status="In Use",
            assigned_to=owner.full_name,
            location=owner.location or "Remote",
            segment="IT",
            specifications={"os_version": byod.os_version},
            created_at=byod.created_at or datetime.now(),
            updated_at=byod.created_at or datetime.now(),
            assignment_date=(byod.created_at or datetime.now()).date()
        ))
        
    return results


async def get_asset_by_id(db: AsyncSession, asset_id: UUID) -> Optional[AssetResponse]:
    """
    Get a single asset by ID from the database
    """
    result = await db.execute(select(Asset).filter(Asset.id == asset_id))
    asset = result.scalars().first()
    if asset:
        return AssetResponse.model_validate(asset)
    return None


async def get_asset_by_serial_number(db: AsyncSession, serial_number: str) -> Optional[AssetResponse]:
    """
    Get a single asset by serial number from the database
    """
    result = await db.execute(select(Asset).filter(Asset.serial_number == serial_number))
    asset = result.scalars().first()
    if asset:
        return AssetResponse.model_validate(asset)
    return None


async def get_assets_by_assigned_to(db: AsyncSession, user_name: str) -> List[AssetResponse]:
    """
    Get all assets assigned to a specific user
    """
    # 1. Standard assets
    standard_query = select(Asset).filter(func.lower(Asset.assigned_to) == user_name.lower())
    standard_result = await db.execute(standard_query)
    standard_assets = standard_result.scalars().all()
    results = [AssetResponse.model_validate(asset) for asset in standard_assets]
    
    # 2. BYOD devices for this user
    byod_query = select(ByodDevice, User).join(User, ByodDevice.owner_id == User.id).filter(func.lower(User.full_name) == user_name.lower())
    byod_result = await db.execute(byod_query)
    byods = byod_result.all()
    
    for byod, owner in byods:
        results.append(AssetResponse(
            id=byod.id,
            name=f"BYOD: {byod.device_model}",
            type="BYOD",
            model=byod.device_model,
            vendor="Personal",
            serial_number=byod.serial_number,
            status="In Use",
            assigned_to=owner.full_name,
            location=owner.location or "Remote",
            segment="IT",
            specifications={"os_version": byod.os_version},
            created_at=byod.created_at or datetime.now(),
            updated_at=byod.created_at or datetime.now(),
            assignment_date=(byod.created_at or datetime.now()).date()
        ))
        
    return results


async def get_assets_by_agent(db: AsyncSession, agent_id: str) -> List[AssetResponse]:
    """
    Get all assets discovered by a specific agent ID.
    Agent ID is stored in the 'specifications' JSONB blob.
    """
    # Query assets where specifications ->> 'Agent ID' matches agent_id
    query = select(Asset).filter(Asset.specifications['Agent ID'].as_string() == str(agent_id))
    result = await db.execute(query)
    assets = result.scalars().all()
    return [AssetResponse.model_validate(asset) for asset in assets]


async def create_asset(db: AsyncSession, asset: AssetCreate, performed_by_id: Optional[UUID] = None, performed_by_name: str = "System") -> AssetResponse:
    """
    Create a new asset in the database
    """
    # Convert Pydantic model to dict, excluding None values for optional fields
    asset_dict = asset.model_dump(exclude_unset=True)
    
    # Create SQLAlchemy model instance
    db_asset = Asset(
        id=uuid.uuid4(),
        **asset_dict
    )
    
    db.add(db_asset)
    
    # Inventory Logic for new assets
    if db_asset.status == "In Stock":
        inventory_item = AssetInventory(
            id=uuid.uuid4(),
            asset_id=db_asset.id,
            location=db_asset.location,
            status="Available",
            stocked_at=datetime.now()
        )
        db.add(inventory_item)
        
    await db.commit()
    await db.refresh(db_asset)
    
    # Log usage of Timeline Service
    from .timeline_service import timeline_service
    await timeline_service.log_event(
        db, db_asset.id, "CREATED", 
        f"Asset created with status {db_asset.status}", 
        performed_by_id=performed_by_id,
        performed_by_name=performed_by_name,
        metadata={"initial_status": db_asset.status}
    )

    return AssetResponse.model_validate(db_asset)


async def update_asset(
    db: AsyncSession, 
    asset_id: UUID, 
    asset_update: AssetUpdate,
    performed_by_id: Optional[UUID] = None,
    performed_by_name: str = "System"
) -> Optional[AssetResponse]:
    """
    Update an existing asset in the database
    """
    # Find the asset
    result = await db.execute(select(Asset).filter(Asset.id == asset_id))
    db_asset = result.scalars().first()
    if not db_asset:
        return None
    
    # Update only provided fields
    update_data = asset_update.model_dump(exclude_unset=True)
    
    # Track status change for Inventory management
    previous_status = db_asset.status
    new_status = update_data.get('status')
    
    for field, value in update_data.items():
        setattr(db_asset, field, value)
        
    # Inventory Management Logic
    if new_status and new_status != previous_status:
        # 1. Entering Stock
        if new_status == "In Stock":
            inv_result = await db.execute(select(AssetInventory).filter(AssetInventory.asset_id == asset_id))
            exists = inv_result.scalars().first()
            if not exists:
                inventory_item = AssetInventory(
                    id=uuid.uuid4(),
                    asset_id=asset_id,
                    location=db_asset.location,
                    status="Available",
                    stocked_at=datetime.now()
                )
                db.add(inventory_item)
        
        # 2. Leaving Stock (assigned, retired, repair, etc.)
        elif previous_status == "In Stock":
            await db.execute(delete(AssetInventory).where(AssetInventory.asset_id == asset_id))
    
    await db.commit()
    await db.refresh(db_asset)
    
    # Log Status Change if applicable
    if new_status and new_status != previous_status:
        from .timeline_service import timeline_service
        await timeline_service.log_event(
            db, asset_id, "STATUS_CHANGE",
            f"Status changed from {previous_status} to {new_status}",
            performed_by_id=performed_by_id,
            performed_by_name=performed_by_name,
            metadata={"old_value": previous_status, "new_value": new_status, "field_name": "Status"}
        )

    return AssetResponse.model_validate(db_asset)


async def assign_asset(db: AsyncSession, asset_id: UUID, user: str, location: str, assign_date: date, assigned_by_id: Optional[UUID] = None, assigned_by_name: str = "System") -> Optional[AssetResponse]:
    """
    Assign an asset to a user and record in assignment history
    """
    # Resolve 'user' string (Name or ID) to a User object
    user_obj = None
    
    # Try as ID
    try:
        if isinstance(user, UUID) or (isinstance(user, str) and len(user) in [32, 36]):
            user_result = await db.execute(select(User).filter(User.id == user))
            user_obj = user_result.scalars().first()
    except:
        pass
        
    # Try as Name
    if not user_obj:
        user_name_result = await db.execute(select(User).filter(func.lower(User.full_name) == func.lower(user)))
        user_obj = user_name_result.scalars().first()

    # 1. Update the Asset record
    updated_asset = await update_asset(
        db,
        asset_id,
        AssetUpdate(
            assigned_to=user_obj.full_name if user_obj else user,
            location=location,
            assignment_date=assign_date,
            assigned_by=assigned_by_name,
            status="Active"
        )
    )
    
    # 2. Create Assignment History Record
    if updated_asset:
        try:
            # If User found, create assignment record
            if user_obj:
                # Check if active assignment already exists to avoid duplicates
                exists_result = await db.execute(select(AssetAssignment).filter(
                    AssetAssignment.asset_id == asset_id,
                    AssetAssignment.user_id == user_obj.id
                ))
                exists = exists_result.scalars().first()
                
                if not exists:
                    assignment = AssetAssignment(
                        id=uuid.uuid4(),
                        asset_id=asset_id,
                        user_id=user_obj.id,
                        assigned_by=assigned_by_name, 
                        location=location,
                        assigned_at=assign_date or datetime.now()
                    )
                    db.add(assignment)
                    await db.commit()
            
        except Exception as e:
            print(f"Error creating assignment history: {e}")
            # Don't fail the request if history creation fails
            
        except Exception as e:
            print(f"Error creating assignment history: {e}")
            # Don't fail the request if history creation fails
            
    # Log Assignment Event
    if updated_asset:
        from .timeline_service import timeline_service
        assigned_name = user_obj.full_name if user_obj else user
        await timeline_service.log_event(
            db, asset_id, "ASSIGNMENT",
            f"Assigned to {assigned_name} at {location}",
            performed_by_id=assigned_by_id,
            performed_by_name=assigned_by_name,
            metadata={"assigned_to": assigned_name, "location": location}
        )

    return updated_asset


async def get_asset_stats(db: AsyncSession):
    """
    Get aggregated statistics from the database
    """
    # Total count
    total = (await db.execute(select(func.count(Asset.id)))).scalar()
    
    # Status counts
    active = (await db.execute(select(func.count(Asset.id)).filter(Asset.status == "Active"))).scalar()
    in_stock = (await db.execute(select(func.count(Asset.id)).filter(Asset.status == "In Stock"))).scalar()
    repair = (await db.execute(select(func.count(Asset.id)).filter(Asset.status == "Repair"))).scalar()
    retired = (await db.execute(select(func.count(Asset.id)).filter(Asset.status == "Retired"))).scalar()
    
    # Warranty expiring soon (next 30 days) or expired
    today = date.today()
    warranty_cutoff = today + timedelta(days=30)
    warranty_risk = (await db.execute(select(func.count(Asset.id)).filter(
        and_(
            Asset.warranty_expiry.isnot(None),
            Asset.warranty_expiry <= warranty_cutoff
        )
    ))).scalar()
    
    # Total value
    total_value_result = (await db.execute(select(func.sum(Asset.cost)))).scalar()
    total_value = float(total_value_result) if total_value_result else 0.0
    
    # Location breakdown
    location_results = (await db.execute(select(
        Asset.location,
        func.count(Asset.id).label('count')
    ).group_by(Asset.location))).all()
    by_location = [
        {"name": loc or "Unknown", "value": count}
        for loc, count in location_results
    ]
    
    # Type breakdown
    type_results = (await db.execute(select(
        Asset.type,
        func.count(Asset.id).label('count')
    ).group_by(Asset.type))).all()
    by_type = [
        {"name": asset_type or "Unknown", "value": count}
        for asset_type, count in type_results
    ]
    
    # Segment breakdown
    segment_results = (await db.execute(select(
        Asset.segment,
        func.count(Asset.id).label('count')
    ).group_by(Asset.segment))).all()
    by_segment = [
        {"name": seg or "Unknown", "value": count}
        for seg, count in segment_results
    ]
    
    # Status breakdown
    status_results = (await db.execute(select(
        Asset.status,
        func.count(Asset.id).label('count')
    ).group_by(Asset.status))).all()
    by_status = [
        {"name": stat or "Unknown", "value": count}
        for stat, count in status_results
    ]
    
    # Trend Data Generation (Real Counts from Created At)
    # We aggregate counts of assets created in the last 12 months
    from sqlalchemy import extract
    
    # Simple aggregation for months
    monthly_trends = []
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    for i in range(12):
        month_idx = i + 1
        # Count assets created in this month (any year for simplicity in prototype, or could filter by current year)
        count = (await db.execute(select(func.count(Asset.id)).filter(extract('month', Asset.created_at) == month_idx))).scalar()
        monthly_trends.append({
            "name": months[i],
            "repaired": 0, # Placeholder until maintenance logs are more populated
            "renewed": count
        })
    
    quarterly_trends = [
        {"name": "Q1", "repaired": 0, "renewed": sum(m["renewed"] for m in monthly_trends[0:3])},
        {"name": "Q2", "repaired": 0, "renewed": sum(m["renewed"] for m in monthly_trends[3:6])},
        {"name": "Q3", "repaired": 0, "renewed": sum(m["renewed"] for m in monthly_trends[6:9])},
        {"name": "Q4", "repaired": 0, "renewed": sum(m["renewed"] for m in monthly_trends[9:12])},
    ]
    
    return {
        "total": total,
        "total_value": total_value,
        "active": active,
        "in_stock": in_stock,
        "repair": repair,
        "retired": retired,
        "warranty_risk": warranty_risk,
        "by_location": by_location,
        "by_type": by_type,
        "by_segment": by_segment,
        "by_status": by_status,
        "trends": {
            "monthly": monthly_trends,
            "quarterly": quarterly_trends
        }
    }


async def get_asset_events(db: AsyncSession, asset_id: UUID) -> List[dict]:
    """
    Get asset event history from real Audit Logs
    """
    from ..models.models import AuditLog
    
    # Query real audit logs for this asset
    query = select(AuditLog).filter(AuditLog.entity_id == str(asset_id)).order_by(AuditLog.timestamp.desc())
    result = await db.execute(query)
    logs = result.scalars().all()
    
    events = []
    for log in logs:
        events.append({
            "date": log.timestamp.strftime("%Y-%m-%d %H:%M"),
            "event": log.action.replace("_", " ").title(),
            "description": log.details.get("message") if log.details else "Action performed",
            "user": str(log.performed_by) if log.performed_by else "System",
            "status": "completed"
        })
        
    return events
