import platform
import socket
import uuid
import json
import http.client
import subprocess
import os
import sys
import logging
import time
import hmac
import hashlib
import ssl
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Set, Tuple
from dotenv import load_dotenv

# ── Environment & Logging ─────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger("local_discovery_agent")

# ── Configuration Management ─────────────────────────────────────────────────
@dataclass
class AgentConfig:
    """Centralized configuration for the local discovery agent."""
    backend_url: str
    agent_secret: str
    agent_id: str
    ssl_verify: bool = True
    http_timeout: int = 15
    config_file: str = "agent_config.json"

    @classmethod
    def from_env(cls) -> "AgentConfig":
        """Load configuration from environment variables and local cache."""
        backend_url = os.getenv("BACKEND_URL", "127.0.0.1:8000").replace("https://", "").replace("http://", "").rstrip("/")
        agent_secret = os.getenv("AGENT_SECRET", "agent_secret_key_2026")
        
        # Load or generate persistent Agent ID
        config_file = "agent_config.json"
        agent_id = None
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    agent_id = json.load(f).get("agent_id")
            except: pass
            
        if not agent_id:
            agent_id = os.getenv("LOCAL_AGENT_ID", str(uuid.uuid4()))
            try:
                with open(config_file, 'w') as f:
                    json.dump({"agent_id": agent_id}, f)
            except: pass

        return cls(
            backend_url=backend_url,
            agent_secret=agent_secret,
            agent_id=agent_id,
            ssl_verify=os.getenv("BACKEND_SSL_VERIFY", "true").lower() != "false",
            http_timeout=int(os.getenv("HTTP_TIMEOUT", "15")),
        )

# ── Metrics Collection ───────────────────────────────────────────────────────
@dataclass
class DiscoveryMetrics:
    """Track performance and results of the discovery run."""
    start_time: float = field(default_factory=time.time)
    end_time: float = 0.0
    duration: float = 0.0
    software_count: int = 0
    sync_success: bool = False
    error_msg: Optional[str] = None

    def finalize(self):
        self.end_time = time.time()
        self.duration = self.end_time - self.start_time

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["agent_id"] = "agent-local" # Placeholder for reporting
        return data

# ── Hardware/Software Discovery ─────────────────────────────────────────────
def get_hardware_info() -> Dict[str, Any]:
    """Gather hardware specifications from the local host."""
    hardware = {
        "cpu": platform.processor(),
        "ram_mb": 0,
        "serial": "UNKNOWN",
        "model": "UNKNOWN",
        "vendor": "UNKNOWN",
        "storage_gb": 0,
        "condition": "Excellent",
        "type": "Desktop",
        "ad_user": "Unknown",
        "ad_domain": "LOCAL"
    }
    
    try:
        if platform.system() == "Windows":
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                           ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                           ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                           ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                           ("sullAvailExtendedVirtual", ctypes.c_ulonglong)]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(stat)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            hardware["ram_mb"] = stat.ullTotalPhys // (1024 * 1024)
            
            def get_wmic_dict(cmd):
                try:
                    out = subprocess.check_output(cmd, shell=True).decode().strip().split('\r\r\n')
                    return {k.strip(): v.strip() for line in out if '=' in line for k, v in [line.split('=', 1)]}
                except: return {}

            csproduct = get_wmic_dict("wmic csproduct get name, vendor /format:list")
            hardware["model"] = csproduct.get("Name", "Unknown")
            hardware["vendor"] = csproduct.get("Vendor", "Unknown")
            
            bios = get_wmic_dict("wmic bios get serialnumber /format:list")
            hardware["serial"] = bios.get("SerialNumber", "NOT_FOUND")

            chassis = get_wmic_dict("wmic systemenclosure get chassistypes /format:list")
            ct = chassis.get("ChassisTypes", "")
            if any(t in ct for t in ["8", "9", "10", "11", "12", "14"]): hardware["type"] = "Laptop"
            elif any(t in ct for t in ["23", "28"]): hardware["type"] = "Server"

            disk = get_wmic_dict("wmic logicaldisk where \"DeviceID='C:'\" get size /format:list")
            if disk.get("Size"): hardware["storage_gb"] = int(disk["Size"]) // (1024**3)
            
            health = get_wmic_dict("wmic diskdrive get status /format:list")
            hardware["condition"] = "Excellent" if health.get("Status") == "OK" else "Fair"
            
            try:
                hardware["ad_user"] = subprocess.check_output("whoami", shell=True).decode().strip()
                domain_info = get_wmic_dict("wmic computersystem get domain /format:list")
                hardware["ad_domain"] = domain_info.get("Domain", "WORKGROUP")
            except:
                hardware["ad_user"] = os.getenv("USERNAME", "Unknown")
                hardware["ad_domain"] = os.getenv("USERDOMAIN", "LOCAL")
        else:
            # Linux logic
            try:
                with open('/proc/meminfo', 'r') as f:
                    for line in f:
                        if "MemTotal" in line:
                            hardware["ram_mb"] = int(line.split()[1]) // 1024
                            break
                st = os.statvfs('/')
                hardware["storage_gb"] = (st.f_blocks * st.f_frsize) // (1024**3)
            except: pass
            
            def read_sysfs(path):
                try:
                    with open(path, 'r') as f: return f.read().strip()
                except: return "UNKNOWN"
            hardware["model"], hardware["vendor"], hardware["serial"] = (
                read_sysfs("/sys/class/dmi/id/product_name"),
                read_sysfs("/sys/class/dmi/id/sys_vendor"),
                read_sysfs("/sys/class/dmi/id/product_serial")
            )
            hardware["ad_user"] = os.getenv("USER", "Unknown")
            hardware["ad_domain"] = socket.getfqdn().split('.', 1)[-1] if '.' in socket.getfqdn() else "LOCAL"
            chassis_type = read_sysfs("/sys/class/dmi/id/chassis_type")
            if chassis_type in ["8", "9", "10"]: hardware["type"] = "Laptop"
            elif chassis_type in ["23"]: hardware["type"] = "Server"

    except Exception as e:
        logger.error(f"Hardware discovery failed: {e}")
    return hardware

