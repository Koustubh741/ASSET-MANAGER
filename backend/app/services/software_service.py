from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from ..models.models import SoftwareLicense, DiscoveredSoftware, AssetRequest, Ticket, User, ProcurementLog
from ..schemas.software_schema import SoftwareLicenseCreate, SoftwareLicenseUpdate
from uuid import UUID
import uuid
from datetime import datetime, timezone

async def get_all_licenses(db: AsyncSession):
    with open("software_debug.log", "a") as f:
        f.write(f"--- Calling get_all_licenses ---\n")
    try:
        result = await db.execute(select(SoftwareLicense))
        licenses = result.scalars().all()
        with open("software_debug.log", "a") as f:
            f.write(f"Fetched {len(licenses)} licenses\n")
        return licenses
    except Exception as e:
        with open("software_debug.log", "a") as f:
            f.write(f"Error in get_all_licenses: {e}\n")
        raise e

async def get_license(db: AsyncSession, license_id: UUID):
    result = await db.execute(select(SoftwareLicense).filter(SoftwareLicense.id == license_id))
    return result.scalars().first()

async def create_license(db: AsyncSession, license: SoftwareLicenseCreate):
    db_license = SoftwareLicense(
        id=uuid.uuid4(),
        **license.model_dump()
    )
    db.add(db_license)
    await db.commit()
    await db.refresh(db_license)
    return db_license

async def update_license(db: AsyncSession, license_id: UUID, license_update: SoftwareLicenseUpdate):
    db_license = await get_license(db, license_id)
    if not db_license:
        return None
    
    update_data = license_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_license, key, value)
    
    await db.commit()
    await db.refresh(db_license)
    return db_license

async def get_discovered_software_summary(db: AsyncSession):
    """
    Returns aggregated counts of discovered software.
    """
    # Group by name, version, and vendor and count assets
    query = select(
        DiscoveredSoftware.name,
        DiscoveredSoftware.version,
        DiscoveredSoftware.vendor,
        func.count(DiscoveredSoftware.id).label("install_count"),
        func.min(DiscoveredSoftware.first_seen).label("first_seen"),
        func.max(DiscoveredSoftware.last_seen).label("last_seen")
    ).group_by(
        DiscoveredSoftware.name,
        DiscoveredSoftware.version,
        DiscoveredSoftware.vendor
    ).order_by(func.count(DiscoveredSoftware.id).desc())
    
    result = await db.execute(query)
    # Convert to list of dicts for schema validation
    rows = result.all()
    return [
        {
            "name": r.name,
            "version": r.version,
            "vendor": r.vendor,
            "install_count": r.install_count,
            "first_seen": r.first_seen,
            "last_seen": r.last_seen
        } for r in rows
    ]

async def upsert_saas_license(db: AsyncSession, license_data: dict):
    """
    Upserts a SaaS license based on name and vendor.
    """
    name = license_data.get("name")
    vendor = license_data.get("vendor")
    
    # 1. Check for existing license
    query = select(SoftwareLicense).filter(
        SoftwareLicense.name == name,
        SoftwareLicense.vendor == vendor
    )
    result = await db.execute(query)
    db_license = result.scalars().first()
    
    if db_license:
        # Update
        for key, value in license_data.items():
            if hasattr(db_license, key):
                setattr(db_license, key, value)
        db_license.updated_at = func.now()
    else:
        # Create
        # Remove is_discovered from license_data if it exists to avoid multiple values
        license_data.pop("is_discovered", None)
        db_license = SoftwareLicense(
            id=uuid.uuid4(),
            is_discovered=True,
            **license_data
        )
        db.add(db_license)
    
    await db.commit()
    await db.refresh(db_license)
    return db_license

async def get_compliance_report(db: AsyncSession):
    """
    Aggregates discovery data and compares against managed licenses.
    """
    # 1. Get all managed licenses
    licenses = await get_all_licenses(db)
    
    # 2. Get discovery summary
    discovery_summary = await get_discovered_software_summary(db)
    discovery_map = {item["name"].lower(): item["install_count"] for item in discovery_summary}
    
    report = []
    for lic in licenses:
        # Match by name (naive name match + matched_names list)
        install_count = discovery_map.get(lic.name.lower(), 0)
        
        # Also check against explicitly matched names
        if lic.matched_names:
            for matched_name in lic.matched_names:
                install_count += discovery_map.get(matched_name.lower(), 0)
        
        utilization = (install_count / lic.seat_count * 100) if lic.seat_count > 0 else 0
        
        status = "SAFE"
        if install_count > lic.seat_count:
            status = "RISK"
        elif utilization > 90:
            status = "WARNING"
            
        # Financial impact (estimated)
        # If RISK: (installs - seats) * cost_per_seat
        # If EXPLOITABLE SAVINGS (Over-licensed): (seats - installs) * cost_per_seat
        cost_per_seat = lic.cost / lic.seat_count if lic.seat_count > 0 else 0
        impact = 0
        if status == "RISK":
            impact = (install_count - lic.seat_count) * cost_per_seat
        elif install_count < lic.seat_count:
            # Potential savings
            impact = (install_count - lic.seat_count) * cost_per_seat # Negative indicates savings
            
        report.append({
            "license_id": lic.id,
            "software_name": lic.name,
            "vendor": lic.vendor,
            "seat_count": lic.seat_count,
            "install_count": install_count,
            "utilization_rate": utilization,
            "compliance_status": status,
            "financial_impact": impact
        })
        
    return report



