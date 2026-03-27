import asyncio
import uuid
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import DiscoveryAgent

INITIAL_AGENTS = [
    {
        "id": "agent-local",
        "name": "Local Discovery",
        "role": "Host Integrity",
        "type": "System",
        "status": "online",
        "health": 98.5,
        "description": "Monitors local host integrity and system configurations.",
        "capabilities": ["File Integrity", "Process Monitoring", "Registry Audit"]
    },
    {
        "id": "agent-cloud",
        "name": "Cloud Monitor",
        "role": "Multi-Cloud Inspector",
        "type": "Cloud",
        "status": "online",
        "health": 99.2,
        "description": "Inspects AWS, Azure, and GCP resources for compliance and security.",
        "capabilities": ["IAM Audit", "Storage Encryption Check", "Network ACL Review"]
    },
    {
        "id": "agent-saas",
        "name": "SaaS Auditor",
        "role": "License & Access Review",
        "type": "API",
        "status": "online",
        "health": 100.0,
        "description": "Audits SaaS platforms (GitHub, Slack, etc.) for license usage and access controls.",
        "capabilities": ["License Tracking", "User Access Review", "OAuth App Audit"]
    },
    {
        "id": "agent-ad",
        "name": "AD Sync",
        "role": "Directory & User Identity",
        "type": "Directory",
        "status": "online",
        "health": 95.0,
        "description": "Synchronizes user identity data from Active Directory and Azure AD.",
        "capabilities": ["Identity Provisioning", "Group Membership Sync", "Login Audit"]
    },
    {
        "id": "agent-snmp",
        "name": "SNMP Scanner",
        "role": "Network Infrastructure",
        "type": "Network",
        "status": "online",
        "health": 92.0,
        "description": "Scans network devices via SNMP to discover switches, routers, and printers.",
        "capabilities": ["VLAN Discovery", "Port Status Monitoring", "Hardware Inventory"]
    },
    {
        "id": "agent-server",
        "name": "Server Scanner",
        "role": "Deep Inspection",
        "type": "Server",
        "status": "standby",
        "health": 100.0,
        "description": "Performs deep agentless inspection of servers via SSH/WMI.",
        "capabilities": ["Patch Level Audit", "Configuration Drift", "Installed Software"]
    }
]

async def seed_agents():
    print("[*] Seeding Discovery Agents...")
    async with AsyncSessionLocal() as session:
        for agent_data in INITIAL_AGENTS:
            # Check if agent already exists
            result = await session.execute(select(DiscoveryAgent).where(DiscoveryAgent.id == agent_data["id"]))
            existing = result.scalars().first()
            
            if not existing:
                print(f"[+] Adding {agent_data['name']} ({agent_data['id']})")
                new_agent = DiscoveryAgent(**agent_data)
                session.add(new_agent)
            else:
                print(f"[-] Agent {agent_data['id']} already exists, updating...")
                for key, value in agent_data.items():
                    setattr(existing, key, value)
        
        await session.commit()
    print("[*] Seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed_agents())
