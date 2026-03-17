// Agent metadata for detailed information modal
export const AGENT_DETAILS = {
    'agent-local': {
        purpose: 'Automatically discovers and inventories physical and virtual hardware assets across your local infrastructure.',
        discoveryMethods: ['WMI Queries', 'System Registry Scans', 'Hardware Profiling', 'Software Inventory'],
        dataSources: ['Windows Management Instrumentation', 'System BIOS', 'Installed Programs Registry', 'Network Adapters'],
        capabilities: ['CPU & Memory Detection', 'OS Version Tracking', 'Serial Number Extraction', 'IP Address Mapping', 'Installed Software Enumeration'],
        schedule: 'Runs automatically every 24 hours or on-demand via manual trigger',
        output: 'Creates/updates Asset records with full hardware specifications and software inventory'
    },
    'agent-cloud': {
        purpose: 'Synchronizes cloud infrastructure resources from AWS, Azure, and GCP into your unified asset inventory.',
        discoveryMethods: ['AWS SDK Integration', 'Azure Resource Manager API', 'GCP Compute API', 'Cloud Provider SDKs'],
        dataSources: ['AWS EC2 & S3', 'Azure Virtual Machines & Storage', 'GCP Compute Engine', 'Cloud Resource Tags'],
        capabilities: ['Multi-Cloud Support', 'Instance Metadata Extraction', 'Cost Tag Mapping', 'Region Detection', 'Resource Type Classification'],
        schedule: 'Continuous sync every 15 minutes with rate limiting',
        output: 'Cloud assets categorized by provider, region, and resource type with cost allocation tags'
    },
    'agent-saas': {
        purpose: 'Tracks SaaS subscriptions and software licenses to prevent over-provisioning and ensure compliance.',
        discoveryMethods: ['OAuth API Integration', 'Admin Console Scraping', 'License Portal APIs', 'Subscription Webhooks'],
        dataSources: ['Google Workspace Admin', 'Microsoft 365 Licensing', 'Slack Enterprise API', 'Vendor License Portals'],
        capabilities: ['Seat Count Tracking', 'License Expiry Monitoring', 'Cost Per User Analysis', 'Unused License Detection', 'Compliance Reporting'],
        schedule: 'Daily sync at 2:00 AM with real-time webhook updates',
        output: 'Software License records with seat utilization, renewal dates, and cost breakdowns'
    },
    'agent-ad': {
        purpose: 'Synchronizes corporate directory users, departments, and organizational structure for accurate asset assignment.',
        discoveryMethods: ['LDAP Queries', 'Active Directory Replication', 'Azure AD Graph API', 'Directory Service Sync'],
        dataSources: ['Active Directory Domain Services', 'Azure AD', 'LDAP Directories', 'Organizational Units'],
        capabilities: ['User Profile Sync', 'Department Mapping', 'Role Assignment', 'Email Normalization', 'Organizational Hierarchy'],
        schedule: 'Incremental sync every 24 hours with delta updates',
        output: 'User records with department, role, and contact information for asset ownership tracking'
    },
    'agent-snmp': {
        purpose: 'Discovers network devices like firewalls, switches, routers, printers, and IoT devices that don\'t support traditional agents.',
        discoveryMethods: ['SNMP v2c/v3 Polling', 'Network Sweeps', 'ARP Table Analysis', 'MAC Address Discovery'],
        dataSources: ['SNMP MIB Tables', 'Network Device OIDs', 'ARP Cache', 'LLDP/CDP Neighbors'],
        capabilities: ['Firewall Vendor Detection', 'Device Type Detection', 'Firmware Version Tracking', 'Port Status Monitoring', 'Network Topology Mapping'],
        schedule: 'Manual trigger only (network-intensive operation)',
        output: 'Network device assets (Firewalls, Switches, Routers) with IP addresses and SNMP metadata'
    }
};
