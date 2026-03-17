"""
MDM (Mobile Device Management) Service
Device enrollment and security policy validation for BYOD compliance.
Uses policy engine and pluggable MDM adapters.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models.models import ByodDevice, AssetRequest
from .policy_engine import _load_policies
from .mdm import get_mdm_adapter
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime
import uuid


async def simulate_mdm_enrollment(
    db: AsyncSession,
    device_id: UUID,
    security_policies: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Legacy: Enroll/check BYOD device. Now delegates to MDM adapter.
    Kept for backward compatibility with mdm-enroll endpoint.
    """
    result = await db.execute(select(ByodDevice).filter(ByodDevice.id == device_id))
    device = result.scalars().first()
    if not device:
        return {"success": False, "error": "Device not found"}
    policies = _load_policies().get("default_policies", {}) or {
        "encryption_required": True, "password_complexity": "HIGH",
        "remote_wipe_enabled": True, "os_version_minimum": "12.0",
    }
    policies = security_policies or policies
    adapter = get_mdm_adapter()
    enrollment_result = await adapter.enroll_and_check(
        device_id=device.id,
        device_model=device.device_model,
        os_version=device.os_version,
        security_policies=policies,
    )
    device.compliance_status = enrollment_result.get("compliance_status", "COMPLIANT")
    device.mdm_enrolled = True
    device.mdm_enrollment_date = datetime.now()
    device.last_compliance_check = datetime.now()
    device.compliance_checks = enrollment_result.get("compliance_checks", {})
    device.security_policies = policies
    await db.commit()
    await db.refresh(device)
    return {
        "success": True,
        "device_id": str(device.id),
        "mdm_enrolled": True,
        "compliance_status": device.compliance_status,
        "policies_applied": policies,
        "compliance_checks": enrollment_result.get("compliance_checks", {}),
        "enrollment_date": datetime.now().isoformat(),
    }


async def validate_byod_compliance(
    db: AsyncSession,
    request_id: UUID,
    reviewer_id: UUID
) -> Dict[str, Any]:
    """
    Validate BYOD compliance for an asset request.
    
    This function:
    1. Retrieves the BYOD device associated with the request
    2. Simulates MDM enrollment if not already enrolled
    3. Returns compliance status
    
    Args:
        db: Database session
        request_id: ID of the asset request
        reviewer_id: ID of the IT reviewer
        
    Returns:
        Compliance validation result
    """
    # Get the request
    req_result = await db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
    request = req_result.scalars().first()
    
    if not request:
        return {
            "success": False,
            "error": "Request not found"
        }
    
    if request.asset_ownership_type != "BYOD":
        return {
            "success": False,
            "error": "Request is not for a BYOD device"
        }
    
    # Get associated BYOD device
    byod_result = await db.execute(
        select(ByodDevice).filter(ByodDevice.request_id == request_id)
    )
    device = byod_result.scalars().first()
    
    # Root fix: If no device exists but request has device details, auto-register
    if not device:
        device_model = request.asset_model or "Unknown Model"
        os_version = request.os_version or "Unknown OS"
        serial_number = request.serial_number or f"BYOD-{request.id}"
        device = ByodDevice(
            id=uuid.uuid4(),
            request_id=request.id,
            owner_id=request.requester_id,
            device_model=device_model,
            os_version=os_version,
            serial_number=serial_number,
            compliance_status="COMPLIANT",
        )
        db.add(device)
        await db.flush()
    
    # Run compliance check via MDM adapter (policy engine)
    policies = _load_policies().get("default_policies", {}) or {}
    adapter = get_mdm_adapter()
    enrollment_result = await adapter.enroll_and_check(
        device_id=device.id,
        device_model=device.device_model,
        os_version=device.os_version,
        security_policies=policies,
    )
    # Update device with compliance result
    compliance_status = enrollment_result.get("compliance_status", "COMPLIANT")
    device.compliance_status = compliance_status
    device.mdm_enrolled = True
    device.mdm_enrollment_date = datetime.now()
    device.last_compliance_check = datetime.now()
    device.compliance_checks = enrollment_result.get("compliance_checks", {})
    device.security_policies = policies
    device.mdm_provider = "SIMULATED"
    
    # Update request status based on compliance
    if enrollment_result["compliance_status"] == "COMPLIANT":
        request.status = "IN_USE"
        request.updated_at = datetime.now()
        
        if request.manager_approvals is None:
            request.manager_approvals = []
        
        request.manager_approvals.append({
            "reviewer_id": str(reviewer_id),
            "reviewer_name": "IT_MANAGEMENT",
            "decision": "BYOD_APPROVED",
            "timestamp": datetime.now().isoformat(),
            "type": "BYOD_COMPLIANCE_CHECK",
            "mdm_enrolled": True,
            "compliance_status": "COMPLIANT"
        })
    else:
        request.status = "BYOD_REJECTED"
        request.updated_at = datetime.now()
        
        if request.manager_approvals is None:
            request.manager_approvals = []
        
        request.manager_approvals.append({
            "reviewer_id": str(reviewer_id),
            "reviewer_name": "IT_MANAGEMENT",
            "decision": "BYOD_REJECTED",
            "reason": "Device failed compliance checks",
            "timestamp": datetime.now().isoformat(),
            "type": "BYOD_COMPLIANCE_CHECK",
            "compliance_checks": enrollment_result.get("compliance_checks", {}),
            "remediation_steps": enrollment_result.get("remediation_steps", []),
        })
    
    await db.commit()
    
    return {
        "success": True,
        "request_id": str(request_id),
        "final_status": request.status,
        "mdm_enrollment": enrollment_result
    }
