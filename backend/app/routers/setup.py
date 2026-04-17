from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.database import get_db
from ..utils import auth_utils
from ..schemas.company_schema import CompanyCreate, CompanyResponse
from ..services import company_service
from .auth import check_ADMIN

router = APIRouter(
    prefix="/setup",
    tags=["setup"],
)


class SetupStatusResponse(BaseModel):
    setup_completed: bool
    company: Optional[CompanyResponse] = None


class LocationInput(BaseModel):
    name: str
    address: Optional[str] = None
    timezone: str = "UTC"


class SetupCompletePayload(BaseModel):
    company: CompanyCreate
    locations: List[LocationInput] = []


@router.get("/status", response_model=SetupStatusResponse)
async def get_setup_status(
    db: AsyncSession = Depends(get_db),
):
    """
    Return setup completion status. Any authenticated user can call this.
    """
    result = await company_service.get_setup_status(db)
    return SetupStatusResponse(
        setup_completed=result["setup_completed"],
        company=CompanyResponse.model_validate(result["company"]) if result["company"] else None,
    )


@router.post("/complete")
async def complete_setup(
    payload: SetupCompletePayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_ADMIN),
):
    """
    Complete the setup wizard. ADMIN only.
    Creates/updates company and locations, marks setup as complete.
    """
    locations_data = [loc.model_dump() for loc in payload.locations]
    company, locations = await company_service.complete_setup(
        db, payload.company, locations_data
    )
    return {
        "company": CompanyResponse.model_validate(company),
        "locations_created": len(locations),
    }


@router.get("/company", response_model=CompanyResponse)
async def get_company(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(check_ADMIN),
):
    """
    Get current company. ADMIN only.
    """
    company = await company_service.get_company(db)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not configured yet",
        )
    return CompanyResponse.model_validate(company)


@router.get("/integration-audit")
async def get_integration_audit(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth_utils.get_current_user),
):
    """
    Get real-time integration metrics for the platform audit dashboard.
    """
    from ..services import integration_service
    return await integration_service.get_integration_audit(db)
