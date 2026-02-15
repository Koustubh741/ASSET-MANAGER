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
            
            # 5. Software (dpkg or rpm)
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
            transport='ntlm'
        )
        
        try:
            # Helper to run PS
            def run_ps(script):
                encoded_ps = script # simplify for now, standard winrm runs cmd by default, or ps with prefixes
                # Use simple CMD execution of wmic for compatibility
                return session.run_cmd(script)

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

            # Software (Registry check is hard via CMD, use basic product get - slow but works)
            # Or use PowerShell for registry
            ps_script = """
            Get-ItemProperty HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, Publisher | ConvertTo-Json
            """
            # Requires encoded command for complex PS
            # For prototype, let's stick to wmic product (known to be slow but standard)
            # r_sw = await asyncio.to_thread(session.run_cmd, "wmic product get name, version, vendor /format:csv")
            # Parsing CSV is safer
            
            data["software"] = [] # Placeholder for now to avoid timeout on wmic product

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
        return {
            "hostname": data.get("hostname", ip),
            "ip_address": ip,
            "hardware": {
                "cpu": data.get("cpu", "Unknown"),
                "ram_mb": data.get("ram_mb", 0),
                "serial": data.get("serial", "UNKNOWN"),
                "model": data.get("model", "Unknown"),
                "vendor": data.get("vendor", "Unknown"),
                "type": "Server"
            },
            "os": {
                "name": data.get("os_name", "Unknown OS"),
                "version": data.get("os_version", "0.0"),
                "uptime_sec": 0
            },
            "software": data.get("software", [])
        }

server_discovery_service = ServerDiscoveryService()