def get_software_info() -> List[Dict[str, str]]:
    """Gather installed software list from the local machine."""
    software_list = []
    try:
        if platform.system() == "Windows":
            keys = [r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                    r"HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"]
            for key in keys:
                try:
                    subkeys = subprocess.check_output(f'reg query "{key}"', shell=True).decode().split('\r\n')
                    for subkey in subkeys:
                        if not subkey.strip(): continue
                        try:
                            details = subprocess.check_output(f'reg query "{subkey}"', shell=True).decode().split('\r\n')
                            soft = {"name": "", "version": "Unknown", "vendor": "Unknown"}
                            for line in details:
                                if "DisplayName" in line: soft["name"] = line.split("REG_SZ")[-1].strip()
                                elif "DisplayVersion" in line: soft["version"] = line.split("REG_SZ")[-1].strip()
                                elif "Publisher" in line: soft["vendor"] = line.split("REG_SZ")[-1].strip()
                            if soft["name"]: software_list.append(soft)
                        except: continue
                except: continue
        else:
            # Linux
            try:
                out = subprocess.check_output("dpkg-query -W -f='${Package}|${Version}|${Maintainer}\n'", shell=True).decode().split('\n')
                software_list = [{"name": p[0], "version": p[1], "vendor": p[2] if len(p)>2 else "Unknown"} 
                                for line in out if '|' in line for p in [line.split('|')]]
            except:
                try:
                    out = subprocess.check_output("rpm -qa --queryformat '%{NAME}|%{VERSION}|%{VENDOR}\n'", shell=True).decode().split('\n')
                    software_list = [{"name": p[0], "version": p[1], "vendor": p[2] if len(p)>2 else "Unknown"} 
                                    for line in out if '|' in line for p in [line.split('|')]]
                except: pass
    except Exception as e:
        logger.error(f"Software discovery failed: {e}")
    return software_list


