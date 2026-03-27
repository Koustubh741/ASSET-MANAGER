from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict
from sqlalchemy.future import select
from sqlalchemy import func
from ..models.models import SystemPatch, PatchDeployment, Asset, PatchSchedule, AgentCommand
from ..schemas.patch_schema import SystemPatchCreate, PatchDeploymentCreate
from uuid import UUID
import uuid

PLATFORM_MAP = {
    # Windows variants
    "windows": "Windows", "win": "Windows", "win10": "Windows",
    "win11": "Windows", "windows 10": "Windows", "windows 11": "Windows",
    # Linux variants
    "linux": "Linux", "ubuntu": "Linux", "debian": "Linux",
    "centos": "Linux", "rhel": "Linux", "fedora": "Linux",
    "amazon": "Linux", "redhat": "Linux",
    # macOS variants
    "macos": "macOS", "mac": "macOS", "osx": "macOS", "darwin": "macOS",
}

def detect_platform(asset) -> Optional[str]:
    """Try to detect platform from asset specifications or type."""
    specs = asset.specifications or {}
    
    # Check common variations of OS/Platform keys
    val = (
        specs.get("os") or specs.get("OS") or
        specs.get("os_name") or specs.get("OS_Name") or
        specs.get("platform") or specs.get("Platform") or
        asset.type or ""
    )
    # Ensure it's a string before calling lower()
    raw = str(val).lower().strip()
    for key, platform in PLATFORM_MAP.items():
        if key in raw:
            return platform
    return None  # Unknown

async def get_all_patches(db: AsyncSession):
    """Return all patches sorted by CVSS score (desc) then release date (desc)."""
    from sqlalchemy import desc, nullslast
    result = await db.execute(
        select(SystemPatch).order_by(
            nullslast(desc(SystemPatch.cvss_score)),
            desc(SystemPatch.release_date)
        )
    )
    return result.scalars().all()

async def create_patch(db: AsyncSession, patch: SystemPatchCreate):
    """Create a new system patch, including optional CVE fields."""
    db_patch = SystemPatch(
        id=uuid.uuid4(),
        patch_id=patch.patch_id,
        title=patch.title,
        description=patch.description,
        severity=patch.severity,
        patch_type=patch.patch_type,
        platform=patch.platform,
        release_date=patch.release_date,
        # CVE / Vulnerability fields (Phase 8)
        cve_ids=patch.cve_ids or [],
        cvss_score=patch.cvss_score,
        kb_article_url=patch.kb_article_url,
        vendor_advisory=patch.vendor_advisory,
        # Local Hosting (Phase 2)
        binary_url=patch.binary_url,
        is_custom=patch.is_custom,
    )
    db.add(db_patch)
    await db.commit()
    await db.refresh(db_patch)
    return db_patch

async def get_patch_deployments(db: AsyncSession, asset_id: Optional[UUID] = None, patch_id: Optional[UUID] = None):
    query = select(PatchDeployment)
    if asset_id:
        query = query.filter(PatchDeployment.asset_id == asset_id)
    if patch_id:
        query = query.filter(PatchDeployment.patch_id == patch_id)
    
    result = await db.execute(query)
    return result.scalars().all()

async def update_patch_status(db: AsyncSession, asset_id: UUID, patch_id: UUID, status: str, error_message: Optional[str] = None):
    query = select(PatchDeployment).filter(
        PatchDeployment.asset_id == asset_id,
        PatchDeployment.patch_id == patch_id
    )
    result = await db.execute(query)
    deployment = result.scalars().first()
    
    if not deployment:
        deployment = PatchDeployment(
            id=uuid.uuid4(),
            asset_id=asset_id,
            patch_id=patch_id,
            status=status,
            error_message=error_message
        )
        if status == "INSTALLED":
            deployment.installed_at = func.now()
        db.add(deployment)
    else:
        deployment.status = status
        deployment.error_message = error_message
        if status == "INSTALLED":
            deployment.installed_at = func.now()
    
    await db.commit()
    await db.refresh(deployment)
    return deployment

async def get_compliance_summary(db: AsyncSession):
    """
    Returns patch compliance summary for all assets, filtered by platform.
    Uses persistent VulnerabilityMapping table for Enterprise Scale.
    """
    from ..models.models import VulnerabilityMapping

    assets_result = await db.execute(
        select(Asset).filter(func.lower(Asset.status).in_(["in use", "active"]))
    )
    assets = assets_result.scalars().all()

    # Get all global deployments to avoid N+1 queries ideally, or per asset.
    dep_result = await db.execute(select(PatchDeployment))
    all_deps = dep_result.scalars().all()

    # Get all mappings
    map_result = await db.execute(select(VulnerabilityMapping))
    all_mappings = map_result.scalars().all()

    # Get all patches (for critical severity check)
    patches_result = await db.execute(select(SystemPatch))
    patches_map = {p.id: p for p in patches_result.scalars().all()}

    summary = []
    for asset in assets:
        platform = detect_platform(asset)

        # Asset's known vulnerabilities (applicable patches with pre-calculated risk)
        asset_mappings = [m for m in all_mappings if m.asset_id == asset.id]
        total_count = len(asset_mappings)

        # Deployments for this asset
        asset_deps = [d for d in all_deps if d.asset_id == asset.id]
        
        # We only care about deployments that are in the mapping (applicable)
        valid_patch_ids = {m.patch_id for m in asset_mappings}
        applicable_deps = [d for d in asset_deps if d.patch_id in valid_patch_ids]

        installed = len([d for d in applicable_deps if d.status == "INSTALLED"])
        missing = total_count - installed

        # Critical missing calculation
        critical_patch_ids = {
            m.patch_id for m in asset_mappings 
            if patches_map.get(m.patch_id) and patches_map[m.patch_id].severity == "Critical"
        }
        installed_ids = {d.patch_id for d in applicable_deps if d.status == "INSTALLED"}
        critical_missing = len(critical_patch_ids - installed_ids)

        score = (installed / total_count * 100) if total_count > 0 else 100.0

        summary.append({
            "asset_id": asset.id,
            "asset_name": asset.name,
            "platform": platform,
            "total_patches": total_count,
            "installed_patches": installed,
            "missing_patches": max(0, missing),
            "critical_missing": critical_missing,
            "compliance_score": round(score, 2),
        })

    return summary

async def evaluate_asset_risk(db: AsyncSession, patch_id: UUID, asset_id: UUID) -> float:
    """
    Calculate environmental risk score (Phase 3).
    Formula: CVSS Score * (Asset Criticality Factor)
    """
    patch_res = await db.execute(select(SystemPatch).where(SystemPatch.id == patch_id))
    patch = patch_res.scalars().first()
    
    asset_res = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = asset_res.scalars().first()
    
    if not patch or not asset:
        return 0.0
        
    cvss = patch.cvss_score or 5.0 # default to medium if unknown
    
    # Asset Criticality Factor (Inferred from type or specs)
    criticality = 1.0
    asset_type = (asset.type or "").lower()
    if "server" in asset_type or "production" in asset_type:
        criticality = 2.0
    elif "pilot" in asset_type or asset.is_pilot:
        criticality = 0.5
        
    return min(10.0, cvss * criticality)
