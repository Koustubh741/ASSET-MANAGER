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
        if "hostname" in cmd: return "test-linux-server"
        if "os-release" in cmd: return 'PRETTY_NAME="Ubuntu 22.04 LTS"\nVERSION_ID="22.04"'
        if "lscpu" in cmd: return "Model name: Intel(R) Xeon(R) CPU"
        if "meminfo" in cmd: return "MemTotal: 16384000 kB"
        if "product_serial" in cmd: return "LINUX-SN-12345"
        if "product_name" in cmd: return "Virtual Machine"
        if "sys_vendor" in cmd: return "QEMU"
        if "dpkg" in cmd: return "python3|3.10|Ubuntu Devs"
        return ""

    # Monkeypatch the helper method for easy testing
    server_discovery_service._ssh_exec = mock_exec
    
    data = await server_discovery_service.discover_server("192.168.1.10", "linux", {"username": "root", "password": "root"})
    print("Linux Result:", data)
    assert data["hostname"] == "test-linux-server"
    assert data["hardware"]["ram_mb"] == 16000
    assert data["os"]["name"] == "Ubuntu 22.04 LTS"
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
    print("[OK] Windows Discovery Verified")

async def main():
    await test_linux_discovery()
    await test_windows_discovery()

if __name__ == "__main__":
    asyncio.run(main())
