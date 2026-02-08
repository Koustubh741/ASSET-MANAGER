import platform
import socket
import uuid
import json
import http.client
import subprocess
import os
import sys
from datetime import datetime

# CONFIGURATION
BACKEND_URL = "127.0.0.1:8000"  # Target FastAPI server
AGENT_SECRET = "agent_secret_key_2026"
CONFIG_FILE = "agent_config.json"

def get_agent_id():
    """Persistent agent ID management"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f).get("agent_id")
    
    new_id = str(uuid.uuid4())
    with open(CONFIG_FILE, 'w') as f:
        json.dump({"agent_id": new_id}, f)
    return new_id

def get_hardware_info():
    hardware = {
        "cpu": platform.processor(),
        "ram_mb": 0,
        "serial": "UNKNOWN",
        "model": "UNKNOWN",
        "vendor": "UNKNOWN",
        "storage_gb": 0,
        "condition": "Excellent",
        "type": "Desktop"
    }
    
    # Get RAM info
    try:
        if platform.system() == "Windows":
            # Windows RAM & Hardware logic
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(stat)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            hardware["ram_mb"] = stat.ullTotalPhys // (1024 * 1024)
            
            # Improved parsing using WMIC format:list
            def get_wmic_dict(cmd):
                try:
                    out = subprocess.check_output(cmd, shell=True).decode().strip().split('\r\r\n')
                    d = {}
                    for line in out:
                        if '=' in line:
                            k, v = line.split('=', 1)
                            d[k.strip()] = v.strip()
                    return d
                except: return {}

            csproduct = get_wmic_dict("wmic csproduct get name, vendor /format:list")
            hardware["model"] = csproduct.get("Name", "Unknown")
            hardware["vendor"] = csproduct.get("Vendor", "Unknown")
            
            bios = get_wmic_dict("wmic bios get serialnumber /format:list")
            hardware["serial"] = bios.get("SerialNumber", "NOT_FOUND")

            # Chassis Type Detection
            chassis = get_wmic_dict("wmic systemenclosure get chassistypes /format:list")
            ct = chassis.get("ChassisTypes", "")
            # ChassisTypes mapping: 8, 9, 10 are Laptops. 3, 4, 6 are Desktops. 23 is Server.
            if any(t in ct for t in ["8", "9", "10", "11", "12", "14"]):
                hardware["type"] = "Laptop"
            elif any(t in ct for t in ["23", "28"]):
                hardware["type"] = "Server"
            else:
                hardware["type"] = "Desktop"
            
            # Storage Detection
            disk = get_wmic_dict("wmic logicaldisk where \"DeviceID='C:'\" get size /format:list")
            if disk.get("Size"):
                hardware["storage_gb"] = int(disk["Size"]) // (1024 * 1024 * 1024)
            
            # Health/Condition Detection
            health = get_wmic_dict("wmic diskdrive get status /format:list")
            hardware["condition"] = "Excellent" if health.get("Status") == "OK" else "Fair"
            
            # AD/Domain Context (Windows)
            try:
                hardware["ad_user"] = subprocess.check_output("whoami", shell=True).decode().strip()
                domain_info = get_wmic_dict("wmic computersystem get domain /format:list")
                hardware["ad_domain"] = domain_info.get("Domain", "WORKGROUP")
            except:
                hardware["ad_user"] = os.getenv("USERNAME", "Unknown")
                hardware["ad_domain"] = os.getenv("USERDOMAIN", "LOCAL")
            
        else:
            # Linux RAM & Hardware logic
            with open('/proc/meminfo', 'r') as f:
                for line in f:
                    if "MemTotal" in line:
                        hardware["ram_mb"] = int(line.split()[1]) // 1024
                        break
            
            # Storage
            try:
                st = os.statvfs('/')
                hardware["storage_gb"] = (st.f_blocks * st.f_frsize) // (1024 * 1024 * 1024)
            except: pass
            
            # Serial & Model via Sysfs (Safe, root not always needed)
            def read_sysfs(path):
                try:
                    with open(path, 'r') as f: return f.read().strip()
                except: return "UNKNOWN"
                
            hardware["model"] = read_sysfs("/sys/class/dmi/id/product_name")
            hardware["vendor"] = read_sysfs("/sys/class/dmi/id/sys_vendor")
            hardware["serial"] = read_sysfs("/sys/class/dmi/id/product_serial")
            hardware["condition"] = "Excellent" # Default for Linux prototype
            hardware["ad_user"] = os.getenv("USER", "Unknown")
            hardware["ad_domain"] = socket.getfqdn().split('.', 1)[-1] if '.' in socket.getfqdn() else "LOCAL"
            
            chassis_type = read_sysfs("/sys/class/dmi/id/chassis_type")
            if chassis_type in ["8", "9", "10"]: hardware["type"] = "Laptop"
            elif chassis_type in ["23"]: hardware["type"] = "Server"
            else: hardware["type"] = "Desktop"
            
    except Exception as e:
        print(f"Error gathering hardware stats: {e}")
        
    return hardware

def get_software_info():
    """Collects installed software list"""
    software_list = []
    
    try:
        if platform.system() == "Windows":
            # Registry-based scan for better performance than 'wmic product'
            # We look at both 32-bit and 64-bit uninstall keys
            keys = [
                r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                r"HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
            ]
            
            for key in keys:
                try:
                    # Run reg query to get subkeys
                    cmd = f'reg query "{key}"'
                    subkeys = subprocess.check_output(cmd, shell=True).decode().split('\r\n')
                    
                    for subkey in subkeys:
                        if not subkey.strip(): continue
                        
                        # Get details for each software
                        try:
                            # We fetch Name, Version, and Publisher (Vendor)
                            details_cmd = f'reg query "{subkey}"'
                            details_out = subprocess.check_output(details_cmd, shell=True).decode().split('\r\n')
                            
                            soft = {"name": "", "version": "Unknown", "vendor": "Unknown"}
                            for line in details_out:
                                if "DisplayName" in line:
                                    soft["name"] = line.split("REG_SZ")[-1].strip()
                                elif "DisplayVersion" in line:
                                    soft["version"] = line.split("REG_SZ")[-1].strip()
                                elif "Publisher" in line:
                                    soft["vendor"] = line.split("REG_SZ")[-1].strip()
                            
                            if soft["name"]:
                                software_list.append(soft)
                        except: continue
                except: continue
                
        else:
            # Linux: Check dpkg (Debian/Ubuntu)
            try:
                out = subprocess.check_output("dpkg-query -W -f='${Package}|${Version}|${Maintainer}\n'", shell=True).decode().split('\n')
                for line in out:
                    if '|' in line:
                        parts = line.split('|')
                        software_list.append({
                            "name": parts[0],
                            "version": parts[1],
                            "vendor": parts[2] if len(parts) > 2 else "Unknown"
                        })
            except:
                # Fallback to rpm (RHEL/CentOS)
                try:
                    out = subprocess.check_output("rpm -qa --queryformat '%{NAME}|%{VERSION}|%{VENDOR}\n'", shell=True).decode().split('\n')
                    for line in out:
                        if '|' in line:
                            parts = line.split('|')
                            software_list.append({
                                "name": parts[0],
                                "version": parts[1],
                                "vendor": parts[2] if len(parts) > 2 else "Unknown"
                            })
                except: pass

    except Exception as e:
        print(f"Error gathering software info: {e}")
        
    return software_list

def run_discovery():
    print(f"[{datetime.now()}] Starting Discovery Scan...")
    
    payload = {
        "agent_id": get_agent_id(),
        "hostname": socket.gethostname(),
        "ip_address": socket.gethostbyname(socket.gethostname()),
        "hardware": get_hardware_info(),
        "os": {
            "name": platform.system(),
            "version": platform.release(),
            "uptime_sec": int(datetime.now().timestamp()) # Simplified for prototype
        },
        "software": get_software_info()[:200], # Limit to top 200 for prototype payload size
        "metadata": {
            "collector_version": "1.0.0-proto"
        }
    }
    
    print(f"Payload generated for {payload['hostname']} (SN: {payload['hardware']['serial']})")
    
    # POST via http.client
    try:
        conn = http.client.HTTPConnection(BACKEND_URL)
        headers = {
            'Content-Type': 'application/json',
            'X-Agent-Key': AGENT_SECRET
        }
        conn.request("POST", "/api/v1/collect", body=json.dumps(payload), headers=headers)
        response = conn.getresponse()
        data = response.read().decode()
        
        if response.status == 200:
            print(f"SUCCESS: {json.loads(data)['message']}")
        else:
            print(f"FAILED ({response.status}): {data}")
            
    except Exception as e:
        print(f"COMMUNICATION ERROR: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_discovery()
