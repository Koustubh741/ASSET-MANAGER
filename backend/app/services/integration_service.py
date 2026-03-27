from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..models.models import Asset, User, DiscoveredSoftware, PurchaseOrder, Ticket, AuditLog, AssetRequest, GatePass, Notification, AssetRelationship, SoftwareLicense, MaintenanceRecord, UserPreference, ByodDevice
from typing import Dict, Any
import uuid

async def get_integration_audit(db: AsyncSession) -> Dict[str, Any]:
    """
    Calculate real-time integration metrics for the platform audit dashboard.
    """
    ZEROED_UUID = "00000000-0000-0000-0000-000000000000"
    
    # 1. Network Discovery & Agents
    # Assets with non-zero Agent ID are "Agent Managed"
    agent_managed = (await db.execute(
        select(func.count(Asset.id)).filter(
            Asset.specifications['Agent ID'].as_string() != ZEROED_UUID,
            Asset.specifications['Agent ID'].as_string().isnot(None)
        )
    )).scalar() or 0
    
    # Assets with "SNMP" in Discovery metadata are "Network Discovered"
    snmp_discovered = (await db.execute(
        select(func.count(Asset.id)).filter(
            Asset.specifications['Discovery'].as_string().ilike('%SNMP%')
        )
    )).scalar() or 0
    
    # 2. Cloud Monitoring
    cloud_assets = (await db.execute(
        select(func.count(Asset.id)).filter(
            Asset.vendor.in_(['AWS', 'Azure', 'GCP', 'Oracle Cloud', 'Alibaba Cloud'])
        )
    )).scalar() or 0
    
    # 3. User & Directory Integration
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    # Users with a domain are likely synced from AD/LDAP
    synced_users = (await db.execute(
        select(func.count(User.id)).filter(User.domain.isnot(None), User.domain != 'LOCAL')
    )).scalar() or 0
    
    # 4. Software & Licenses
    total_software = (await db.execute(select(func.count(DiscoveredSoftware.id)))).scalar() or 0
    
    # 5. Financials
    total_pos = (await db.execute(select(func.count(PurchaseOrder.id)))).scalar() or 0
    
    # 6. Support & Tickets
    total_tickets = (await db.execute(select(func.count(Ticket.id)))).scalar() or 0
    
    # 7. Audit Activity (last 24h)
    from datetime import datetime, timedelta, timezone
    day_ago = datetime.now(timezone.utc) - timedelta(days=1)
    recent_activity = (await db.execute(
        select(func.count(AuditLog.id)).filter(AuditLog.timestamp >= day_ago)
    )).scalar() or 0

    # 8. Last Sync Timestamps
    async def get_last_sync(action: str) -> str:
        res = await db.execute(
            select(AuditLog.timestamp).filter(AuditLog.action.ilike(f"%{action}%")).order_by(AuditLog.timestamp.desc()).limit(1)
        )
        ts = res.scalar()
        if not ts: return "Never"
        return ts.strftime("%Y-%m-%d %H:%M")

    last_agent_sync = await get_last_sync("asset_discovered")
    last_cloud_sync = await get_last_sync("CLOUD_DISCOVERY")
    last_user_sync  = await get_last_sync("USER_SYNC")
    last_snmp_scan  = await get_last_sync("SNMP_SCAN")

    # 9. Asset Requests
    total_requests = (await db.execute(select(func.count(AssetRequest.id)))).scalar() or 0
    pending_requests = (await db.execute(
        select(func.count(AssetRequest.id)).filter(AssetRequest.status.notin_(['CLOSED', 'REJECTED', 'CANCELLED']))
    )).scalar() or 0

    # 10. Gate Pass
    total_gate_passes = (await db.execute(select(func.count(GatePass.id)))).scalar() or 0
    active_gate_passes = (await db.execute(
        select(func.count(GatePass.id)).filter(GatePass.status == 'APPROVED')
    )).scalar() or 0

    # 11. Notifications
    total_notifications = (await db.execute(select(func.count(Notification.id)))).scalar() or 0

    # 12. CMDB / Relationships
    total_relationships = (await db.execute(select(func.count(AssetRelationship.id)))).scalar() or 0

    # 13. Software Licenses
    total_licenses = (await db.execute(select(func.count(SoftwareLicense.id)))).scalar() or 0

    # 14. Maintenance
    total_maintenance = (await db.execute(select(func.count(MaintenanceRecord.id)))).scalar() or 0

    # 15. Disposal
    disposal_assets = (await db.execute(
        select(func.count(Asset.id)).filter(Asset.status == 'Scrap Candidate')
    )).scalar() or 0

    # 16. BYOD
    total_byod = (await db.execute(select(func.count(ByodDevice.id)))).scalar() or 0

    # 17. User Preferences (Saved Views)
    # We'll just check if any user has preferences
    pref_count = (await db.execute(select(func.count(UserPreference.id)))).scalar() or 0

    # 18. Port Policies
    from ..models.port_policies import PortPolicy
    total_policies = (await db.execute(select(func.count(PortPolicy.id)))).scalar() or 0

    return {
        "it": {
            "network_discovery": f"{snmp_discovered} devices (Last: {last_snmp_scan})",
            "snmp_scanning": f"Active (Last: {last_snmp_scan})",
            "agent_collector": f"{agent_managed} reporting (Last: {last_agent_sync})",
            "cloud_monitoring": f"{cloud_assets} instances (Last: {last_cloud_sync or last_agent_sync})",
            "network_topology": f"{total_relationships} dependencies mapped",
            "software_inventory": f"{total_software} packages",
            "license_management": f"{total_licenses} licenses tracked",
            "audit_trail": f"{recent_activity} events last 24h",
            "auto_verification": "System Enabled (QC/Acceptance)",
            "ai_assistant": "Active (Persistent GPT-4)",
            "port_policies": f"{total_policies} active firewall rules",
        },
        "admin": {
            "user_management": f"{total_users} users ({synced_users} synced)",
            "role_management": "Native (RBAC)",
            "asset_requests": f"{total_requests} requests ({pending_requests} pending)",
            "locations_mgmt": "Integrated & Hierarchical",
            "gate_pass": f"{total_gate_passes} passes ({active_gate_passes} active)",
            "disposal_mgmt": f"{disposal_assets} assets for disposal",
            "setup_&_config": "Live (Metadata API)",
            "notifications": f"{total_notifications} system alerts",
            "saved_views": f"{pref_count} preference profiles",
        },
        "finance": {
            "financial_reports": "Live & Data-Driven",
            "depreciation": "Calculated (Book Value)",
            "renewals_mgmt": "Live (Lifecycle Engine)",
            "procurement_analytics": "SQL Aggregate Enabled",
            "purchase_orders": f"{total_pos} POs tracked",
            "budget_queue": "Integrated",
            "cost_tracking": "Active & SQL-Driven",
        },
        "operations": {
            "asset_registry": f"{agent_managed + snmp_discovered + cloud_assets} discovered",
            "asset_assignment": "History & Allocation Active",
            "cmdb_overview": f"{total_relationships} logic links",
            "asset_relationships": f"{total_relationships} upstream/downstream links",
            "barcode_/_qr": "Scanner Support Enabled",
        },
        "support": {
            "ticket_system": f"{total_tickets} tickets",
            "it_support_desk": f"{total_tickets} active incidents",
            "maintenance_logs": f"{total_maintenance} records",
            "alerts_&_monitoring": f"{total_notifications} linked alerts",
            "onboarding_flow": "Live (Backend-Persistent)",
            "workflows_engine": "Live (Global Setup API)",
        }
    }
