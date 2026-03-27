from datetime import date, timedelta, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from ..models.models import Asset, Notification
from ..routers.notifications import create_notification
import logging

logger = logging.getLogger(__name__)

async def run_warranty_pulse(db: AsyncSession):
    """
    Scans for assets with upcoming warranty expirations and 
    creates system-wide notifications.
    """
    logger.info("🎬 Starting Warranty Expiry Pulse...")
    
    today = date.today()
    cutoff = today + timedelta(days=30)
    
    # 1. Identify assets expiring soon
    q = select(Asset).where(
        and_(
            Asset.warranty_expiry.isnot(None),
            Asset.warranty_expiry >= today,
            Asset.warranty_expiry <= cutoff
        )
    )
    
    result = await db.execute(q)
    expiring_assets = result.scalars().all()
    count = 0
    
    for asset in expiring_assets:
        # 2. Duplicate Prevention: Check if we already notified about THIS asset recently
        # We look for a 'warranty' type notification for this asset's link in the last 30 days
        expiry_link = f"/assets/{asset.id}"
        check_q = select(Notification).where(
            Notification.type == "warranty",
            Notification.link == expiry_link,
            Notification.is_read == False
        )
        check_res = await db.execute(check_q)
        if check_res.scalars().first():
            continue
            
        # 3. Create Notification
        days_left = (asset.warranty_expiry - today).days
        title = "⚠️ Warranty Expiring"
        if days_left == 0:
            msg = f"Warranty for {asset.name} expires TODAY."
        else:
            msg = f"Warranty for {asset.name} expires in {days_left} days ({asset.warranty_expiry})."
            
        await create_notification(
            db=db,
            title=title,
            message=msg,
            notification_type="warranty",
            link=expiry_link,
            source="WARRANTY_PULSE"
        )
        count += 1
        
    if count > 0:
        await db.commit()
        logger.info(f"✅ Warranty Pulse complete. Generated {count} new alerts.")
    else:
        logger.info("ℹ️ Warranty Pulse complete. No new alerts needed.")
