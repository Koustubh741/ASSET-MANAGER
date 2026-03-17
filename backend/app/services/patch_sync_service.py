"""
Patch Sync Service — Phase 3
Fetches patches from:
  - Microsoft MSRC Security Update API
  - Ubuntu USN JSON feed
  - NIST NVD CVE API (links CVE data to existing patches)

Scheduled daily at 2 AM via APScheduler.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from ..models.models import SystemPatch
from ..database.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# ── Last sync tracking (in-memory, reset on restart) ─────────────────────────
_last_sync: dict = {
    "microsoft": None,
    "ubuntu": None,
    "nvd": None,
    "patches_added": 0,
    "last_error": None,
    "last_run": None,
}


async def sync_microsoft_patches(db: AsyncSession) -> int:
    """
    Fetch security updates from the Microsoft Security Response Center (MSRC) API.
    URL: https://api.msrc.microsoft.com/cvrf/v2.0/updates
    Returns number of patches upserted.
    """
    added = 0
    base_url = "https://api.msrc.microsoft.com/cvrf/v2.0"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{base_url}/updates", headers={"Accept": "application/json"})
            resp.raise_for_status()
            data = resp.json()

            for entry in data.get("value", [])[:50]:  # Limit to most recent 50
                patch_id = entry.get("ID", "")
                title = entry.get("DocumentTitle", {}).get("Value", "Unknown Patch")
                release_date_str = entry.get("InitialReleaseDate", "")
                severity = entry.get("MaximumSeverity", "Moderate")

                if not patch_id:
                    continue

                # Map MSRC severity to our model
                sev_map = {
                    "Critical": "Critical",
                    "Important": "Important",
                    "Moderate": "Moderate",
                    "Low": "Low",
                }
                mapped_severity = sev_map.get(severity, "Moderate")

                try:
                    release_date = datetime.fromisoformat(release_date_str.replace("Z", "+00:00")) if release_date_str else None
                except ValueError:
                    release_date = None

                # Upsert into system_patches
                existing = await db.execute(
                    select(SystemPatch).where(SystemPatch.patch_id == patch_id)
                )
                if existing.scalars().first():
                    continue  # Skip already known patches

                patch = SystemPatch(
                    id=uuid.uuid4(),
                    patch_id=patch_id,
                    title=title[:500],
                    description=f"Microsoft Security Update: {patch_id}",
                    severity=mapped_severity,
                    patch_type="Security",
                    platform="Windows",
                    release_date=release_date,
                    kb_article_url=f"https://support.microsoft.com/kb/{patch_id.replace('KB', '')}",
                )
                db.add(patch)
                added += 1

        await db.commit()
        _last_sync["microsoft"] = datetime.now(timezone.utc).isoformat()
        logger.info(f"[PatchSync] Microsoft: {added} new patches added")
    except Exception as e:
        logger.error(f"[PatchSync] Microsoft sync failed: {e}")
        _last_sync["last_error"] = f"MSRC: {str(e)}"
        await db.rollback()

    return added


async def sync_ubuntu_patches(db: AsyncSession) -> int:
    """
    Fetch Ubuntu Security Notices (USN) feed.
    URL: https://ubuntu.com/security/notices?order=newest&details=1&page=1
    Returns number of patches upserted.
    """
    added = 0
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                "https://ubuntu.com/security/notices.json?order=newest&details=1&limit=50"
            )
            resp.raise_for_status()
            notices = resp.json().get("notices", [])

            for notice in notices[:50]:
                usn_id = notice.get("id", "")
                title = notice.get("title", "Ubuntu Security Notice")
                summary = notice.get("summary", "")
                cve_list = [c.get("id") for c in notice.get("cves", []) if c.get("id")]

                max_cvss = 0.0
                for cve in notice.get("cves", []):
                    cvss = cve.get("cvss3", {}).get("baseScore", 0.0)
                    if isinstance(cvss, (int, float)):
                        max_cvss = max(max_cvss, float(cvss))

                severity = "Moderate"
                if max_cvss >= 9.0:
                    severity = "Critical"
                elif max_cvss >= 7.0:
                    severity = "Important"

                if not usn_id:
                    continue

                existing = await db.execute(
                    select(SystemPatch).where(SystemPatch.patch_id == usn_id)
                )
                if existing.scalars().first():
                    continue

                patch = SystemPatch(
                    id=uuid.uuid4(),
                    patch_id=usn_id,
                    title=title[:500],
                    description=summary[:1000] if summary else None,
                    severity=severity,
                    patch_type="Security",
                    platform="Linux",
                    release_date=None,
                    cve_ids=cve_list,
                    cvss_score=max_cvss if max_cvss > 0 else None,
                    vendor_advisory=f"https://ubuntu.com/security/notices/{usn_id}",
                )
                db.add(patch)
                added += 1

        await db.commit()
        _last_sync["ubuntu"] = datetime.now(timezone.utc).isoformat()
        logger.info(f"[PatchSync] Ubuntu: {added} new patches added")
    except Exception as e:
        logger.error(f"[PatchSync] Ubuntu sync failed: {e}")
        _last_sync["last_error"] = f"Ubuntu: {str(e)}"
        await db.rollback()

    return added


async def sync_nvd_cve_data(db: AsyncSession) -> int:
    """
    Link CVE data from NIST NVD to existing patches.
    Updates cvss_score and cve_ids on patches that match CVE references.
    """
    updated = 0
    try:
        # Get all patches without CVE data
        patches_result = await db.execute(
            select(SystemPatch).where(SystemPatch.cvss_score.is_(None)).limit(30)
        )
        patches = patches_result.scalars().all()

        async with httpx.AsyncClient(timeout=30.0) as client:
            for patch in patches:
                if not patch.cve_ids:
                    continue
                # Fetch CVSS for first CVE in list
                cve_id = patch.cve_ids[0]
                try:
                    resp = await client.get(
                        f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}",
                        headers={"User-Agent": "AssetManager/1.0"}
                    )
                    if resp.status_code == 200:
                        nvd_data = resp.json()
                        vulns = nvd_data.get("vulnerabilities", [])
                        if vulns:
                            metrics = vulns[0].get("cve", {}).get("metrics", {})
                            cvss_v3 = metrics.get("cvssMetricV31", metrics.get("cvssMetricV30", []))
                            if cvss_v3:
                                score = cvss_v3[0].get("cvssData", {}).get("baseScore", 0.0)
                                patch.cvss_score = float(score)
                                # Auto-escalate severity based on CVSS
                                if score >= 9.0:
                                    patch.severity = "Critical"
                                elif score >= 7.0:
                                    patch.severity = "Important"
                                updated += 1
                except Exception:
                    continue  # Skip individual CVE errors, keep going

        await db.commit()
        _last_sync["nvd"] = datetime.now(timezone.utc).isoformat()
        logger.info(f"[PatchSync] NVD: Updated CVSS for {updated} patches")
    except Exception as e:
        logger.error(f"[PatchSync] NVD sync failed: {e}")
        await db.rollback()

    return updated


async def sync_all_patch_feeds() -> dict:
    """
    Master sync function: runs all vendor feeds in sequence.
    Called by APScheduler daily at 2 AM.
    """
    start = datetime.now(timezone.utc)
    _last_sync["last_run"] = start.isoformat()
    _last_sync["patches_added"] = 0
    _last_sync["last_error"] = None

    results = {"microsoft": 0, "ubuntu": 0, "nvd_updated": 0}

    async with AsyncSessionLocal() as db:
        results["microsoft"] = await sync_microsoft_patches(db)
        results["ubuntu"]    = await sync_ubuntu_patches(db)
        results["nvd_updated"] = await sync_nvd_cve_data(db)

    _last_sync["patches_added"] = results["microsoft"] + results["ubuntu"]
    duration = (datetime.now(timezone.utc) - start).total_seconds()
    logger.info(f"[PatchSync] Complete in {duration:.1f}s: {results}")
    return results


def get_sync_status() -> dict:
    """Return current sync status for the /patches/sync-status endpoint."""
    return {**_last_sync}
