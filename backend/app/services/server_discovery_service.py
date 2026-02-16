import logging
import uuid
import json
import socket
from datetime import datetime
from typing import List, Dict, Any, Optional
import asyncio

# Setup logging
logger = logging.getLogger(__name__)

# Try importing client libraries (graceful fallback if not installed yet)
try:
    import paramiko
    PARAMIKO_AVAILABLE = True
except ImportError:
    PARAMIKO_AVAILABLE = False
    logger.warning("paramiko not found. Linux discovery disabled.")

try:
    import winrm
    WINRM_AVAILABLE = True
except ImportError:
    WINRM_AVAILABLE = False
    logger.warning("pywinrm not found. Windows discovery disabled.")

from ..schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS, DiscoverySoftware

class ServerDiscoveryService:
    """
    Service to perform Agentless Discovery on Servers via SSH (Linux) or WinRM (Windows).
    Functionally equivalent to running the local 'discovery_agent.py' remotely.
    """

    async def discover_server(self, ip: str, os_type: str, credentials: Dict[str, str]) -> Dict[str, Any]:
        """
        Main entry point for server discovery.
        """
        if os_type.lower() == "linux":
            if not PARAMIKO_AVAILABLE:
                raise ImportError("Paramiko library is required for Linux discovery")
            return await self._discover_linux_ssh(ip, credentials)
        elif os_type.lower() == "windows":
            if not WINRM_AVAILABLE:
                raise ImportError("PyWinRM library is required for Windows discovery")
            return await self._discover_windows_winrm(ip, credentials)
        else:
            raise ValueError(f"Unsupported OS type: {os_type}")

    async def _discover_linux_ssh(self, ip: str, creds: Dict[str, str]) -> Dict[str, Any]:
        """
        Connect via SSH and run commands to gather data.
        """
        logger.info(f"Starting SSH discovery on {ip}...")

        username = creds.get("username")
        password = creds.get("password")
        key = creds.get("private_key")
        port = int(creds.get("port", 22))

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        try:
            # Connect
            connect_kwargs = {"hostname": ip, "username": username, "port": port, "timeout": 10}
            if password:
                connect_kwargs["password"] = password
            if key:
                from io import StringIO
                pkey = paramiko.RSAKey.from_private_key(StringIO(key))
                connect_kwargs["pkey"] = pkey

            # Paramiko connect is blocking, run in thread
            await asyncio.to_thread(client.connect, **connect_kwargs)

            # --- Gather Data ---
            data = {}

            # 1. Hostname
            data["hostname"] = (await self._ssh_exec(client, "hostname")).strip()

            # 2. OS Details
            os_release = await self._ssh_exec(client, "cat /etc/os-release")
            data["os_name"] = "Linux"
            data["os_version"] = "Unknown"
            for line in os_release.split("\n"):
                if line.startswith("PRETTY_NAME="):
                    data["os_name"] = line.split("=")[1].strip('"')
                elif line.startswith("VERSION_ID="):
                    data["os_version"] = line.split("=")[1].strip('"')

            # 3. Hardware (CPU/RAM)
            cpu_info = await self._ssh_exec(client, "lscpu")
            data["cpu"] = "Unknown CPU"
            for line in cpu_info.split("\n"):
                if "Model name:" in line:
                    data["cpu"] = line.split(":")[1].strip()

            mem_info = await self._ssh_exec(client, "cat /proc/meminfo")
            data["ram_mb"] = 0
            for line in mem_info.split("\n"):
                if "MemTotal:" in line:
                    # kb to mb
                    data["ram_mb"] = int(line.split()[1]) // 1024

            # 4. Serial/Model (Requires root usually, try sysfs)
            data["serial"] = (await self._ssh_exec(client, "cat /sys/class/dmi/id/product_serial")).strip() or "UNKNOWN"
            data["model"] = (await self._ssh_exec(client, "cat /sys/class/dmi/id/product_name")).strip() or "Generic Linux System"
            data["vendor"] = (await self._ssh_exec(client, "cat /sys/class/dmi/id/sys_vendor")).strip() or "Unknown Vendor"

            # 5. Storage (df / lsblk)
            try:
                df_out = await self._ssh_exec(client, "df -B1 --total | tail -n 1")
                parts = df_out.split()
                # Typical format: Filesystem Size Used Avail Use% Mounted_on
                if len(parts) >= 2:
                    size_str = parts[1]
                    if size_str.isdigit():
                        total_bytes = int(size_str)
                        data["storage_gb"] = total_bytes // (1024 * 1024 * 1024)
            except Exception as e:
                logger.warning(f"Failed to collect storage summary on {ip}: {e}")

            # Detailed disk/mount info (best-effort)
            try:
                # Prefer JSON output when available
                lsblk_out = await self._ssh_exec(client, "lsblk -b -o NAME,SIZE,TYPE,MOUNTPOINT -J")
                disks_json = json.loads(lsblk_out)
                disks: List[Dict[str, Any]] = []
                for block in disks_json.get("blockdevices", []):
                    if block.get("type") == "disk":
                        disks.append(
                            {
                                "name": block.get("name"),
                                "size_bytes": int(block.get("size")) if block.get("size") else None,
                                "mountpoint": block.get("mountpoint"),
                            }
                        )
                if disks:
                    data["disks"] = disks
            except Exception:
                # Fallback to plain-text parsing
                try:
                    lsblk_out = await self._ssh_exec(client, "lsblk -b -o NAME,SIZE,TYPE,MOUNTPOINT")
                    lines = lsblk_out.splitlines()
                    disks: List[Dict[str, Any]] = []
                    for line in lines[1:]:
                        parts = line.split()
                        if len(parts) >= 3:
                            name, size_str, dev_type = parts[:3]
                            mountpoint = parts[3] if len(parts) >= 4 else ""
                            if dev_type == "disk":
                                disks.append(
                                    {
                                        "name": name,
                                        "size_bytes": int(size_str) if size_str.isdigit() else None,
                                        "mountpoint": mountpoint,
                                    }
                                )
                    if disks:
                        data["disks"] = disks
                except Exception as e2:
                    logger.warning(f"Failed to collect disk detail on {ip}: {e2}")

            # 6. Network interfaces (ip addr)
            try:
                ip_out = await self._ssh_exec(client, "ip -j addr")
                net_info_raw = json.loads(ip_out)
                network: List[Dict[str, Any]] = []
                for iface in net_info_raw:
                    ifname = iface.get("ifname")
                    mac = iface.get("address")
                    for addr in iface.get("addr_info", []):
                        ip_addr = addr.get("local")
                        if ip_addr:
                            network.append(
                                {
                                    "interface": ifname,
                                    "mac": mac,
                                    "ip": ip_addr,
                                }
                            )
                if network:
                    data["network"] = network
            except Exception as e:
                logger.warning(f"Failed to collect network info on {ip}: {e}")

            # 7. Uptime
            try:
                uptime_out = await self._ssh_exec(client, "cat /proc/uptime")
                first = uptime_out.split()[0]
                data["uptime_sec"] = int(float(first))
            except Exception as e:
                logger.warning(f"Failed to collect uptime on {ip}: {e}")

            # 8. AD / primary user / domain (best-effort heuristics)
            try:
                who_out = await self._ssh_exec(client, "who | head -n 1")
                if who_out:
                    user = who_out.split()[0]
                    if user:
                        data.setdefault("primary_user", user)
                        data.setdefault("ad_user", user)
            except Exception:
                # Non-fatal
                pass

            try:
                realm_out = await self._ssh_exec(client, "realm list | head -n 10")
                domain = None
                for line in realm_out.splitlines():
                    if "realm-name" in line or "domain-name" in line:
                        parts = line.split(":", 1)
                        if len(parts) == 2:
                            domain = parts[1].strip()
                            break
                if domain:
                    data["ad_domain"] = domain
            except Exception:
                # Fall back to LOCAL later in _build_payload
                pass

            # 9. Software (dpkg or rpm)
            software = []
            # Try dpkg
            dpkg_out = await self._ssh_exec(client, "dpkg-query -W -f='${Package}|${Version}|${Maintainer}\n'")
            if dpkg_out and "command not found" not in dpkg_out:
                for line in dpkg_out.split("\n"):
                    if "|" in line:
                        parts = line.split("|")
                        software.append({"name": parts[0], "version": parts[1], "vendor": parts[2]})
            else:
                # Try rpm
                rpm_out = await self._ssh_exec(client, "rpm -qa --queryformat '%{NAME}|%{VERSION}|%{VENDOR}\n'")
                if rpm_out and "command not found" not in rpm_out:
                    for line in rpm_out.split("\n"):
                        if "|" in line:
                            parts = line.split("|")
                            software.append({"name": parts[0], "version": parts[1], "vendor": parts[2]})

            data["software"] = software[:200] # Limit

            return self._build_payload(data, ip)

        except Exception as e:
            logger.error(f"SSH Discovery failed for {ip}: {e}")
            raise
        finally:
            client.close()

    async def _ssh_exec(self, client, cmd: str) -> str:
        stdin, stdout, stderr = await asyncio.to_thread(client.exec_command, cmd)
        return (await asyncio.to_thread(stdout.read)).decode().strip()

    async def _discover_windows_winrm(self, ip: str, creds: Dict[str, str]) -> Dict[str, Any]:
        """
        Connect via WinRM (HTTP/HTTPS) and run PowerShell.
        """
        logger.info(f"Starting WinRM discovery on {ip}...")
        
        username = creds.get("username")
        password = creds.get("password")
        
        # Connection setup
        session = winrm.Session(
            f"http://{ip}:5985/wsman",
            auth=(username, password),
            transport="ntlm",
        )

        try:
            data = {}

            # 1. System Info via WMIC
            # Run multiple wmic commands

            # Serial/Model
            r = await asyncio.to_thread(session.run_cmd, "wmic csproduct get name, vendor, identifyingnumber /format:list")
            wmic_dict = self._parse_wmic(r.std_out.decode())
            data["model"] = wmic_dict.get("Name", "Unknown Device")
            data["vendor"] = wmic_dict.get("Vendor", "Unknown Vendor")
            data["serial"] = wmic_dict.get("IdentifyingNumber", "UNKNOWN")

            # Hostname
            r_host = await asyncio.to_thread(session.run_cmd, "hostname")
            data["hostname"] = r_host.std_out.decode().strip()

            # OS
            r_os = await asyncio.to_thread(session.run_cmd, "wmic os get caption, version /format:list")
            os_dict = self._parse_wmic(r_os.std_out.decode())
            data["os_name"] = os_dict.get("Caption", "Windows")
            data["os_version"] = os_dict.get("Version", "Unknown")

            # CPU/RAM
            r_cpu = await asyncio.to_thread(session.run_cmd, "wmic cpu get name /format:list")
            data["cpu"] = self._parse_wmic(r_cpu.std_out.decode()).get("Name", "Unknown CPU")
            
            r_mem = await asyncio.to_thread(session.run_cmd, "wmic computersystem get totalphysicalmemory /format:list")
            bytes_mem = self._parse_wmic(r_mem.std_out.decode()).get("TotalPhysicalMemory", "0")
            data["ram_mb"] = int(bytes_mem) // (1024 * 1024) if bytes_mem.isdigit() else 0

            # 2. Storage (logical disks)
            try:
                disk_cmd = (
                    'powershell -Command "Get-CimInstance Win32_LogicalDisk | '
                    "Select-Object DeviceID,Size,FreeSpace | ConvertTo-Json -Compress\""
                )
                r_disk = await asyncio.to_thread(session.run_cmd, disk_cmd)
                disk_out = r_disk.std_out.decode().strip()
                disks: List[Dict[str, Any]] = []
                total_bytes = 0
                if disk_out:
                    parsed = json.loads(disk_out)
                    items = parsed if isinstance(parsed, list) else [parsed]
                    for d in items:
                        size = d.get("Size")
                        try:
                            size_int = int(size) if size is not None else 0
                        except ValueError:
                            size_int = 0
                        total_bytes += size_int
                        disks.append(
                            {
                                "device_id": d.get("DeviceID"),
                                "size_bytes": size_int,
                                "free_bytes": int(d.get("FreeSpace") or 0),
                            }
                        )
                if total_bytes:
                    data["storage_gb"] = total_bytes // (1024 * 1024 * 1024)
                if disks:
                    data["disks"] = disks
            except Exception as e:
                logger.warning(f"Failed to collect Windows disk info on {ip}: {e}")

            # 3. Network info
            try:
                net_cmd = (
                    'powershell -Command "Get-CimInstance Win32_NetworkAdapterConfiguration '
                    "-Filter IPEnabled=TRUE | "
                    "Select-Object Description,MACAddress,@{Name='IPAddress';Expression={$_.IPAddress -join ','}} "
                    '| ConvertTo-Json -Compress"'
                )
                r_net = await asyncio.to_thread(session.run_cmd, net_cmd)
                net_out = r_net.std_out.decode().strip()
                if net_out:
                    parsed = json.loads(net_out)
                    items = parsed if isinstance(parsed, list) else [parsed]
                    network: List[Dict[str, Any]] = []
                    for n in items:
                        ips = (n.get("IPAddress") or "").split(",") if n.get("IPAddress") else []
                        for ip_addr in ips:
                            ip_addr = ip_addr.strip()
                            if not ip_addr:
                                continue
                            network.append(
                                {
                                    "interface": n.get("Description"),
                                    "mac": n.get("MACAddress"),
                                    "ip": ip_addr,
                                }
                            )
                    if network:
                        data["network"] = network
            except Exception as e:
                logger.warning(f"Failed to collect Windows network info on {ip}: {e}")

            # 4. Uptime
            try:
                uptime_cmd = (
                    'powershell -Command "'
                    "$os = Get-CimInstance Win32_OperatingSystem; "
                    "([int]((Get-Date) - $os.LastBootUpTime).TotalSeconds)"
                    '"'
                )
                r_up = await asyncio.to_thread(session.run_cmd, uptime_cmd)
                up_out = r_up.std_out.decode().strip()
                if up_out.isdigit():
                    data["uptime_sec"] = int(up_out)
            except Exception as e:
                logger.warning(f"Failed to collect Windows uptime on {ip}: {e}")

            # 5. AD identity / primary user
            try:
                r_whoami = await asyncio.to_thread(session.run_cmd, "whoami")
                who = r_whoami.std_out.decode().strip()
                if who and "\\" in who:
                    domain, user = who.split("\\", 1)
                    data["ad_user"] = user
                    data["primary_user"] = user
                    data["ad_domain"] = domain
                elif who:
                    data["primary_user"] = who
                    data["ad_user"] = who
            except Exception:
                # Non-fatal
                pass

            # 6. Installed software (registry via PowerShell)
            software: List[Dict[str, Any]] = []
            try:
                sw_cmd = (
                    'powershell -Command "'
                    "$paths = @("
                    "'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',"
                    "'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'"
                    "); "
                    "$apps = foreach ($p in $paths) { "
                    "Get-ItemProperty -Path $p -ErrorAction SilentlyContinue | "
                    "Select-Object DisplayName, DisplayVersion, Publisher "
                    "}; "
                    "$apps | Where-Object { $_.DisplayName } | ConvertTo-Json -Compress"
                    '"'
                )
                r_sw = await asyncio.to_thread(session.run_cmd, sw_cmd)
                sw_out = r_sw.std_out.decode().strip()
                if sw_out:
                    parsed = json.loads(sw_out)
                    items = parsed if isinstance(parsed, list) else [parsed]
                    for app in items[:500]:  # Cap to avoid massive payloads
                        name = app.get("DisplayName")
                        if not name:
                            continue
                        software.append(
                            {
                                "name": name,
                                "version": app.get("DisplayVersion") or "Unknown",
                                "vendor": app.get("Publisher") or "Unknown",
                            }
                        )
            except Exception as e:
                logger.warning(f"Failed to collect Windows software inventory on {ip}: {e}")

            data["software"] = software

            return self._build_payload(data, ip)

        except Exception as e:
            logger.error(f"WinRM Discovery failed for {ip}: {e}")
            raise

    def _parse_wmic(self, output: str) -> Dict[str, str]:
        d = {}
        for line in output.splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                d[k.strip()] = v.strip()
        return d

    def _build_payload(self, data: Dict[str, Any], ip: str) -> Dict[str, Any]:
        """
        Normalize raw discovery data into the DiscoveryPayload-compatible dict.

        This keeps both Linux and Windows discovery paths OS-agnostic for downstream code.
        """
        hardware: Dict[str, Any] = {
            "cpu": data.get("cpu", "Unknown"),
            "ram_mb": data.get("ram_mb", 0),
            "serial": data.get("serial", "UNKNOWN"),
            "model": data.get("model", "Unknown"),
            "vendor": data.get("vendor", "Unknown"),
            "type": "Server",
            "storage_gb": data.get("storage_gb", 0),
            "ad_user": data.get("ad_user", "Unknown"),
            "primary_user": data.get("primary_user"),
            "ad_domain": data.get("ad_domain", "LOCAL"),
        }

        os_block: Dict[str, Any] = {
            "name": data.get("os_name", "Unknown OS"),
            "version": data.get("os_version", "0.0"),
            "uptime_sec": data.get("uptime_sec", 0),
        }

        metadata: Dict[str, Any] = {
            "network": data.get("network", []),
            "disks": data.get("disks", []),
        }

        return {
            "hostname": data.get("hostname", ip),
            "ip_address": ip,
            "hardware": hardware,
            "os": os_block,
            "software": data.get("software", []),
            "metadata": metadata,
        }

server_discovery_service = ServerDiscoveryService()
