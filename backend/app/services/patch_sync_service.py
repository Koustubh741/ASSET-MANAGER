import logging
from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy.orm import Session
from ..database.database import SessionLocal
from ..models.models import SystemPatch

logger = logging.getLogger(__name__)

# Simulated Sync State
sync_state = {
    "last_sync": None,
    "status": "IDLE",
    "patches_added": 0,
    "errors": []
}

def get_sync_status() -> Dict[str, Any]:
    return sync_state

async def sync_all_patch_feeds():
    """
    Enterprise Phase 4: Orchestrate multi-vendor patch sync.
    Syncs with Windows Update, Ubuntu Security, and RedHat advisories.
    """
    global sync_state
    sync_state["status"] = "RUNNING"
    sync_state["last_sync"] = datetime.now(timezone.utc)
    sync_state["patches_added"] = 0
    
    db = SessionLocal()
    try:
        # 1. Simulate Windows Update Sync (WSUS Logic)
        await _sync_windows_feed(db)
        
        # 2. Simulate Linux Repo Sync (Apt/Yum Logic)
        await _sync_linux_feed(db)
        
        sync_state["status"] = "SUCCESS"
        logger.info(f"Vendor sync completed. Added {sync_state['patches_added']} patches.")
        
    except Exception as e:
        logger.error(f"Vendor sync failed: {e}")
        sync_state["status"] = "FAILED"
        sync_state["errors"].append(str(e))
    finally:
        db.close()

async def _sync_windows_feed(db: Session):
    # Simulated Windows Patches
    mock_patches = [
        {"id": "KB5034122", "title": "Windows 10 Security Update", "severity": "Critical", "cvss": 8.8, "kb": "5034122"},
        {"id": "KB5034123", "title": "Windows 11 Cumulative Update", "severity": "Medium", "cvss": 6.5, "kb": "5034123"}
    ]
    
    for p in mock_patches:
        existing = db.query(SystemPatch).filter(SystemPatch.patch_id == p["id"]).first()
        if not existing:
            new_patch = SystemPatch(
                patch_id=p["id"],
                title=p["title"],
                description=f"Automated sync from Microsoft Vendor Feed for {p['id']}",
                severity=p["severity"],
                patch_type="Security",
                platform="Windows",
                cvss_score=p["cvss"],
                kb_article_id=p["kb"],
                release_date=datetime.now(timezone.utc)
            )
            db.add(new_patch)
            sync_state["patches_added"] += 1
    db.commit()

async def _sync_linux_feed(db: Session):
    # Simulated Linux Security Advisories
    mock_patches = [
        {"id": "USN-6600-1", "title": "Ubuntu Security Notice: Linux Kernel", "severity": "Critical", "cvss": 9.2},
        {"id": "RHSA-2024:0123", "title": "Red Hat Security Advisory: Bash Fix", "severity": "High", "cvss": 7.8}
    ]
    
    for p in mock_patches:
        existing = db.query(SystemPatch).filter(SystemPatch.patch_id == p["id"]).first()
        if not existing:
            new_patch = SystemPatch(
                patch_id=p["id"],
                title=p["title"],
                description=f"Automated sync from Linux Vendor Feed ({p['id']})",
                severity=p["severity"],
                patch_type="Security",
                platform="Linux",
                cvss_score=p["cvss"],
                release_date=datetime.now(timezone.utc)
            )
            db.add(new_patch)
            sync_state["patches_added"] += 1
    db.commit()
