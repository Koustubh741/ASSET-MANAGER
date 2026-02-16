import asyncio
import sys
from unittest.mock import MagicMock, AsyncMock

# Mock paramiko & winrm before import
sys.modules["paramiko"] = MagicMock()
sys.modules["winrm"] = MagicMock()

# Now import the service
from app.services.server_discovery_service import server_discovery_service

async def test_linux_discovery():
    print("Testing Linux Discovery (Mocked SSH)...")
    
    # Mock SSH Client behavior
    mock_client = MagicMock()
    mock_stdout = AsyncMock()
    mock_stdout.read = AsyncMock(return_value=b"Linux 5.10\n") 
    
    # We need to mock _ssh_exec to return specific strings based on cmd
    async def mock_exec(client, cmd):
        if "hostname" in cmd:
            return "test-linux-server"
        if "os-release" in cmd:
            return 'PRETTY_NAME="Ubuntu 22.04 LTS"\nVERSION_ID="22.04"'
        if "lscpu" in cmd:
            return "Model name: Intel(R) Xeon(R) CPU"
        if "meminfo" in cmd:
            return "MemTotal: 16384000 kB"
        if "product_serial" in cmd:
            return "LINUX-SN-12345"
        if "product_name" in cmd:
            return "Virtual Machine"
        if "sys_vendor" in cmd:
            return "QEMU"
        if "df -B1" in cmd:
            # total size column ~ 100 GB
            return "total 107374182400 0 0 0%\n"
        if "lsblk" in cmd:
            # Simple JSON for disks
            return '{"blockdevices":[{"name":"sda","size":"107374182400","type":"disk","mountpoint":"/"}]}'
        if "ip -j addr" in cmd:
            return '[{"ifname":"eth0","address":"00:11:22:33:44:55","addr_info":[{"local":"192.168.1.10"}]}]'
        if "proc/uptime" in cmd:
            return "3600.00 0.00"
        if "who | head -n 1" in cmd:
            return "jdoe pts/0 2024-01-01 10:00 (192.168.1.1)"
        if "realm list" in cmd:
            return "domain-name = example.com\n"
        if "dpkg-query" in cmd or "dpkg " in cmd:
            return "python3|3.10|Ubuntu Devs"
        return ""

    # Monkeypatch the helper method for easy testing
    server_discovery_service._ssh_exec = mock_exec
    
    data = await server_discovery_service.discover_server("192.168.1.10", "linux", {"username": "root", "password": "root"})
    print("Linux Result:", data)
    assert data["hostname"] == "test-linux-server"
    assert data["hardware"]["ram_mb"] == 16000
    assert data["os"]["name"] == "Ubuntu 22.04 LTS"
    # New richer fields
    assert data["hardware"]["storage_gb"] == 100
    assert data["os"]["uptime_sec"] == 3600
    assert data["hardware"]["ad_user"] == "jdoe"
    assert data["hardware"]["ad_domain"] == "example.com"
    assert isinstance(data["metadata"]["network"], list) and len(data["metadata"]["network"]) == 1
    assert isinstance(data["metadata"]["disks"], list) and len(data["metadata"]["disks"]) == 1
    print("[OK] Linux Discovery Verified")

async def test_windows_discovery():
    print("\nTesting Windows Discovery (Mocked WinRM)...")
    
    # Need to mock _parse_wmic or the session.run_cmd
    # Let's mock the internal session creation or run_cmd call
    # Ideally we'd mock the winrm.Session, but since we use it inside the method, 
    # we can monkeypatch `winrm.Session` in the service module if needed, 
    # OR since we already mocked `sys.modules["winrm"]`, we configure that mock.
    
    mock_session = MagicMock()
    mock_response = MagicMock()
    
    # Helper to simulate WinRM command output
    def side_effect_run_cmd(cmd):
        res = MagicMock()
        if "csproduct" in cmd:
            res.std_out = b"Name=Windows Server 2019\r\nVendor=Microsoft\r\nIdentifyingNumber=WIN-SN-9999"
        elif "hostname" in cmd:
            res.std_out = b"WIN-SERVER-01"
        elif "wmic os" in cmd:
            res.std_out = b"Caption=Microsoft Windows Server 2019 Standard\r\nVersion=10.0.17763"
        elif "wmic cpu" in cmd:
            res.std_out = b"Name=Intel Core i7"
        elif "totalphysicalmemory" in cmd:
            res.std_out = b"TotalPhysicalMemory=34359738368" # 32GB
        elif "Get-CimInstance Win32_LogicalDisk" in cmd:
            res.std_out = b'[{"DeviceID":"C:","Size":107374182400,"FreeSpace":53687091200}]'
        elif "Win32_NetworkAdapterConfiguration" in cmd:
            res.std_out = b'[{"Description":"Ethernet0","MACAddress":"AA:BB:CC:DD:EE:FF","IPAddress":"10.0.0.50"}]'
        elif "Win32_OperatingSystem" in cmd and "TotalSeconds" in cmd:
            res.std_out = b"7200"
        elif "whoami" in cmd:
            res.std_out = b"ACME\\\\svc-admin"
        elif "Get-ItemProperty" in cmd and "Uninstall" in cmd:
            res.std_out = b'[{"DisplayName":"SQL Server","DisplayVersion":"15.0","Publisher":"Microsoft"}]'
        else:
            res.std_out = b""
        return res

    mock_session.run_cmd.side_effect = side_effect_run_cmd
    
    # Patch the Session constructor to return our mock session
    sys.modules["winrm"].Session.return_value = mock_session
    
    data = await server_discovery_service.discover_server("10.0.0.50", "windows", {"username": "admin", "password": "password"})
    print("Windows Result:", data)
    assert data["hostname"] == "WIN-SERVER-01"
    assert data["hardware"]["ram_mb"] == 32768
    assert data["os"]["name"] == "Microsoft Windows Server 2019 Standard"
    # New richer fields
    assert data["hardware"]["storage_gb"] == 100
    assert data["os"]["uptime_sec"] == 7200
    assert data["hardware"]["ad_user"] == "svc-admin"
    assert data["hardware"]["ad_domain"] == "ACME"
    assert isinstance(data["metadata"]["network"], list) and len(data["metadata"]["network"]) == 1
    assert isinstance(data["metadata"]["disks"], list) and len(data["metadata"]["disks"]) == 1
    assert len(data["software"]) == 1
    print("[OK] Windows Discovery Verified")

async def main():
    await test_linux_discovery()
    await test_windows_discovery()

if __name__ == "__main__":
    asyncio.run(main())
