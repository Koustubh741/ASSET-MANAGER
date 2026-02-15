
import asyncio
import argparse
import sys
import os
import json
from pprint import pprint

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

try:
    from app.services.server_discovery_service import server_discovery_service
    from app.services.encryption_service import decrypt_value
    from app.models.models import AgentConfiguration
    from app.database.database import AsyncSessionLocal
    from sqlalchemy import select
except ImportError:
    print("[ERROR] Failed to import backend modules. Ensure you are running this from backend/scripts/")
    sys.exit(1)

async def run_scan(args):
    target = args.target
    os_type = args.os
    creds = {}

    print(f"[*] Starting Server Scan on {target} ({os_type})...")

    # Credential Resolution
    if args.user:
        creds["username"] = args.user
        if args.password:
            creds["password"] = args.password
        if args.key:
            try:
                with open(args.key, 'r') as f:
                    creds["private_key"] = f.read()
            except Exception as e:
                print(f"[ERROR] Failed to read private key: {e}")
                return
    else:
        # Try fetching from DB if no cli creds provided (Agentless Config)
        print("[*] No credentials provided on CLI, attempting to fetch 'agent-server' config from DB...")
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-server')
            )
            config_rows = result.scalars().all()
            config = {row.config_key: row for row in config_rows}
            
            keys = ['username', 'password', 'privateKey']
            for k in keys:
                if k in config:
                    row = config[k]
                    val = decrypt_value(row.config_value) if row.is_sensitive else row.config_value
                    # Map config keys to service keys
                    if k == 'privateKey': creds['private_key'] = val
                    else: creds[k] = val
    
    if "username" not in creds:
        print("[ERROR] No username found. Please provide --user or configure 'agent-server' in DB.")
        return

    try:
        # Run Discovery
        data = await server_discovery_service.discover_server(target, os_type, creds)
        
        print("\n[+] Discovery Successful!")
        print("="*60)
        
        if args.format == 'json':
            print(json.dumps(data, indent=2))
        else:
            # Table-like output
            hw = data.get('hardware', {})
            os_info = data.get('os', {})
            print(f"Hostname:  {data.get('hostname')}")
            print(f"IP:        {data.get('ip_address')}")
            print(f"OS:        {os_info.get('name')} {os_info.get('version')}")
            print(f"Model:     {hw.get('vendor')} {hw.get('model')}")
            print(f"Serial:    {hw.get('serial')}")
            print(f"CPU:       {hw.get('cpu')}")
            print(f"RAM:       {hw.get('ram_mb')} MB")
            print(f"Software:  {len(data.get('software', []))} packages found")
            
    except Exception as e:
        print(f"\n[ERROR] Discovery Failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Agentless Server Scanner (CLI)")
    parser.add_argument("--target", required=True, help="Target IP address or hostname")
    parser.add_argument("--os", choices=["linux", "windows"], default="linux", help="Target OS type")
    
    # Credentials
    parser.add_argument("--user", help="SSH/WinRM Username")
    parser.add_argument("--password", help="SSH/WinRM Password")
    parser.add_argument("--key", help="Path to SSH Private Key file")
    
    parser.add_argument("--format", choices=["text", "json"], default="text", help="Output format")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose error logging")

    args = parser.parse_args()
    
    try:
        asyncio.run(run_scan(args))
    except KeyboardInterrupt:
        print("\n[!] Scan cancelled.")
