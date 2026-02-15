"""
Manager confirmation service for multi-stage approvals.
Handles manager approval at critical workflow stages: IT approval, Budget approval, and Assignment.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models.models import AssetRequest
from ..schemas.asset_request_schema import AssetRequestResponse
from ..utils.state_machine import validate_state_transition
from typing import Optional
from uuid import UUID
from datetime import datetime


async def manager_confirm_stage(
    db: AsyncSession,
    request_id: UUID,
    stage: str,  # "IT_APPROVAL" | "BUDGET_APPROVAL" | "ASSIGNMENT"
    manager_id: UUID,
    manager_name: str,
    decision: str,  # "CONFIRM" | "REJECT"
    reason: Optional[str] = None
) -> Optional[AssetRequestResponse]:
    """
    Manager confirmation at critical workflow stages.
    
    Stages:
    - IT_APPROVAL: Manager confirms IT's technical decision (includes auto-routing)
    - BUDGET_APPROVAL: Manager confirms Finance's budget allocation
    - ASSIGNMENT: Manager confirms final asset assignment
    
    Args:
        db: Database session
        request_id: ID of the asset request
        stage: Stage being confirmed
        manager_id: ID of the manager
        manager_name: Name of the manager
        decision: CONFIRM or REJECT
        reason: Optional reason (mandatory for rejections)
        
    Returns:
        Updated AssetRequestResponse or None if request not found
    """
    from .asset_request_service import _populate_requester_info
    
    result = await db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
    db_request = result.scalars().first()
    
    if not db_request:
        return None
    
    # Determine new status based on stage and decision
    status_map = {
        "IT_APPROVAL": {
            "CONFIRM": "MANAGER_CONFIRMED_IT",
            "REJECT": "IT_REJECTED"
        },
        "BUDGET_APPROVAL": {
            "CONFIRM": "MANAGER_CONFIRMED_BUDGET",
            "REJECT": "FINANCE_REJECTED"
        },
        "ASSIGNMENT": {
            "CONFIRM": "IN_USE",
            "REJECT": "USER_REJECTED"
        }
    }
    
    new_status = status_map[stage][decision]
    
    # Mandatory rejection reason
    if decision == "REJECT" and not reason:
        raise ValueError(f"Rejection reason is mandatory for manager override at {stage}")
    
    # Validate transition
    is_valid, error_msg = validate_state_transition(
        current_status=db_request.status,
        new_status=new_status,
        user_role="MANAGER",
        asset_ownership_type=db_request.asset_ownership_type
    )
    
    if not is_valid:
        raise ValueError(error_msg)
    
    # AUTOMATED ROUTING: If confirming IT approval, perform inventory check
    auto_routed = False
    reserved_asset_id = None
    
    if stage == "IT_APPROVAL" and decision == "CONFIRM":
        if db_request.asset_ownership_type == "COMPANY_OWNED":
            from .inventory_helper import check_inventory_availability, reserve_inventory_asset
            
            # Check if matching asset is in stock
            available_asset_id = await check_inventory_availability(
                db=db,
                asset_type=db_request.asset_type,
                asset_model=db_request.asset_model
            )
            
            if available_asset_id:
                # Asset available - reserve it and route to USER_ACCEPTANCE_PENDING
                success = await reserve_inventory_asset(
                    db=db,
                    asset_id=available_asset_id,
                    request_id=request_id
                )
                
                if success:
                    new_status = "USER_ACCEPTANCE_PENDING"
                    auto_routed = True
                    reserved_asset_id = available_asset_id
                    db_request.asset_id = available_asset_id
                    print(f"[AUTO-ROUTE] Asset {available_asset_id} reserved from inventory")
            else:
                # No asset available - route to procurement
                new_status = "PROCUREMENT_REQUESTED"
                auto_routed = True
                print(f"[AUTO-ROUTE] No inventory available, routing to PROCUREMENT_REQUESTED")
        
        elif db_request.asset_ownership_type == "BYOD":
            # BYOD path - route to compliance check
            new_status = "BYOD_COMPLIANCE_CHECK"
            auto_routed = True
            print(f"[AUTO-ROUTE] BYOD request routing to compliance check")
    
    # Update status
    db_request.status = new_status
    db_request.updated_at = datetime.now()
    
    # FINALIZATION LOGIC: If confirming ASSIGNMENT, update the Asset record itself
    if stage == "ASSIGNMENT" and decision == "CONFIRM" and db_request.asset_id:
        from .asset_service import finalize_asset_assignment
        await finalize_asset_assignment(
            db=db,
            asset_id=db_request.asset_id,
            requester_id=db_request.requester_id,
            manager_id=manager_id,
            manager_name=manager_name
        )

    # Record in approvals log
    if db_request.manager_approvals is None:
        db_request.manager_approvals = []
    
    approval_entry = {
        "reviewer_id": str(manager_id),
        "reviewer_name": manager_name,
        "decision": decision,
        "reason": reason,
        "timestamp": datetime.now().isoformat(),
        "type": f"MANAGER_CONFIRMATION_{stage}",
        "stage": stage
    }
    
    if auto_routed:
        approval_entry["auto_routed"] = True
        approval_entry["final_status"] = new_status
        if reserved_asset_id:
            approval_entry["reserved_asset_id"] = str(reserved_asset_id)
    
    db_request.manager_approvals.append(approval_entry)
    
    await db.commit()
    await db.refresh(db_request)
    
    return await _populate_requester_info(db, db_request, user_role="MANAGER")