def get_all_primary_ips_with_names() -> List[Tuple[str, str]]:
    """
    Get all connected IPv4 addresses with adapter/interface names.
    Returns list of (adapter_name, ip). Physical adapters first, then virtual.
    Skips loopback (127.x). On Windows skips disconnected adapters.
    """
    try:
        if platform.system() == "Windows":
            out = subprocess.check_output("ipconfig", shell=True).decode(errors="replace")
            current_name = ""
            current_connected = True
            current_ips: List[str] = []
            physical: List[Tuple[str, str]] = []
            virtual: List[Tuple[str, str]] = []
            seen: Set[str] = set()

            def flush_adapter() -> None:
                for ip in current_ips:
                    if ip in seen or ip.startswith("127."):
                        continue
                    seen.add(ip)
                    name = current_name or "Unknown"
                    entry = (name, ip)
                    if ip.startswith("192.168.41.") or ip.startswith("192.168.21."):
                        virtual.append(entry)
                    else:
                        physical.append(entry)

            for line in out.splitlines():
                line_stripped = line.strip()
                line_lower = line_stripped.lower()
                if "media state" in line_lower and "disconnected" in line_lower:
                    current_connected = False
                if "adapter" in line_lower and ":" in line_stripped:
                    if current_connected:
                        flush_adapter()
                    current_ips = []
                    current_connected = True
                    # e.g. "Ethernet adapter Ethernet 2:" -> "Ethernet 2"
                    idx = line_lower.find("adapter ")
                    if idx >= 0:
                        name_part = line_stripped[idx + len("adapter "):].rstrip(":")
                        current_name = name_part.strip() if name_part else "Unknown"
                    else:
                        current_name = "Unknown"
                if "ipv4 address" in line_lower and ":" in line_stripped:
                    parts = line_stripped.split(":", 1)
                    if len(parts) == 2:
                        ip = parts[1].strip().split("%")[0].strip()
                        if ip and len(ip.split(".")) == 4:
                            try:
                                octets = [int(x) for x in ip.split(".")]
                                if all(0 <= o <= 255 for o in octets):
                                    current_ips.append(ip)
                            except ValueError:
                                pass
            if current_connected:
                flush_adapter()

            return physical + virtual

        # Linux: collect interface name + IP from "ip -4 addr show"
        try:
            out = subprocess.check_output(
                ["ip", "-4", "addr", "show"], stderr=subprocess.DEVNULL
            ).decode(errors="replace")
        except (FileNotFoundError, subprocess.CalledProcessError):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                    s.connect(("8.8.8.8", 80))
                    return [("default", s.getsockname()[0])]
            except OSError:
                return []
        result: List[Tuple[str, str]] = []
        current_iface = ""
        seen_linux: Set[str] = set()
        for line in out.splitlines():
            line = line.strip()
            if line and line[0].isdigit() and ":" in line:
                # e.g. "2: eth0: <BROADCAST,...>"
                current_iface = line.split(":", 2)[1].strip()
            if line.startswith("inet "):
                parts = line.split(None, 2)
                if len(parts) >= 2:
                    addr = parts[1].split("/")[0]
                    if addr and not addr.startswith("127.") and addr not in seen_linux:
                        seen_linux.add(addr)
                        result.append((current_iface or "unknown", addr))
        return result
    except Exception as e:
        logger.debug(f"Primary IP detection failed: {e}")
    fallback = socket.gethostbyname(socket.gethostname())
    if fallback and not fallback.startswith("127."):
        return [("default", fallback)]
    return []

# ── Backend Communication ───────────────────────────────────────────────────
def send_to_backend(endpoint: str, payload: Dict[str, Any], config: AgentConfig) -> bool:
    """Send data to backend with modern HMAC authentication."""
    try:
        timestamp = datetime.now(timezone.utc).isoformat()
        message = f"{config.agent_id}:{timestamp}"
        signature = hmac.new(config.agent_secret.encode(), message.encode(), hashlib.sha256).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "X-Agent-ID": config.agent_id,
            "X-Agent-Timestamp": timestamp,
            "X-Agent-Signature": signature
        }

        conn = http.client.HTTPConnection(config.backend_url, timeout=config.http_timeout)
        conn.request("POST", f"/api/v1/collect{endpoint}", body=json.dumps(payload), headers=headers)
        response = conn.getresponse()
        data = json.loads(response.read().decode())
        
        if response.status == 200 and data.get("status") == "success":
            logger.info(f"✓ Data successfully sent to {endpoint}")
            return True
        else:
            logger.error(f"✗ Backend rejected data ({response.status}): {data.get('detail', 'Unknown error')}")
            return False
    except Exception as e:
        logger.error(f"Communication error: {e}")
        return False

# ── Main Execution ──────────────────────────────────────────────────────────
def main():
    config = AgentConfig.from_env()
    metrics = DiscoveryMetrics()

    ips_with_names = get_all_primary_ips_with_names()
    ip_address_str = "; ".join(f"{name}: {ip}" for name, ip in ips_with_names) if ips_with_names else socket.gethostbyname(socket.gethostname())
    logger.info(f"Starting discovery sweep for {socket.gethostname()} (IPs: {ip_address_str})")

    hardware = get_hardware_info()
    software = get_software_info()
    metrics.software_count = len(software)

    payload = {
        "agent_id": config.agent_id,
        "hostname": socket.gethostname(),
        "ip_address": ip_address_str,
        "hardware": hardware,
        "os": {
            "name": platform.system(),
            "version": platform.release(),
            "uptime_sec": int(time.time())  # Simplified
        },
        "software": software[:500],  # Limit payload
        "metadata": {"collector_version": "2.0.0-prod"}
    }

    metrics.sync_success = send_to_backend("", payload, config)

    metrics.finalize()
    send_to_backend("/metrics", metrics.to_dict(), config)

    logger.info("="*40)
    logger.info(f"Discovery Summary:")
    logger.info(f"  Duration: {metrics.duration:.2f}s")
    logger.info(f"  Software Found: {metrics.software_count}")
    logger.info(f"  Sync Status: {'✓' if metrics.sync_success else '✗'}")
    logger.info("="*40)

if __name__ == "__main__":
    main()