async def match_discovered_to_license(db: AsyncSession, discovered_name: str, license_id: UUID):
    """
    Manually link a discovered application name to a managed license.
    """
    db_license = await get_license(db, license_id)
    if not db_license:
        return None
    
    if db_license.matched_names is None:
        db_license.matched_names = []
    
    # Add if not already present
    if discovered_name not in db_license.matched_names:
        # Use a list copy to trigger SQLAlchemy change tracking for JSONB
        current_matches = list(db_license.matched_names)
        current_matches.append(discovered_name)
        db_license.matched_names = current_matches
        
        await db.commit()
        await db.refresh(db_license)
    
    return db_license

async def request_license_seats(db: AsyncSession, license_id: UUID, requester_id: UUID):
    """
    Creates an AssetRequest for software seats based on a compliance risk.
    """
    db_license = await get_license(db, license_id)
    if not db_license:
        return None
        
    # 1. Calculate how many seats are needed (naive: installs - seats + buffer)
    discovery_summary = await get_discovered_software_summary(db)
    discovery_map = {item["name"].lower(): item["install_count"] for item in discovery_summary}
    
    install_count = discovery_map.get(db_license.name.lower(), 0)
    if db_license.matched_names:
        for matched_name in db_license.matched_names:
            install_count += discovery_map.get(matched_name.lower(), 0)
            
    needed = max(int(install_count - db_license.seat_count), 1)
    
    # 2. Create the AssetRequest
    asset_request = AssetRequest(
        id=uuid.uuid4(),
        requester_id=requester_id,
        asset_name=db_license.name,
        asset_type="SOFTWARE",
        asset_ownership_type="COMPANY_OWNED",
        asset_vendor=db_license.vendor,
        cost_estimate=(db_license.cost / db_license.seat_count * needed) if db_license.seat_count > 0 else 0,
        justification=f"Compliance Risk: {install_count} installs detected for {db_license.seat_count} licensed seats.",
        business_justification=f"Automated seat request to resolve software compliance gap for {db_license.name}.",
        status="SUBMITTED",
        specifications={"requested_seats": needed, "license_id": str(license_id)}
    )
    db.add(asset_request)
    
    # Audit Log
    log = ProcurementLog(
        id=uuid.uuid4(),
        reference_id=asset_request.id,
        action="SOFTWARE_SEATS_REQUESTED",
        performed_by=str(requester_id),
        role="ASSET_MANAGER",
        metadata_={"license_id": str(license_id), "seats_needed": needed}
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(asset_request)
    return asset_request

async def optimize_license_usage(db: AsyncSession, license_id: UUID, requester_id: UUID):
    """
    Creates a support ticket to optimize/reclaim underutilized software licenses.
    """
    db_license = await get_license(db, license_id)
    if not db_license:
        return None
        
    # 1. Calculate utilization
    discovery_summary = await get_discovered_software_summary(db)
    discovery_map = {item["name"].lower(): item["install_count"] for item in discovery_summary}
    
    install_count = discovery_map.get(db_license.name.lower(), 0)
    if db_license.matched_names:
        for matched_name in db_license.matched_names:
            install_count += discovery_map.get(matched_name.lower(), 0)
            
    utilization = (install_count / db_license.seat_count * 100) if db_license.seat_count > 0 else 0
    savings = (db_license.seat_count - install_count) * (db_license.cost / db_license.seat_count) if db_license.seat_count > 0 else 0

    # 2. Find an IT_MANAGEMENT user to auto-assign to
    it_user_result = await db.execute(
        select(User).filter(User.role == "IT_MANAGEMENT").limit(1)
    )
    it_user = it_user_result.scalars().first()

    # 3. Create the Support Ticket
    ticket = Ticket(
        id=uuid.uuid4(),
        subject=f"RECLAIM: Underutilized Software - {db_license.name}",
        description=(
            f"The software '{db_license.name}' by {db_license.vendor} is currently underutilized.\n\n"
            f"Current Installs: {install_count}\n"
            f"Licensed Seats: {db_license.seat_count}\n"
            f"Utilization: {round(utilization, 1)}%\n"
            f"Potential Annual Savings: ${round(savings, 2)}\n\n"
            f"Action Required: Identify assets where '{db_license.name}' is installed but not used, and reclaim {int(db_license.seat_count - install_count)} seats."
        ),
        status="Open",
        priority="Medium",
        category="Software",
        requestor_id=requester_id,
        assigned_to_id=it_user.id if it_user else None,
        timeline=[{
            "action": "AUTO_ASSIGNED",
            "note": f"Auto-assigned to IT Management on creation (Assignee: {it_user.full_name if it_user else 'None'}).",
            "actor": "System",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    )
    db.add(ticket)
    
    await db.commit()
    await db.refresh(ticket)
    return ticket, it_user
