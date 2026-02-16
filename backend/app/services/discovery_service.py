from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..models.models import Asset, User, DiscoveredSoftware, DiscoveryScan, DiscoveryDiff, AgentConfiguration, AuditLog
from ..schemas.discovery_schema import DiscoveryPayload
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Constants — match these to your model column sizes
# ──────────────────────────────────────────────
SOFTWARE_NAME_MAX    = 255
SOFTWARE_VERSION_MAX = 100
SOFTWARE_VENDOR_MAX  = 255


def _utcnow() -> datetime:
    """Always return a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


async def _record_diff(
    db: AsyncSession,
    scan_id: uuid.UUID,
    asset_id: uuid.UUID,
    field: str,
    old: str,
    new: str
) -> None:
    """Internal helper to record a field-level change in discovery_diffs."""
    if str(old) == str(new):
        return
    diff = DiscoveryDiff(
        id=uuid.uuid4(),
        scan_id=scan_id,
        asset_id=asset_id,
        field_name=field,
        old_value=str(old) if old is not None else None,
        new_value=str(new) if new is not None else None,
    )
    db.add(diff)


async def _resolve_location_id(
    db: AsyncSession,
    payload: DiscoveryPayload
) -> uuid.UUID | None:
    """
    Return an explicit location_id from the payload, or fall back to
    the agent's configured default_location_id.
    """
    if payload.location_id:
        return payload.location_id

    loc_cfg_result = await db.execute(
        select(AgentConfiguration).filter(
            AgentConfiguration.agent_id == str(payload.agent_id),
            AgentConfiguration.config_key == "default_location_id",
        )
    )
    loc_cfg = loc_cfg_result.scalars().first()
    if loc_cfg:
        try:
            return uuid.UUID(loc_cfg.config_value)
        except (ValueError, AttributeError):
            logger.warning(
                "Invalid default_location_id '%s' for agent %s",
                loc_cfg.config_value,
                payload.agent_id,
            )
    return None


async def _resolve_user_id(
    db: AsyncSession,
    payload: DiscoveryPayload
) -> uuid.UUID | None:
    """
    Try to map an AD/primary user string to a User record.
    Exact email match is tried first, then a name fuzzy match.
    """
    target_user_str = None
    if payload.hardware.ad_user and payload.hardware.ad_user != "Unknown":
        target_user_str = payload.hardware.ad_user
    elif payload.hardware.primary_user:
        target_user_str = payload.hardware.primary_user

    if not target_user_str:
        return None

    # Strip domain prefix (DOMAIN\user) and normalise to lowercase
    clean_user = target_user_str.split("\\")[-1].lower()
    if "@" in clean_user:
        clean_user = clean_user.split("@")[0]

    # 1. Exact email prefix match  (john → john@*)
    exact_result = await db.execute(
        select(User).filter(User.email.ilike(f"{clean_user}@%"))
    )
    matched = exact_result.scalars().first()
    if matched:
        return matched.id

    # 2. Fallback: full-name fuzzy match
    fuzzy_result = await db.execute(
        select(User).filter(User.full_name.ilike(f"%{clean_user}%"))
    )
    matched = fuzzy_result.scalars().first()
    if matched:
        logger.debug("User '%s' resolved via name fuzzy-match to %s", clean_user, matched.id)
        return matched.id

    return None


async def process_discovery_payload(
    db: AsyncSession,
    payload: DiscoveryPayload,
) -> Asset:
    """
    Process an incoming discovery payload and upsert the asset.

    Steps:
      1. Open / retrieve the scan session record.
      2. Resolve location and user assignments.
      3. Look up the asset by serial number.
      4. Record field-level diffs (if updating).
      5. Create or update the asset.
      6. Sync the software inventory.
      7. Commit and return the refreshed asset.
    """
    try:
        # ── 1. Scan Session ──────────────────────────────────────────────
        scan_id = payload.scan_id
        scan: DiscoveryScan | None = None

        if scan_id:
            scan_result = await db.execute(
                select(DiscoveryScan).filter(DiscoveryScan.id == scan_id)
            )
            scan = scan_result.scalars().first()
            if not scan:
                scan = DiscoveryScan(
                    id=scan_id,
                    agent_id=str(payload.agent_id),
                    scan_type="local",
                    status="STARTED",
                    assets_processed=0,
                )
                db.add(scan)

        # ── 2. Resolve location & user ───────────────────────────────────
        assigned_location_id = await _resolve_location_id(db, payload)
        assigned_user_id     = await _resolve_user_id(db, payload)

        # ── 3. Build specifications blob ─────────────────────────────────
        # Base specs from hardware/OS
        specs: dict[str, str] = {
            "OS":           f"{payload.os.name} {payload.os.version}",
            "Processor":    payload.hardware.cpu,
            "RAM":          f"{round(payload.hardware.ram_mb / 1024)} GB",
            "Storage":      f"{payload.hardware.storage_gb} GB" if payload.hardware.storage_gb else "N/A",
            "Condition":    payload.hardware.condition or "Excellent",
            "IP Address":   payload.ip_address,
            "Last Scan":    _utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "AD User":      payload.hardware.ad_user,
            "Primary User": payload.hardware.primary_user,
            "AD Domain":    payload.hardware.ad_domain,
            "Agent ID":     str(payload.agent_id),
        }

        # Human-friendly uptime, if available
        try:
            if payload.os.uptime_sec and payload.os.uptime_sec > 0:
                total_sec = int(payload.os.uptime_sec)
                days, rem = divmod(total_sec, 86400)
                hours, rem = divmod(rem, 3600)
                minutes, _ = divmod(rem, 60)
                parts: list[str] = []
                if days:
                    parts.append(f"{days}d")
                if hours:
                    parts.append(f"{hours}h")
                if minutes or not parts:
                    parts.append(f"{minutes}m")
                specs["Uptime"] = " ".join(parts)
        except Exception:
            # Uptime is optional; ignore formatting errors
            pass

        # Network / disk detail from metadata (best-effort)
        meta = payload.metadata or {}
        network = meta.get("network") or []
        disks = meta.get("disks") or []

        if isinstance(network, list) and network:
            # Short summary: number of interfaces and sample IPs
            ips: list[str] = []
            for entry in network:
                ip_addr = entry.get("ip") if isinstance(entry, dict) else None
                if ip_addr and ip_addr not in ips:
                    ips.append(ip_addr)
                if len(ips) >= 3:
                    break
            specs["Network Interfaces"] = f"{len(network)} entries; sample IPs: {', '.join(ips)}"

        if isinstance(disks, list) and disks:
            # Compute total storage if not already present, and build a short summary
            try:
                total_bytes = 0
                for d in disks:
                    if isinstance(d, dict):
                        size_val = d.get("size_bytes")
                        try:
                            if size_val is not None:
                                total_bytes += int(size_val)
                        except (TypeError, ValueError):
                            continue
                if total_bytes and (not payload.hardware.storage_gb):
                    specs["Storage"] = f"{total_bytes // (1024 * 1024 * 1024)} GB"
            except Exception:
                pass

            # Simple descriptive string
            try:
                sample = []
                for d in disks[:3]:
                    if isinstance(d, dict):
                        name = d.get("name") or d.get("device_id") or "disk"
                        size_val = d.get("size_bytes")
                        size_gb = None
                        try:
                            if size_val is not None:
                                size_gb = int(size_val) // (1024 * 1024 * 1024)
                        except (TypeError, ValueError):
                            size_gb = None
                        if size_gb is not None and size_gb > 0:
                            sample.append(f"{name}≈{size_gb}GB")
                        else:
                            sample.append(name)
                if sample:
                    specs["Storage Detail"] = ", ".join(sample)
            except Exception:
                pass

        # ── 4. Look up existing asset ────────────────────────────────────
        asset_result = await db.execute(
            select(Asset).filter(Asset.serial_number == payload.hardware.serial)
        )
        db_asset: Asset | None = asset_result.scalars().first()

        # ── 5a. UPDATE existing asset ────────────────────────────────────
        if db_asset:
            # Record field-level diffs before mutating
            if scan_id:
                if db_asset.name != payload.hostname:
                    await _record_diff(
                        db, scan_id, db_asset.id,
                        "Hostname", db_asset.name, payload.hostname,
                    )

                old_specs = db_asset.specifications or {}
                for key in ("OS", "Processor", "RAM", "Storage"):
                    if old_specs.get(key) != specs.get(key):
                        await _record_diff(
                            db, scan_id, db_asset.id,
                            key, old_specs.get(key), specs.get(key),
                        )

            db_asset.name           = payload.hostname
            db_asset.model          = payload.hardware.model
            db_asset.vendor         = payload.hardware.vendor
            db_asset.type           = payload.hardware.type or db_asset.type
            db_asset.specifications = specs
            db_asset.updated_at     = _utcnow()

            # Only overwrite location/user when the payload provides them
            if assigned_location_id:
                db_asset.location_id = assigned_location_id
            if assigned_user_id and not db_asset.assigned_to_id:
                db_asset.assigned_to_id = assigned_user_id

            # Record Audit Log for Data Collection (Update)
            audit = AuditLog(
                id=uuid.uuid4(),
                entity_type="Asset",
                entity_id=str(db_asset.id),
                action="DATA_COLLECT",
                performed_by=payload.agent_id if isinstance(payload.agent_id, uuid.UUID) else None,
                details={
                    "message": f"Discovery data collected for {payload.hostname}",
                    "source": "Discovery Agent",
                    "hostname": payload.hostname,
                    "ip_address": payload.ip_address
                },
                timestamp=_utcnow()
            )
            db.add(audit)

        # ── 5b. CREATE new asset ─────────────────────────────────────────
        else:
            db_asset = Asset(
                id=uuid.uuid4(),
                name=payload.hostname,
                type=payload.hardware.type or "Desktop",
                model=payload.hardware.model,
                vendor=payload.hardware.vendor,
                serial_number=payload.hardware.serial,
                assigned_to_id=assigned_user_id,
                location_id=assigned_location_id,
                status="Discovered",
                segment="IT",
                specifications=specs,
            )
            db.add(db_asset)
            
            # Record Audit Log for Creation
            audit = AuditLog(
                id=uuid.uuid4(),
                entity_type="Asset",
                entity_id=str(db_asset.id),
                action="CREATED",
                performed_by=payload.agent_id if isinstance(payload.agent_id, uuid.UUID) else None,
                details={
                    "message": f"Asset {payload.hostname} discovered for the first time",
                    "source": "Discovery Agent",
                    "hostname": payload.hostname,
                    "serial_number": payload.hardware.serial
                },
                timestamp=_utcnow()
            )
            db.add(audit)

        # Flush so db_asset.id is available for software / diff FK references
        await db.flush()

        # ── 6. Sync software inventory ───────────────────────────────────
        if payload.software is not None:
            # Diff before wiping
            if scan_id:
                soft_result = await db.execute(
                    select(DiscoveredSoftware).filter(
                        DiscoveredSoftware.asset_id == db_asset.id
                    )
                )
                existing_soft = {s.name for s in soft_result.scalars().all()}
                incoming_soft = {s.name for s in payload.software}

                for name in incoming_soft - existing_soft:
                    await _record_diff(db, scan_id, db_asset.id, "Software Installed", None, name)
                for name in existing_soft - incoming_soft:
                    await _record_diff(db, scan_id, db_asset.id, "Software Removed", name, None)

            # Wipe and re-sync
            await db.execute(
                delete(DiscoveredSoftware).where(
                    DiscoveredSoftware.asset_id == db_asset.id
                )
            )

            for soft in payload.software:
                db.add(DiscoveredSoftware(
                    id=uuid.uuid4(),
                    asset_id=db_asset.id,
                    name=soft.name[:SOFTWARE_NAME_MAX],
                    version=(soft.version or "Unknown")[:SOFTWARE_VERSION_MAX],
                    vendor=(soft.vendor  or "Unknown")[:SOFTWARE_VENDOR_MAX],
                ))

        # ── 7. Commit ────────────────────────────────────────────────────
        await db.commit()
        await db.refresh(db_asset)

        # Increment counter only after a successful commit
        if scan:
            scan.assets_processed = (scan.assets_processed or 0) + 1
            await db.commit()

        return db_asset

    except Exception:
        logger.exception(
            "Failed to process discovery payload for serial=%s agent=%s — rolling back.",
            payload.hardware.serial,
            payload.agent_id,
        )
        await db.rollback()
        raise