@router.get("/metadata")
async def get_platform_metadata():
    """
    Get platform-wide metadata like global workflows, terminology, and constants.
    """
    return {
        "workflows": [
            {
                "id": "asset-request",
                "title": "Asset Request & Procurement",
                "icon": "Package",
                "color": "blue",
                "steps": [
                    {"step": 1, "role": "Employee", "action": "Submits request with justification", "state": "SUBMITTED"},
                    {"step": 2, "role": "Department Manager (SM / ASM / Dept Head)", "action": "Reviews and approves or rejects", "state": "MANAGER_APPROVED"},
                    {"step": 3, "role": "IT Management (Head-IT / Infra Head)", "action": "Verifies technical specs and approves", "state": "IT_APPROVED"},
                    {"step": 4, "role": "Department Manager (Oversight)", "action": "Confirms IT decision (Oversight Phase)", "state": "MANAGER_CONFIRMED_IT"},
                    {"step": 5, "role": "SCM (Supply Chain Management)", "action": "Creates Purchase Order (PO)", "state": "PROCUREMENT_REQUIRED / PO_CREATED"},
                    {"step": 6, "role": "F&A (Finance & Accounts)", "action": "Validates and approves budget for PO", "state": "PO_VALIDATED → FINANCE_APPROVED"},
                    {"step": 7, "role": "SCM (Supply Chain Management)", "action": "Confirms delivery from vendor", "state": "DELIVERY_CONFIRMED"},
                    {"step": 8, "role": "Inventory", "action": "Performs Quality Control (QC) and allocates asset", "state": "QC_PENDING → ALLOCATED"},
                    {"step": 9, "role": "Employee", "action": "Verifies asset condition; Accepts or Reports Issue", "state": "USER_ACCEPTANCE_PENDING"},
                    {"step": 10, "role": "Department Manager (Final Oversight)", "action": "Confirms final assignment (Oversight Phase)", "state": "MANAGER_CONFIRMED_ASSIGNMENT"},
                    {"step": 11, "role": "System", "action": "Asset marked In Use; workflow closed", "state": "IN_USE → CLOSED"},
                ],
                "note": "BYOD requests branch to compliance path after IT approval. Verification rejections or returns automatically trigger high/medium priority support tickets.",
            },
            {
                "id": "byod-compliance",
                "title": "BYOD Compliance Path (after IT Approval)",
                "icon": "Smartphone",
                "color": "sky",
                "steps": [
                    {"step": 1, "role": "Employee", "action": "Submits BYOD request; follows approval path through Manager and IT", "state": "SUBMITTED → MANAGER_CONFIRMED_IT"},
                    {"step": 2, "role": "System", "action": "Routes to BYOD compliance path (no procurement)", "state": "BYOD path"},
                    {"step": 3, "role": "IT", "action": "Runs compliance check via Policy Engine / MDM Enrollment", "state": "BYOD_COMPLIANCE_CHECK"},
                    {"step": "4a", "role": "System", "action": "If compliant: device registered; user accepts terms", "state": "User registration → IN_USE"},
                    {"step": "4b", "role": "System", "action": "If non-compliant: request rejected", "state": "BYOD_REJECTED → CLOSED"},
                    {"step": 5, "role": "System", "action": "Device in use or workflow closed", "state": "IN_USE → CLOSED"},
                ],
                "note": "BYOD devices are automatically offboarded (data wipe/unenroll) during the Employee Exit workflow.",
            },
            {
                "id": "ticketing",
                "title": "IT Support (Ticketing)",
                "icon": "Ticket",
                "color": "rose",
                "steps": [
                    {"step": 1, "role": "User", "action": "Creates ticket (Manual or Auto-generated from Return/Verification Failure)", "state": "Open"},
                    {"step": 2, "role": "IT Technician", "action": "Picks up ticket; completes mandatory diagnostic checklist", "state": "In Progress"},
                    {"step": 3, "role": "IT Technician", "action": "Performs remediation (fix, replacement, or escalation)", "state": "Pending"},
                    {"step": 4, "role": "IT Technician", "action": "Submits resolution notes and closes ticket", "state": "Closed"},
                ],
                "note": "Asset returns trigger Medium-priority tickets. Verification failures trigger High-priority tickets with automated diagnostic checklists.",
            },
            {
                "id": "exit",
                "title": "Employee Exit (Offboarding)",
                "icon": "UserMinus",
                "color": "amber",
                "steps": [
                    {"step": 1, "role": "Admin", "action": "Initiates exit workflow for departing employee", "state": "Initiated"},
                    {"step": 2, "role": "System", "action": "Freezes asset and BYOD snapshot; locks changes", "state": "Snapshot"},
                    {"step": 3, "role": "Inventory Manager", "action": "Reclaims physical company-owned assets", "state": "Reclaim"},
                    {"step": 4, "role": "IT", "action": "Wipes data and unenrolls BYOD devices", "state": "Wipe"},
                    {"step": 5, "role": "Admin", "action": "Finalizes exit and disables account", "state": "Closed"},
                ],
                "note": "The system automatically snapshots the entire asset state to prevent data loss or unauthorized device retention.",
            },
        ],
        "agent_metadata": {
            "agent-local": {
                "purpose": "Provides baseline visibility into the physical host, including hardware specs and running processes.",
                "discoveryMethods": ["WMI (Windows)", "systemctl (Linux)", "Registry Scan"],
                "dataSources": ["Local WMI Namespace", "Shell Executions", "OS Config Files"],
                "capabilities": ["Process Monitoring", "Hardware Inventory", "Registry Scan", "Security Baseline"],
                "schedule": "Real-time / On-demand",
                "output": "Direct SQL Push via Collection API"
            },
            "agent-cloud": {
                "purpose": "Bridges the gap between on-premise inventory and dynamic cloud infrastructure.",
                "discoveryMethods": ["AWS SDK", "Azure Resource Manager", "GCP Compute API"],
                "dataSources": ["AWS Metadata Service", "Azure Management API", "Google Cloud Resource Manager"],
                "capabilities": ["AWS EC2/S3/RDS Discovery", "Azure VM Inspector", "GCP Compute Engine Sync"],
                "schedule": "Hourly sync (Configurable)",
                "output": "JSON Payload through Cloud Collector"
            },
            "agent-snmp": {
                "purpose": "Discovers unmanaged network assets like routers, switches, and printers using standard protocols.",
                "discoveryMethods": ["SNMP v2c Walk", "SNMP v3 USM", "MAC Address Resolution"],
                "dataSources": ["Standard MIB-II", "Vendor-Specific OIDs", "Network ARP Tables"],
                "capabilities": ["Network Topology Mapping", "SNMP v1/v2c/v3 Support", "UPS & Printer Monitoring"],
                "schedule": "Daily full scan / On-demand",
                "output": "Normalized MIB Data"
            },
            "agent-server": {
                "purpose": "Performs deep-dive inspection of server workloads without requiring a permanent local agent.",
                "discoveryMethods": ["SSH Command Execution", "WinRM Remote Shell", "PowerShell Remoting"],
                "dataSources": ["Remote Terminal Output", "Remote Registry (WinRM)", "Journalctl Logs (SSH)"],
                "capabilities": ["Deep SSH Inspection", "Disk Utilization Metrics", "Service Dependency Scan"],
                "schedule": "On-demand execution",
                "output": "Detailed XML Report"
            },
            "agent-saas": {
                "purpose": "Audits external software subscriptions to prevent 'Shadow IT' and manage license costs.",
                "discoveryMethods": ["OAuth2 API Scopes", "SAML Linkage", "Direct Vendor API"],
                "dataSources": ["SaaS Provider APIs", "Identity Provider Logs", "Billing Export Files"],
                "capabilities": ["License Audit & Compliance", "SaaS User Access Review", "Cost Optimization"],
                "schedule": "Weekly full audit",
                "output": "SaaS Bridge API"
            },
            "agent-ad": {
                "purpose": "Synchronizes user identities and group memberships to align asset ownership with HR records.",
                "discoveryMethods": ["LDAP/S Query", "Active Directory Domain Services", "Graph API"],
                "dataSources": ["Domain Controller Database", "Azure AD / Entra ID API", "Delta Sync Logs"],
                "capabilities": ["Active Directory User Sync", "LDAP Group Mapping", "Entra ID Integration"],
                "schedule": "Continuous Delta Sync",
                "output": "LDAP/Graph Sync"
            }
        }
    }
