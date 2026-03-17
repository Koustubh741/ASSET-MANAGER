from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from sqlalchemy.future import select
from sqlalchemy import func
from ..models.models import SystemPatch, PatchDeployment, Asset
from ..schemas.patch_schema import SystemPatchCreate, PatchDeploymentCreate
from uuid import UUID
import uuid

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
    Each asset's compliance score only counts patches that match its OS platform.
    """
    PLATFORM_MAP = {
        # Windows variants
        "windows": "Windows", "win": "Windows", "win10": "Windows",
        "win11": "Windows", "windows 10": "Windows", "windows 11": "Windows",
        # Linux variants
        "linux": "Linux", "ubuntu": "Linux", "debian": "Linux",
        "centos": "Linux", "rhel": "Linux", "fedora": "Linux",
        # macOS variants
        "macos": "macOS", "mac": "macOS", "osx": "macOS", "darwin": "macOS",
    }

    def detect_platform(asset) -> Optional[str]:
        """Try to detect platform from asset specifications or type."""
        specs = asset.specifications or {}
        raw = (
            specs.get("os", "") or
            specs.get("os_name", "") or
            specs.get("platform", "") or
            asset.type or ""
        ).lower().strip()
        for key, platform in PLATFORM_MAP.items():
            if key in raw:
                return platform
        return None  # Unknown — will match all patches

    assets_result = await db.execute(select(Asset).filter(Asset.status == "IN_USE"))
    assets = assets_result.scalars().all()

    patches_result = await db.execute(select(SystemPatch))
    all_patches = patches_result.scalars().all()

    summary = []
    for asset in assets:
        platform = detect_platform(asset)

        # Only count patches applicable to this asset's platform
        # If platform is None (unknown), count all patches
        applicable_patches = (
            [p for p in all_patches if p.platform == platform]
            if platform else all_patches
        )
        total_count = len(applicable_patches)

        # Get deployments for this asset
        dep_result = await db.execute(
            select(PatchDeployment).filter(PatchDeployment.asset_id == asset.id)
        )
        deps = dep_result.scalars().all()

        installed = len([d for d in deps if d.status == "INSTALLED"])
        failed = len([d for d in deps if d.status == "FAILED"])
        missing = total_count - installed

        # Critical missing — only within applicable patches
        critical_patch_ids = {p.id for p in applicable_patches if p.severity == "Critical"}
        installed_ids = {d.patch_id for d in deps if d.status == "INSTALLED"}
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
