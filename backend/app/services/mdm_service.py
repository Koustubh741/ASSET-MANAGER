"""
MDM (Mobile Device Management) Service
Simulates device enrollment and security policy validation for BYOD compliance.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models.models import ByodDevice, AssetRequest
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
    Simulate MDM enrollment for a BYOD device.
    
    In production, this would integrate with:
    - Microsoft Intune
    - Google Endpoint Management
    - Jamf Pro (for Apple devices)
    
    Args:
        db: Database session
        device_id: ID of the BYOD device
        security_policies: Optional security policies to apply
        
    Returns:
        Enrollment result with compliance status
    """
    result = await db.execute(select(ByodDevice).filter(ByodDevice.id == device_id))
    device = result.scalars().first()
    
    if not device:
        return {
            "success": False,
            "error": "Device not found"
        }
    
    # Default security baseline
    default_policies = {
        "encryption_required": True,
        "password_complexity": "HIGH",
        "biometric_auth": True,
        "remote_wipe_enabled": True,
        "app_whitelist_enforced": True,
        "os_version_minimum": "12.0",
        "auto_update_enabled": True
    }
    
    policies = security_policies or default_policies
    
    # Simulate compliance check
    compliance_checks = {
        "encryption": True,  # Simulated - would check actual device
        "password_policy": True,
        "os_version": True,
        "security_patch_level": True,
        "unauthorized_apps": False
    }
    
    all_compliant = all(compliance_checks.values())
    
    # Update device record
    device.compliance_status = "COMPLIANT" if all_compliant else "NON_COMPLIANT"
    # device.mdm_enrolled = True (Missing column)
    # device.mdm_enrollment_date = datetime.now() (Missing column)
    # device.security_policies = policies (Missing column)
    # device.compliance_checks = compliance_checks (Missing column)
    
    await db.commit()
    await db.refresh(device)
    
    return {
        "success": True,
        "device_id": str(device.id),
        "mdm_enrolled": True,
        "compliance_status": device.compliance_status,
        "policies_applied": policies,
        "compliance_checks": compliance_checks,
        "enrollment_date": datetime.now().isoformat(), # device.mdm_enrollment_date.isoformat(), # device.mdm_enrollment_date.isoformat()
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
    
    if not device:
        return {
            "success": False,
            "error": "BYOD device not registered"
        }
    
    # Enroll in MDM if not already enrolled
    # if not device.mdm_enrolled: (Column missing in DB)
    #     enrollment_result = await simulate_mdm_enrollment(db, device.id)
    #     
    #     if not enrollment_result["success"]:
    #         return enrollment_result
    # else:
    #     # Re-check compliance
    #     enrollment_result = await simulate_mdm_enrollment(db, device.id)
    
    # PATCH: Always simulate enrollment check since we can't store state
    enrollment_result = await simulate_mdm_enrollment(db, device.id)
    
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
            "compliance_checks": enrollment_result["compliance_checks"]
        })
    
    await db.commit()
    
    return {
        "success": True,
        "request_id": str(request_id),
        "final_status": request.status,
        "mdm_enrollment": enrollment_result
    }
