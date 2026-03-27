
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from ..models.models import AuditLog, Asset, User
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

class TimelineService:
    """
    Service to manage Asset Lifecycle Events using the AuditLog table.
    Standardizes how we record 'Title', 'Description', and 'Metadata' for the timeline.
    """

    async def log_event(
        self,
        db: AsyncSession,
        asset_id: uuid.UUID,
        event_type: str,
        description: str,
        performed_by_id: Optional[uuid.UUID] = None,
        performed_by_name: Optional[str] = "System",
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Log a standardized lifecycle event.
        
        event_type: CREATED, STATUS_CHANGE, ASSIGNMENT, MAINTENANCE, DISCOVERED, AUDIT
        """
        try:
            audit = AuditLog(
                id=uuid.uuid4(),
                entity_type="Asset",
                entity_id=str(asset_id),
                action=event_type,
                performed_by=performed_by_id,
                details={
                    "description": description,
                    "performed_by_name": performed_by_name,
                    "metadata": metadata or {}
                },
                timestamp=datetime.now(timezone.utc)
            )
            db.add(audit)
            return audit
        except Exception as e:
            logger.error(f"Failed to log timeline event for asset {asset_id}: {e}")
            raise

    async def get_asset_timeline(self, db: AsyncSession, asset_id: uuid.UUID) -> Dict[str, Any]:
        """
        Retrieve the full history of an asset, formatted for the frontend timeline.
        Returns both the timeline events and calculated statistics/counts.
        """
        # Fetch generic AuditLogs
        result = await db.execute(
            select(AuditLog)
            .filter(AuditLog.entity_id == str(asset_id))
            .filter(AuditLog.entity_type == "Asset")
            .order_by(desc(AuditLog.timestamp))
        )
        logs = result.scalars().all()
        
        timeline = []
        stats = {}
        
        for log in logs:
            action = log.action
            stats[action] = stats.get(action, 0) + 1
            
            details = log.details or {}
            
            # Normalize legacy/different formats
            description = details.get("description") or details.get("message") or log.action
            performer = details.get("performed_by_name") or "System"
            meta = details.get("metadata") or details
            
            # Legacy Diff Support (if metadata has 'old_value' etc)
            changes = []
            if "old_value" in meta and "new_value" in meta:
                 changes.append({
                     "field": meta.get("field_name", "Unknown"),
                     "old": meta["old_value"],
                     "new": meta["new_value"]
                 })
            
            timeline.append({
                "id": str(log.id),
                "type": log.action,
                "title": self._humanize_action(log.action),
                "description": description,
                "timestamp": log.timestamp.isoformat(),
                "performer": performer,
                "changes": changes,
                "metadata": meta
            })
            
        # Determine current lifecycle stage
        current_stage = "Created"
        if stats.get("DISCOVERED"): current_stage = "Discovered"
        if stats.get("ASSIGNMENT"): current_stage = "Assigned"
        if stats.get("MAINTENANCE"): current_stage = "Maintenance"
        
        # Check asset status for Retirement
        asset_result = await db.execute(select(Asset).filter(Asset.id == asset_id))
        asset = asset_result.scalars().first()
        if asset and asset.status == "Retired":
            current_stage = "Retired"

        return {
            "events": timeline,
            "stats": stats,
            "current_stage": current_stage,
            "humanized_stats": {self._humanize_action(k): v for k, v in stats.items()}
        }

    def _humanize_action(self, action: str) -> str:
        mapping = {
            "CREATED": "Asset Created",
            "DISCOVERED": "Discovered by Agent",
            "DATA_COLLECT": "Data Updated",
            "ASSIGNMENT": "Assignment Changed",
            "STATUS_CHANGE": "Status Updated",
            "MAINTENANCE": "Maintenance Log",
            "AUDIT": "Field Update",
            "SOFT_DELETED": "Asset Retired"
        }
        return mapping.get(action, action.replace("_", " ").title())

timeline_service = TimelineService()
