from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_, func
from sqlalchemy.exc import IntegrityError
from ..models.models import Asset, User, DiscoveredSoftware, DiscoveryScan, DiscoveryDiff, AgentConfiguration, AuditLog, AssetRelationship
from ..schemas.discovery_schema import DiscoveryPayload
from datetime import datetime, timezone
import uuid
import logging
from ..utils.uuid_gen import get_uuid
from ..routers.notifications import create_notification # Real-time alerts

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
        id=get_uuid(),
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
) -> Asset | None:
    """
    Process an incoming discovery payload and upsert the asset.
    Returns None (without raising) if the payload cannot be safely persisted
    (e.g. no serial number available for a new asset insert).

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

        # ── 3. Build & Enrich specifications blob ───────────────────────
        from .discovery_enricher import discovery_enricher
        
        # Universal enrichment pipeline: Sanitize -> Detect Vendor -> Detect Type -> Detect Model
        discovery_enricher.fully_enrich_hardware(payload.hardware, payload.metadata)

        # Base specs from hardware/OS (include all fields — clean_specs will filter noise)
        raw_specs: dict[str, str] = {
            "OS":           f"{payload.os.name} {payload.os.version}",
            "Processor":    payload.hardware.cpu,
            "RAM":          f"{round(payload.hardware.ram_mb / 1024)} GB",
            "Storage":      f"{payload.hardware.storage_gb} GB" if payload.hardware.storage_gb else "N/A",
            "Condition":    payload.hardware.condition or "Excellent",
            "IP Address":   payload.ip_address,
            "Last Scan":    _utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "Serial Number": payload.hardware.serial,
            # AD / agent fields — may be placeholder; clean_specs will drop them
            "Agent ID":     str(payload.agent_id),
            "AD User":      payload.hardware.ad_user,
            "Primary User": payload.hardware.primary_user,
            "AD Domain":    payload.hardware.ad_domain,
        }

        # Incorporate sanitized metadata descriptions/location/uptime
        meta = payload.metadata or {}
        if meta.get("snmp_description") or meta.get("description"):
            raw_specs["Description"] = meta.get("snmp_description") or meta.get("description")
        if meta.get("snmp_location"):
            raw_specs["Location"] = meta["snmp_location"]
        if meta.get("snmp_uptime"):
            raw_specs["Uptime"] = meta["snmp_uptime"]

        # Uptime from agent payload (seconds)
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
                raw_specs["Uptime"] = " ".join(parts)
        except Exception:
            pass

        # Root Fix: standardize keys then clean placeholder/noise values
        # (filtering zeroed Agent IDs, "Unknown" AD fields, raw SNMP timeticks, etc.)
        specs = discovery_enricher.standardize_specs(raw_specs)
        specs = discovery_enricher.clean_specs(specs)

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

        # ── 4. Look up existing asset (4-tier dedup chain) ───────────────
        db_asset: Asset | None = None
        ZEROED_UUID = "00000000-0000-0000-0000-000000000000"
        agent_id_str = str(payload.agent_id)
        is_agentless = (agent_id_str == ZEROED_UUID)
        valid_serial = (
            payload.hardware.serial
            and payload.hardware.serial.lower() not in ("unknown", "n/a", "", "none")
        )

        # 4a. Exact Serial Number match (strongest dedup signal)
        if valid_serial:
            asset_result = await db.execute(
                select(Asset).filter(Asset.serial_number == payload.hardware.serial)
            )
            db_asset = asset_result.scalars().first()
            if db_asset:
                logger.debug("[dedup-4a] Matched asset %s by serial '%s'", db_asset.id, payload.hardware.serial)

        # 4b. Agent ID + Hostname (exact — handles normal re-scans from same agent)
        if not db_asset and not is_agentless:
            fallback_result = await db.execute(
                select(Asset).filter(Asset.name == payload.hostname)
            )
            for cand in fallback_result.scalars().all():
                cand_specs = cand.specifications or {}
                if str(cand_specs.get("Agent ID")) == agent_id_str:
                    db_asset = cand
                    logger.debug(
                        "[dedup-4b] Matched asset %s by agent_id+hostname '%s'",
                        cand.id, payload.hostname,
                    )
                    break

        # 4c. Hostname-only fallback (handles agent reinstall / stub merging / SNMP updates)
        #     Skip this for Cloud Vendors to prevent ephemeral overlap
        is_cloud = payload.hardware.vendor in ("AWS", "Azure", "GCP", "Oracle Cloud", "Alibaba Cloud")
        
        if not db_asset and not is_cloud:
            hostname_result = await db.execute(
                select(Asset).filter(Asset.name == payload.hostname)
            )
            for cand in hostname_result.scalars().all():
                cand_specs = cand.specifications or {}
                stored_agent = str(cand_specs.get("Agent ID", "")).strip()
                is_stub = (cand.serial_number or "").startswith("STUB-")
                has_no_agent = not stored_agent or stored_agent == ZEROED_UUID or stored_agent == "None"
                if is_stub or has_no_agent:
                    db_asset = cand
                    logger.info(
                        "[dedup-4c] Merged asset %s via hostname-only fallback "
                        "(hostname='%s', was_stub=%s, had_no_agent=%s)",
                        cand.id, payload.hostname, is_stub, has_no_agent,
                    )
                    break

        # 4d. IP Address last-resort dedup (catches reinstalled agents or SNMP host changes)
        #     Skip this for Cloud Vendors to prevent ephemeral overlap
        if not db_asset and payload.ip_address and not is_cloud:
            # Walk candidate assets that store this IP in their specifications JSONB
            ip_result = await db.execute(
                select(Asset).filter(
                    Asset.specifications["IP Address"].as_string() == payload.ip_address
                )
            )
            for cand in ip_result.scalars().all():
                if not (cand.serial_number or "").startswith("STUB-"):
                    db_asset = cand
                    logger.info(
                        "[dedup-4d] Matched asset %s by IP address '%s'",
                        cand.id, payload.ip_address,
                    )
                    break

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
            db_asset.model          = payload.hardware.model or "Unknown Model"
            db_asset.vendor         = payload.hardware.vendor or "Unknown Vendor"
            db_asset.type           = payload.hardware.type or db_asset.type
            db_asset.specifications = discovery_enricher.merge_specs(db_asset.specifications, specs)
            db_asset.updated_at     = _utcnow()

            # Root Fix: Only update serial_number if the new value isn't already
            # owned by a *different* asset. Prevents UniqueViolationError when
            # SNMP maps a new device (e.g. CCTV camera) onto an existing asset
            # record by hostname, then tries to write a serial number that
            # belongs to another asset (e.g. a laptop).
            new_serial = payload.hardware.serial
            if new_serial and new_serial.lower() not in ("unknown", "n/a", "", "none"):
                if new_serial != db_asset.serial_number:
                    conflict_result = await db.execute(
                        select(Asset).filter(
                            Asset.serial_number == new_serial,
                            Asset.id != db_asset.id
                        )
                    )
                    if conflict_result.scalars().first() is None:
                        # Safe to update — no other asset owns this serial
                        db_asset.serial_number = new_serial
                    else:
                        logger.warning(
                            "Skipping serial_number update for asset %s: '%s' is already owned by another asset.",
                            db_asset.id, new_serial
                        )

            # Only overwrite location/user when the payload provides them
            if assigned_location_id:
                db_asset.location_id = assigned_location_id
            if assigned_user_id and not db_asset.assigned_to_id:
                db_asset.assigned_to_id = assigned_user_id

            # Record Audit Log for Data Collection (Update)
            audit = AuditLog(
                id=get_uuid(),
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
            # Root Fix: We used to skip creation if serial_number was None.
            # Now that serial_number is nullable in the DB, we allow creation
            # so scannable devices (printers, cameras) appear in the inventory.
            pass

            db_asset = Asset(
                id=get_uuid(),
                name=payload.hostname,
                type=payload.hardware.type or "Desktop",
                model=payload.hardware.model or "Unknown Model",
                vendor=payload.hardware.vendor or "Unknown Vendor",
                serial_number=payload.hardware.serial,
                assigned_to_id=assigned_user_id,
                location_id=assigned_location_id,
                status="Discovered",
                segment="IT",
                specifications=specs,
            )
            db.add(db_asset)
            
            audit = AuditLog(
                id=get_uuid(),
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

            # Trigger real-time Notification for Discovery
            # We use a background task or just await if we're already in an async context
            try:
                # Extract source for branding the notification
                source_name = payload.metadata.get("source_provider") or payload.metadata.get("cloud_provider") or "Discovery Agent"
                await create_notification(
                    db=db,
                    title="🚀 New Asset Discovered",
                    message=f"{payload.hostname} ({payload.hardware.type}) detected via {source_name}.",
                    notification_type="discovery",
                    link=f"/assets/{db_asset.id}",
                    source=str(payload.agent_id)
                )
            except Exception as e:
                logger.error("Failed to trigger discovery notification: %s", e)

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
                    id=get_uuid(),
                    asset_id=db_asset.id,
                    name=soft.name[:SOFTWARE_NAME_MAX],
                    version=(soft.version or "Unknown")[:SOFTWARE_VERSION_MAX],
                    vendor=(soft.vendor  or "Unknown")[:SOFTWARE_VENDOR_MAX],
                ))

        # ── 7. Sync Network Relationships ───────────────────────────────
        if payload.neighbors:
            # Drop old relationships where this asset is the source
            await db.execute(
                delete(AssetRelationship).where(
                    AssetRelationship.source_asset_id == db_asset.id,
                    AssetRelationship.relationship_type == "connected_to"
                )
            )

            for neighbor in payload.neighbors:
                neighbor_name = neighbor.get("neighbor_name")
                if not neighbor_name:
                    continue

                # Attempt to find the target asset by its hostname or serial
                target_result = await db.execute(
                    select(Asset).filter(
                        or_(
                            func.lower(Asset.name) == neighbor_name.lower(),
                            func.lower(Asset.serial_number) == neighbor_name.lower()
                        )
                    )
                )
                target_asset = target_result.scalars().first()

                if not target_asset:
                    # Create a "Stub" asset for the discovered neighbor
                    logger.info("Creating stub asset for discovered neighbor: %s", neighbor_name)
                    target_asset = Asset()
                    target_asset.id = get_uuid()
                    target_asset.name = neighbor_name
                    target_asset.type = "Networking"
                    target_asset.model = "Neighbor Node"
                    target_asset.vendor = "Unknown Vendor"
                    target_asset.serial_number = f"STUB-{neighbor_name}"
                    target_asset.status = "Discovered"
                    target_asset.segment = "IT"
                    target_asset.specifications = {
                        "Discovery": "Neighbor (LLDP/SNMP)",
                        "IP Address": neighbor.get("neighbor_ip", "N/A"),
                        "Last Seen": _utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
                    }
                    
                    db.add(target_asset)
                    try:
                        async with db.begin_nested():
                            await db.flush()
                        logger.info("Successfully created stub asset: %s (ID: %s)", neighbor_name, target_asset.id)
                    except IntegrityError:
                        logger.warning("IntegrityError creating stub %s. It was likely inserted by a parallel device payload.", neighbor_name)
                        db.expunge(target_asset)
                        target_result = await db.execute(
                            select(Asset).filter(Asset.serial_number == f"STUB-{neighbor_name}")
                        )
                        target_asset = target_result.scalars().first()
                    except Exception as flush_exc:
                        logger.error("Failed to flush stub asset %s: %s", neighbor_name, str(flush_exc))
                        raise
                else:
                    # Enrich existing stub with IP if it's currently N/A
                    if target_asset.model == "Neighbor Node" and neighbor.get("neighbor_ip"):
                        specs = dict(target_asset.specifications or {})
                        if specs.get("IP Address") in (None, "N/A", ""):
                            specs["IP Address"] = neighbor.get("neighbor_ip")
                            target_asset.specifications = specs
                            logger.info("Enriched existing stub asset %s with IP %s", neighbor_name, specs["IP Address"])

                if target_asset and target_asset.id != db_asset.id:
                    db.add(AssetRelationship(
                        id=get_uuid(),
                        source_asset_id=db_asset.id,
                        target_asset_id=target_asset.id,
                        relationship_type="connected_to",
                        description=f"Automated discovery via SNMP/LLDP on port {neighbor.get('neighbor_port', 'unknown')}",
                        criticality=3.0,
                        metadata_={"source": "SNMP_SCAN", "port": neighbor.get("neighbor_port")}
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
