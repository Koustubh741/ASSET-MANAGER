"""
╔══════════════════════════════════════════════════════════════════╗
║           SNMP NETWORK ASSET SCANNER — ALL-IN-ONE FILE          ║
║                                                                  ║
║  WHAT TO DO:                                                     ║
║  1. pip install pysnmp-lextudio                                  ║
║  2. python snmp_scanner_all_in_one.py 192.168.1.0/24             ║
║                                                                  ║
║  MORE OPTIONS:                                                   ║
║  python snmp_scanner_all_in_one.py 192.168.1.0/24               ║
║       --communities public,private    (try multiple strings)     ║
║       --output table                  (human-readable table)     ║
║       --timeout 3                     (faster/slower probe)      ║
║       --max-concurrent 30             (lower = gentler on net)   ║
║       --verbose                       (debug logging)            ║
║                                                                  ║
║  SNMPv3 EXAMPLE:                                                 ║
║  python snmp_scanner_all_in_one.py 10.0.0.0/24                  ║
║       --v3-user admin                                            ║
║       --v3-auth-key myAuthPassphrase                             ║
║       --v3-priv-key myPrivPassphrase                             ║
║                                                                  ║
║  PROGRAMMATIC USE:                                               ║
║  from snmp_scanner_all_in_one import scan_network, ScanConfig   ║
║  result = asyncio.run(scan_network("192.168.1.0/24"))            ║
╚══════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

# ── stdlib ──────────────────────────────────────────────────────────────────
import argparse
import asyncio
import json
import logging
import sys
import ipaddress
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

# ── third-party (pip install pysnmp-lextudio) ───────────────────────────────
try:
    from pysnmp.hlapi.asyncio import (
        CommunityData, ContextData, ObjectIdentity, ObjectType,
        SnmpEngine, UdpTransportTarget, UsmUserData,
        get_cmd, next_cmd,
        usmAesCfb128Protocol, usmAesCfb192Protocol, usmAesCfb256Protocol,
        usmDESPrivProtocol, usmHMAC192SHA256AuthProtocol,
        usmHMACMD5AuthProtocol, usmHMACSHAAuthProtocol,
        usmNoAuthProtocol, usmNoPrivProtocol, usm3DESEDEPrivProtocol,
    )
except ImportError:
    print("ERROR: pysnmp-lextudio is not installed.")
    print("  Fix: pip install pysnmp-lextudio")
    sys.exit(1)

logger = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════════════════════
# SECTION 1 — CONSTANTS / OIDs
# ════════════════════════════════════════════════════════════════════════════

SYSTEM_OIDS: Dict[str, str] = {
    "sysDescr":    "1.3.6.1.2.1.1.1.0",
    "sysObjectID": "1.3.6.1.2.1.1.2.0",
    "sysUpTime":   "1.3.6.1.2.1.1.3.0",
    "sysName":     "1.3.6.1.2.1.1.5.0",
    "sysLocation": "1.3.6.1.2.1.1.6.0",
}
ENTITY_SERIAL_OID      = "1.3.6.1.2.1.47.1.1.1.1.11"
LLDP_NEIGHBOR_NAME_OID = "1.0.8802.1.1.2.1.4.1.1.9"

# First match wins — order from most-specific to least-specific
_VENDOR_PATTERNS: List[Tuple[List[str], str]] = [
    (["cisco"],                              "Cisco"),
    (["juniper"],                            "Juniper"),
    (["aruba"],                              "Aruba"),
    (["hp", "hewlett-packard", "hpe"],       "HP"),
    (["ubiquiti", "unifi", "uap"],           "Ubiquiti"),
    (["mikrotik", "routeros"],               "MikroTik"),
    (["palo alto", "panos"],                 "Palo Alto"),
    (["fortinet", "fortigate"],              "Fortinet"),
    (["checkpoint", "check point"],          "Check Point"),
    (["sonicwall"],                          "SonicWall"),
    (["watchguard"],                         "WatchGuard"),
    (["sophos"],                             "Sophos"),
    (["dell"],                               "Dell"),
    (["brother"],                            "Brother"),
    (["canon"],                              "Canon"),
    (["epson"],                              "Epson"),
    (["xerox"],                              "Xerox"),
    (["vmware", "esxi"],                     "VMware"),
]

_TYPE_PATTERNS: List[Tuple[List[str], str]] = [
    (["firewall", "asa", "sonicwall", "watchguard",
      "palo alto", "security appliance", "checkpoint",
      "fortigate"],                           "Firewall"),
    (["printer", "laserjet", "designjet",
      "copier", "mfp", "imagerunner"],        "Printer"),
    (["switch", "catalyst", "edgeos",
      "procurve", "powerconnect"],            "Switch"),
    (["router", "gateway", "routeros"],       "Router"),
    (["ap", "access point", "wireless",
      "wifi", "wlan", "unifi"],               "Access Point"),
    (["server", "esxi", "linux",
      "windows server", "vmware"],            "Server"),
]


# ════════════════════════════════════════════════════════════════════════════
# SECTION 2 — CONFIG
# ════════════════════════════════════════════════════════════════════════════

class AuthProtocol(str, Enum):
    NONE   = "NONE"
    MD5    = "MD5"
    SHA    = "SHA"
    SHA256 = "SHA256"


class PrivProtocol(str, Enum):
    NONE      = "NONE"
    DES       = "DES"
    THREE_DES = "3DES"
    AES       = "AES"
    AES128    = "AES128"
    AES192    = "AES192"
    AES256    = "AES256"


@dataclass
class SNMPv3Credentials:
    """All SNMPv3/USM authentication parameters."""
    username:      str
    auth_key:      Optional[str]     = None
    priv_key:      Optional[str]     = None
    auth_protocol: AuthProtocol      = AuthProtocol.SHA
    priv_protocol: PrivProtocol      = PrivProtocol.AES

    def __post_init__(self) -> None:
        if not self.username.strip():
            raise ValueError("SNMPv3 username must not be empty")
        if self.priv_key and not self.auth_key:
            raise ValueError("Privacy key requires an auth key")


@dataclass
class ScanConfig:
    """All tunable parameters for one scan run."""
    communities:    List[str]               = field(default_factory=lambda: ["public"])
    port:           int                     = 161
    timeout:        float                   = 5.0
    retries:        int                     = 1
    max_concurrent: int                     = 50
    v3:             Optional[SNMPv3Credentials] = None
    context_name:   str                     = ""
    max_hosts:      int                     = 65_536    # refuse /8 by default

    def __post_init__(self) -> None:
        try:
            self.port = int(self.port)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid port: {self.port}")

        if not 1 <= self.port <= 65_535:
            raise ValueError(f"port must be 1–65535, got {self.port}")
        if self.timeout <= 0:
            raise ValueError("timeout must be > 0")
        if self.max_concurrent < 1:
            raise ValueError("max_concurrent must be >= 1")
        if not self.communities and self.v3 is None:
            raise ValueError("Provide at least one community string or v3 credentials")


# ════════════════════════════════════════════════════════════════════════════
# SECTION 3 — MODELS
# ════════════════════════════════════════════════════════════════════════════

@dataclass
class NeighborInfo:
    neighbor_name: str
    neighbor_port: Optional[str] = None

    def to_dict(self) -> Dict[str, Optional[str]]:
        return {"neighbor_name": self.neighbor_name, "neighbor_port": self.neighbor_port}


@dataclass
class DeviceInfo:
    ip_address:    str
    name:          str
    device_type:   str
    vendor:        str
    model:         str
    serial_number: Optional[str]
    description:   str
    location:      str
    uptime:        str
    snmp_version:  str
    neighbors:     List[NeighborInfo] = field(default_factory=list)
    discovered_at: datetime           = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name":          self.name,
            "type":          self.device_type,
            "vendor":        self.vendor,
            "model":         self.model,
            "serial_number": self.serial_number,
            "ip_address":    self.ip_address,
            "specifications": {
                "Description":    self.description,
                "Location":       self.location,
                "Uptime":         self.uptime,
                "Serial Method":  "Entity MIB" if self.serial_number else "Not Available",
                "Discovery":      f"Agentless SNMP ({self.snmp_version})",
            },
            "neighbors":     [n.to_dict() for n in self.neighbors],
            "discovered_at": self.discovered_at.isoformat(),
        }


@dataclass
class ScanResult:
    cidr:               str
    total_hosts:        int
    responsive_devices: int
    devices:            List[DeviceInfo]
    started_at:         datetime
    completed_at:       Optional[datetime] = None

    @property
    def duration_seconds(self) -> Optional[float]:
        if self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cidr":               self.cidr,
            "total_hosts":        self.total_hosts,
            "responsive_devices": self.responsive_devices,
            "duration_seconds":   self.duration_seconds,
            "started_at":         self.started_at.isoformat(),
            "completed_at":       self.completed_at.isoformat() if self.completed_at else None,
            "devices":            [d.to_dict() for d in self.devices],
        }


# ════════════════════════════════════════════════════════════════════════════
# SECTION 4 — SNMP SCANNER (all bugs fixed here)
# ════════════════════════════════════════════════════════════════════════════

# pysnmp protocol lookup tables
_AUTH_PROTO_MAP = {
    AuthProtocol.NONE:   usmNoAuthProtocol,
    AuthProtocol.MD5:    usmHMACMD5AuthProtocol,
    AuthProtocol.SHA:    usmHMACSHAAuthProtocol,
    AuthProtocol.SHA256: usmHMAC192SHA256AuthProtocol,
}
_PRIV_PROTO_MAP = {
    PrivProtocol.NONE:      usmNoPrivProtocol,
    PrivProtocol.DES:       usmDESPrivProtocol,
    PrivProtocol.THREE_DES: usm3DESEDEPrivProtocol,
    PrivProtocol.AES:       usmAesCfb128Protocol,
    PrivProtocol.AES128:    usmAesCfb128Protocol,
    PrivProtocol.AES192:    usmAesCfb192Protocol,
    PrivProtocol.AES256:    usmAesCfb256Protocol,
}

_MAX_SERIAL_ROWS   = 50
_MAX_NEIGHBOR_ROWS = 20


class SNMPScanner:
    """
    Polls one IP at a time.  One SnmpEngine is reused across all calls.
    Do NOT share a single instance across multiple threads.
    """

    def __init__(self, config: ScanConfig) -> None:
        self.config  = config
        self._engine = SnmpEngine()          # reused — safe for asyncio concurrency

    # ── Internal helpers ─────────────────────────────────────────────────────

    def _make_context(self) -> ContextData:
        """
        FIX BUG 3 — ContextData needs bytes, not str.
        Passing a plain str caused silent context mismatch on many pysnmp builds.
        """
        ctx = self.config.context_name
        return ContextData(contextName=ctx.encode("utf-8")) if ctx else ContextData()

    async def _make_transport(self, ip: str) -> UdpTransportTarget:
        """
        FIX BUG 1 — Always use `await UdpTransportTarget.create(...)`.
        The original _get_neighbors called the bare constructor UdpTransportTarget((...))
        which does NOT work with the asyncio HLAPI and causes a crash at runtime.
        """
        return await UdpTransportTarget.create(
            (ip, self.config.port),
            timeout=self.config.timeout,
            retries=self.config.retries,
        )

    # ── Authentication ────────────────────────────────────────────────────────

    async def _probe_community(self, ip: str, community: str) -> Optional[CommunityData]:
        """Try one v2c community string. Returns CommunityData on success, else None."""
        try:
            err_ind, err_status, _, _ = await get_cmd(
                self._engine,
                CommunityData(community),
                await self._make_transport(ip),
                self._make_context(),
                ObjectType(ObjectIdentity(SYSTEM_OIDS["sysDescr"])),
            )
            if not err_ind and not err_status:
                logger.info("[%s] Community '%s' accepted", ip, community)
                return CommunityData(community)
        except Exception as exc:
            logger.debug("[%s] Transport error with community '%s': %s", ip, community, exc)
        return None

    async def _resolve_security(self, ip: str) -> Optional[Any]:
        """Return working credentials or None if all attempts fail."""
        if self.config.v3:
            v3 = self.config.v3
            return UsmUserData(
                v3.username,
                authKey=v3.auth_key or None,
                privKey=v3.priv_key or None,
                authProtocol=_AUTH_PROTO_MAP[v3.auth_protocol],
                privProtocol=_PRIV_PROTO_MAP[v3.priv_protocol],
            )
        for community in self.config.communities:
            sec = await self._probe_community(ip, community)
            if sec:
                return sec
        logger.info("[%s] No working credentials — skipped", ip)
        return None

    # ── OID Queries ───────────────────────────────────────────────────────────

    async def _get_scalar(self, ip: str, security: Any, transport: Optional[UdpTransportTarget], oid: str) -> Optional[str]:
        """Fetch a single scalar OID. Returns the string value or None."""
        try:
            if not transport:
                transport = await self._make_transport(ip)
            err_ind, err_status, _, var_binds = await get_cmd(
                self._engine, security,
                transport,
                self._make_context(),
                ObjectType(ObjectIdentity(oid)),
            )
            if not err_ind and not err_status and var_binds:
                val = var_binds[0][1].prettyPrint()
                return val if val.lower() not in ("none", "") else None
        except Exception as exc:
            logger.debug("[%s] OID %s error: %s", ip, oid, exc)
        return None

    async def _walk_serial(self, ip: str, security: Any, transport: Optional[UdpTransportTarget]) -> Optional[str]:
        """
        Walk entPhysicalSerialNum and return the first valid serial found.

        FIX BUG 2 — The original used `found_valid = True` for BOTH
        "found a serial" AND "left the OID subtree" — two opposite outcomes
        sharing one misleading variable name. Now uses explicit `exit_walk`
        with a comment on each branch so the intent is always clear.
        """
        prefix      = ENTITY_SERIAL_OID
        current_oid = ObjectType(ObjectIdentity(prefix))

        if not transport:
            transport = await self._make_transport(ip)

        for _ in range(_MAX_SERIAL_ROWS):
            try:
                err_ind, err_status, _, var_binds = await next_cmd(
                    self._engine, security,
                    transport,
                    self._make_context(),
                    current_oid,
                    lexicographicMode=False,
                )
            except Exception as exc:
                logger.debug("[%s] Serial walk error: %s", ip, exc)
                return None

            if err_ind or err_status or not var_binds:
                break   # end-of-MIB or agent error — stop walking

            exit_walk = False
            for var_bind in var_binds:
                oid_obj = var_bind[0]
                oid_str = str(oid_obj)
                value   = var_bind[1].prettyPrint()

                # BRANCH A: OID has left our subtree — stop walking entirely
                if not oid_str.startswith(prefix):
                    exit_walk = True
                    break

                # Advance walk pointer for the next loop iteration
                current_oid = ObjectType(ObjectIdentity(oid_obj))

                # BRANCH B: Found a non-empty serial — return it immediately
                if value and value.lower() not in ("none", "") and len(value) > 3:
                    logger.debug("[%s] Serial found: %s", ip, value)
                    return value

                # BRANCH C: Still in subtree but value is empty — keep walking

            if exit_walk:
                break

        return None  # nothing found

    async def _get_neighbors(self, ip: str, security: Any, transport: Optional[UdpTransportTarget]) -> List[NeighborInfo]:
        """
        Walk LLDP lldpRemSysName and return discovered neighbors.

        FIX BUG 1 — Uses `await self._make_transport(ip)` which calls
        `await UdpTransportTarget.create(...)` correctly everywhere.
        """
        neighbors   = []
        prefix      = LLDP_NEIGHBOR_NAME_OID
        current_oid = ObjectType(ObjectIdentity(prefix))

        if not transport:
            transport = await self._make_transport(ip)

        for _ in range(_MAX_NEIGHBOR_ROWS):
            try:
                err_ind, err_status, _, var_binds = await next_cmd(
                    self._engine, security,
                    transport,   # ← BUG 1 FIXED HERE
                    self._make_context(),
                    current_oid,
                    lexicographicMode=False,
                )
            except Exception as exc:
                logger.debug("[%s] LLDP walk error: %s", ip, exc)
                break

            if err_ind or err_status or not var_binds:
                break

            exit_walk = False
            for var_bind in var_binds:
                oid_str = str(var_bind[0])
                name    = var_bind[1].prettyPrint()

                if not oid_str.startswith(prefix):
                    exit_walk = True
                    break

                current_oid = ObjectType(ObjectIdentity(var_bind[0]))
                if name and name.lower() not in ("none", ""):
                    neighbors.append(NeighborInfo(neighbor_name=name))

            if exit_walk:
                break

        return neighbors

    # ── Detection ─────────────────────────────────────────────────────────────

    @staticmethod
    def _detect_vendor(desc: str) -> str:
        d = desc.lower()
        for keywords, vendor in _VENDOR_PATTERNS:
            if any(kw in d for kw in keywords):
                return vendor
        return "Unknown"

    @staticmethod
    def _detect_type(desc: str) -> str:
        d = desc.lower()
        for keywords, dtype in _TYPE_PATTERNS:
            if any(kw in d for kw in keywords):
                return dtype
        return "Networking"

    # ── Public API ────────────────────────────────────────────────────────────

    async def poll_device(self, ip: str) -> Optional[DeviceInfo]:
        """
        Fully poll one IP address. Returns DeviceInfo or None if unreachable.

        Refactored:
          1. Resolve security
          2. Create single transport (reuse for all OIDs)
          3. Sequential sysDescr handshake (stabilizes v3 EngineID discovery)
          4. Parallel fetch for remaining data
        """
        security = await self._resolve_security(ip)
        if security is None:
            return None

        snmp_version = "v3" if self.config.v3 else "v2c"
        
        try:
            transport = await self._make_transport(ip)
        except Exception as e:
            logger.error("[%s] Transport creation failed: %s", ip, e)
            return None

        # Step 3 — Sequential handshake (Crucial for v3 stability)
        # We wait for sysDescr to finish so EngineID discovery is completed
        # before firing parallel requests.
        description = await self._get_scalar(ip, security, transport, SYSTEM_OIDS["sysDescr"])
        
        if not description:
            logger.info("[%s] No sysDescr returned — skipping", ip)
            return None

        # Step 4 — Fetch remaining scalar OIDs + Serial + Neighbors concurrently
        remaining_oids = {k: v for k, v in SYSTEM_OIDS.items() if k != "sysDescr"}
        
        scalar_tasks = {
            name: asyncio.create_task(self._get_scalar(ip, security, transport, oid))
            for name, oid in remaining_oids.items()
        }
        
        serial_task    = asyncio.create_task(self._walk_serial(ip, security, transport))
        neighbor_task  = asyncio.create_task(self._get_neighbors(ip, security, transport))

        raw: Dict[str, str] = {"sysDescr": description}
        for name, task in scalar_tasks.items():
            value = await task
            if value:
                raw[name] = value

        serial    = await serial_task
        neighbors = await neighbor_task

        return DeviceInfo(
            ip_address    = ip,
            name          = raw.get("sysName") or ip,
            device_type   = self._detect_type(description),
            vendor        = self._detect_vendor(description),
            model         = "Network Node",
            serial_number = serial,
            description   = description,
            location      = raw.get("sysLocation", ""),
            uptime        = raw.get("sysUpTime", ""),
            snmp_version  = snmp_version,
            neighbors     = neighbors,
        )


# ════════════════════════════════════════════════════════════════════════════
# SECTION 5 — NETWORK SCAN ENTRY POINTS
# ════════════════════════════════════════════════════════════════════════════

def _validate_network(cidr: str, max_hosts: int) -> ipaddress.IPv4Network:
    """
    Parse and validate CIDR.

    FIX BUG 4 — The original had NO size guard. A /8 would schedule
    16 million asyncio tasks before any of them ran, exhausting memory.
    Now raises ValueError if the range exceeds max_hosts.
    """
    try:
        network = ipaddress.ip_network(cidr, strict=False)
    except ValueError as exc:
        raise ValueError(f"Invalid CIDR '{cidr}': {exc}") from exc

    host_count = sum(1 for _ in network.hosts())
    if host_count == 0:
        raise ValueError(f"Network {cidr} has no scannable hosts")
    if host_count > max_hosts:
        raise ValueError(
            f"{cidr} has {host_count:,} hosts — exceeds max_hosts={max_hosts:,}. "
            "Tighten the range or raise ScanConfig.max_hosts."
        )
    return network  # type: ignore[return-value]


async def scan_network(
    cidr: str, 
    config: Optional[ScanConfig] = None,
    progress_cb: Optional[Callable[[], Awaitable[None]]] = None
) -> ScanResult:
    """
    Scan a CIDR range and return a ScanResult when complete.

    Example:
        result = asyncio.run(scan_network("192.168.1.0/24"))
        for d in result.devices:
            print(d.ip_address, d.vendor)
    """
    if config is None:
        config = ScanConfig()

    network    = _validate_network(cidr, config.max_hosts)
    hosts      = [str(ip) for ip in network.hosts()]
    started_at = datetime.utcnow()

    logger.info("Scanning %s — %d hosts, max_concurrent=%d", network, len(hosts), config.max_concurrent)

    scanner   = SNMPScanner(config)
    semaphore = asyncio.Semaphore(config.max_concurrent)

    async def _bounded(ip: str) -> Optional[DeviceInfo]:
        async with semaphore:
            result = await scanner.poll_device(ip)
            if progress_cb:
                try:
                    await progress_cb()
                except Exception:
                    pass # Ignore callback errors
            return result

    raw_results  = await asyncio.gather(*(_bounded(ip) for ip in hosts))
    devices      = [r for r in raw_results if r is not None]
    completed_at = datetime.utcnow()

    logger.info("Done — %d/%d responded in %.1fs",
                len(devices), len(hosts),
                (completed_at - started_at).total_seconds())

    return ScanResult(
        cidr               = str(network),
        total_hosts        = len(hosts),
        responsive_devices = len(devices),
        devices            = devices,
        started_at         = started_at,
        completed_at       = completed_at,
    )


async def scan_network_streaming(
    cidr: str, config: Optional[ScanConfig] = None
) -> AsyncIterator[DeviceInfo]:
    """
    Yield each DeviceInfo as soon as it is discovered (don't wait for full scan).

    Example:
        async for device in scan_network_streaming("192.168.1.0/24"):
            print(f"Found: {device.ip_address} ({device.vendor})")
    """
    if config is None:
        config = ScanConfig()

    network   = _validate_network(cidr, config.max_hosts)
    hosts     = [str(ip) for ip in network.hosts()]
    scanner   = SNMPScanner(config)
    semaphore = asyncio.Semaphore(config.max_concurrent)
    queue: asyncio.Queue[Optional[DeviceInfo]] = asyncio.Queue()

    async def _worker(ip: str) -> None:
        async with semaphore:
            result = await scanner.poll_device(ip)
        await queue.put(result)

    tasks = [asyncio.create_task(_worker(ip)) for ip in hosts]

    completed = 0
    while completed < len(hosts):
        item = await queue.get()
        completed += 1
        if item is not None:
            yield item

    await asyncio.gather(*tasks)


# ════════════════════════════════════════════════════════════════════════════
# SECTION 6 — CLI
# ════════════════════════════════════════════════════════════════════════════

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="snmp_scanner_all_in_one.py",
        description="Async SNMP network asset discovery scanner",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("cidr", help="Network to scan e.g. 192.168.1.0/24")
    p.add_argument("--communities",    default="public",  help="Comma-separated v2c community strings")
    p.add_argument("--port",           type=int,   default=161)
    p.add_argument("--timeout",        type=float, default=5.0,    help="Seconds per request")
    p.add_argument("--retries",        type=int,   default=1)
    p.add_argument("--max-concurrent", type=int,   default=50,     help="Max parallel SNMP queries")
    p.add_argument("--max-hosts",      type=int,   default=65_536, help="Safety limit on range size")
    p.add_argument("--context-name",   default="",                 help="SNMP context (v3 VRF)")
    p.add_argument("--output",         choices=["json", "table"],  default="json")
    p.add_argument("--verbose", "-v",  action="store_true",        help="Debug logging")

    v3 = p.add_argument_group("SNMPv3 (used instead of communities when --v3-user is set)")
    v3.add_argument("--v3-user",        default=None)
    v3.add_argument("--v3-auth-key",    default=None)
    v3.add_argument("--v3-priv-key",    default=None)
    v3.add_argument("--v3-auth-proto",  default="SHA",  choices=[a.value for a in AuthProtocol])
    v3.add_argument("--v3-priv-proto",  default="AES",  choices=[p.value for p in PrivProtocol])
    return p


def _print_table(result: ScanResult) -> None:
    W = {"IP": 18, "Name": 28, "Vendor": 15, "Type": 16, "Serial": 20}
    hdr = "  ".join(k.ljust(v) for k, v in W.items())
    sep = "  ".join("─" * v for v in W.values())
    print(f"\n{hdr}\n{sep}")
    for d in result.devices:
        print("  ".join([
            d.ip_address.ljust(W["IP"]),
            (d.name or "")[:W["Name"]].ljust(W["Name"]),
            d.vendor.ljust(W["Vendor"]),
            d.device_type.ljust(W["Type"]),
            (d.serial_number or "—").ljust(W["Serial"]),
        ]))
    print(f"\n✓ {result.responsive_devices} device(s) found in "
          f"{result.duration_seconds:.1f}s  ({result.total_hosts} hosts scanned)")


async def _cli_main() -> int:
    parser = _build_parser()
    args   = parser.parse_args()

    # Logging setup
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        format="%(asctime)s [%(levelname)-8s] %(message)s",
        datefmt="%H:%M:%S", level=level, stream=sys.stderr,
    )
    if not args.verbose:
        logging.getLogger("pysnmp").setLevel(logging.WARNING)

    # Build config
    v3_creds = None
    if args.v3_user:
        try:
            v3_creds = SNMPv3Credentials(
                username      = args.v3_user,
                auth_key      = args.v3_auth_key,
                priv_key      = args.v3_priv_key,
                auth_protocol = AuthProtocol(args.v3_auth_proto),
                priv_protocol = PrivProtocol(args.v3_priv_proto),
            )
        except ValueError as e:
            print(f"v3 config error: {e}", file=sys.stderr)
            return 2

    try:
        config = ScanConfig(
            communities    = [c.strip() for c in args.communities.split(",") if c.strip()],
            port           = args.port,
            timeout        = args.timeout,
            retries        = args.retries,
            max_concurrent = args.max_concurrent,
            v3             = v3_creds,
            context_name   = args.context_name,
            max_hosts      = args.max_hosts,
        )
    except ValueError as e:
        print(f"Config error: {e}", file=sys.stderr)
        return 2

    # Run scan
    try:
        result = await scan_network(args.cidr, config)
    except ValueError as e:
        print(f"Scan error: {e}", file=sys.stderr)
        return 1

    # Output
    if args.output == "json":
        print(json.dumps(result.to_dict(), indent=2, default=str))
    else:
        _print_table(result)

    return 0



# ════════════════════════════════════════════════════════════════════════════
# SECTION 7 — COMPATIBILITY WRAPPER FOR LEGACY CALLERS
# ════════════════════════════════════════════════════════════════════════════

async def scan_network_range(
    cidr: str, 
    community: str = "public", 
    v3_data: Optional[Dict[str, Any]] = None, 
    context_name: str = "",
    progress_cb: Optional[Callable[[], Awaitable[None]]] = None
) -> List[Dict[str, Any]]:
    """
    Compatibility wrapper for existing callers (collect.py, snmp_scanner.py).
    Maps old positional arguments to the new ScanConfig/SNMPScanner architecture.
    
    Returns: List of device dictionaries (legacy format)
    """
    v3_creds = None
    if v3_data:
        try:
            v3_creds = SNMPv3Credentials(
                username=v3_data.get('username', 'user'),
                auth_key=v3_data.get('authKey'),
                priv_key=v3_data.get('privKey'),
                auth_protocol=AuthProtocol(v3_data.get('authProtocol', 'SHA')),
                priv_protocol=PrivProtocol(v3_data.get('privProtocol', 'AES'))
            )
        except ValueError as e:
            logger.error(f"Invalid v3 credentials: {e}")
            return []
    
    config = ScanConfig(
        communities=[c.strip() for c in community.split(",")] if "," in community else [community],
        v3=v3_creds,
        context_name=context_name
    )
    
    try:
        result = await scan_network(cidr, config, progress_cb=progress_cb)
        return [d.to_dict() for d in result.devices]
    except ValueError as e:
        logger.error(f"Scan failed: {e}")
        return []


if __name__ == "__main__":
    sys.exit(asyncio.run(_cli_main()))