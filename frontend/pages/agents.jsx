import { useState, useEffect } from 'react';
import {
    Zap, Shield, Globe, Cpu, RefreshCw, Activity,
    CheckCircle2, AlertCircle, Clock, Server,
    Terminal, Play, Search, Filter, ArrowUpRight,
    ExternalLink, Settings, Database, Cloud, Lock, Users,
    X, Check, Package, Info, FileText, Calendar, Target, Layers, BarChart3
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import cronstrue from 'cronstrue';
import { useAssetContext } from '@/contexts/AssetContext';

export default function AgentsPage() {
    const { refreshData } = useAssetContext();
    const [agents, setAgents] = useState([]);
    const [activity, setActivity] = useState([]);
    const [stats, setStats] = useState({ totalAssets: '0', activeAgents: '0/5', networkHealth: '100%', cloudStatus: 'Standby' });
    const [agentMetrics, setAgentMetrics] = useState({});
    const [viewingMetrics, setViewingMetrics] = useState(null);
    const [agentMetadata, setAgentMetadata] = useState(null);

    const fetchAgentMetrics = async (agentId) => {
        try {
            const agentIdMap = {
                'agent-local': '00000000-0000-0000-0000-000000000001',
                'agent-cloud': '00000000-0000-0000-0000-000000000002',
                'agent-snmp': '00000000-0000-0000-0000-000000000000',
                'agent-server': '00000000-0000-0000-0000-000000000005',
                'agent-ad': 'agent-ad',
                'agent-saas': 'agent-saas'
            };

            const realId = agentIdMap[agentId] || agentId;
            const data = await apiClient.request(`/collect/metrics/${realId}`);
            if (data.status === 'success') {
                setAgentMetrics(prev => ({ ...prev, [agentId]: data.metrics }));
            }
        } catch (err) {
            console.error(`Failed to fetch metrics for ${agentId}:`, err);
        }
    };
    const [loading, setLoading] = useState(true);
    const [activeSweeps, setActiveSweeps] = useState({});
    const [toast, setToast] = useState(null);
    const [testingConnection, setTestingConnection] = useState(false);
    const [configAgent, setConfigAgent] = useState(null); // Agent currently being configured
    const [selectedLog, setSelectedLog] = useState(null); // Audit log item being viewed in detail
    const [selectedAgentDiscoveries, setSelectedAgentDiscoveries] = useState(null); // Agent whose discoveries are being viewed
    const [discoveriesModalLoading, setDiscoveriesModalLoading] = useState(false);
    const [selectedAgentDetails, setSelectedAgentDetails] = useState(null); // Agent whose details are being viewed

    // Scan Progress State
    const [scanProgress, setScanProgress] = useState({}); // { agentId: { percent: 0, status: 'running', message: '' } }

    // SNMP Scanner Configuration
    const [snmpConfig, setSnmpConfig] = useState({
        networkRange: '192.168.1.0/24',
        communityString: 'public',
        snmpVersion: 'v2c',
        exclusions: '',
        username: '',
        contextName: '',
        authKey: '',
        authProtocol: 'MD5',
        privKey: '',
        privProtocol: 'AES'
    });

    // Server Scanner Configuration
    const [serverConfig, setServerConfig] = useState({
        targets: '',
        osType: 'linux',
        username: '',
        password: '',
        privateKey: ''
    });

    // Cloud Provider Configuration
    const [cloudConfig, setCloudConfig] = useState({
        // AWS
        aws_access_key_id: '', aws_secret_access_key: '', aws_regions: 'us-east-1,us-west-2',
        // Azure
        azure_subscription_id: '', azure_tenant_id: '', azure_client_id: '', azure_client_secret: '',
        // GCP
        gcp_project_id: '', gcp_service_account_key: '',
        // OCI
        oci_tenancy_ocid: '', oci_user_ocid: '', oci_fingerprint: '', oci_region: 'us-ashburn-1', oci_private_key: '',
    });
    const [cloudProvider, setCloudProvider] = useState('aws'); // active sub-tab

    const [scheduleConfig, setScheduleConfig] = useState({
        cron_expression: '0 0 * * *',
        is_enabled: false,
        last_run: null,
        next_run: null
    });
    const [activeTab, setActiveTab] = useState('config');

    // Fetch Configs when opening settings
    useEffect(() => {
        if (configAgent) {
            setActiveTab('config');

            const fetchConfigs = async () => {
                // SNMP Config
                if (configAgent.type === 'Network') {
                    try {
                        // FIX BUG 1: apiClient.get() returns raw JSON directly (not wrapped in {data: ...})
                        const response = await apiClient.get(`/agents/${configAgent.id}/config`);
                        if (response && Object.keys(response).length > 0) {
                            setSnmpConfig(prev => ({
                                ...prev,
                                networkRange: response.networkRange || '192.168.1.0/24',
                                communityString: response.communityString || 'public',
                                snmpVersion: response.snmpVersion || 'v2c',
                                exclusions: response.exclusions || '',
                                username: response.username || '',
                                contextName: response.contextName || '',
                                authKey: response.authKey || '',
                                authProtocol: response.authProtocol || 'MD5',
                                privKey: response.privKey || '',
                                privProtocol: response.privProtocol || 'AES'
                            }));
                        }
                    } catch (error) {
                        console.error('Failed to fetch SNMP config:', error);
                    }
                } else if (configAgent.type === 'Server') {
                    try {
                        // FIX BUG 1: Same fix for Server config
                        const response = await apiClient.get(`/agents/${configAgent.id}/config`);
                        if (response && Object.keys(response).length > 0) {
                            setServerConfig(prev => ({
                                ...prev,
                                targets: response.targets || '',
                                osType: response.osType || 'linux',
                                username: response.username || '',
                                password: response.password || '',
                                privateKey: response.privateKey || ''
                            }));
                        }
                    } catch (error) {
                        console.error('Failed to fetch Server config:', error);
                    }
                } else if (configAgent.type === 'Cloud') {
                    try {
                        const response = await apiClient.get(`/agents/${configAgent.id}/config`);
                        if (response && Object.keys(response).length > 0) {
                            setCloudConfig(prev => ({ ...prev, ...response }));
                        }
                    } catch (error) {
                        console.error('Failed to fetch Cloud config:', error);
                    }
                }

                // Schedule Config
                try {
                    const schResponse = await apiClient.get(`/agents/${configAgent.id}/schedule`);
                    if (schResponse.data) {
                        setScheduleConfig(schResponse.data);
                    }
                } catch (error) {
                    console.error('Failed to fetch schedule:', error);
                }
            };
            fetchConfigs();
        }
    }, [configAgent]);


    const fetchAgentDiscoveries = async (agent) => {
        setDiscoveriesModalLoading(true);
        setSelectedAgentDiscoveries({ agent, data: [] }); // Set agent immediately
        try {
            let data = [];

            if (agent.type === 'System' || agent.type === 'Cloud' || agent.type === 'Network' || agent.type === 'Server') {
                const agentIdMap = {
                    'agent-local': '00000000-0000-0000-0000-000000000001',
                    'agent-cloud': '00000000-0000-0000-0000-000000000002',
                    'agent-snmp': '00000000-0000-0000-0000-000000000000',
                    'agent-server': '00000000-0000-0000-0000-000000000005'
                };
                const realId = agentIdMap[agent.id];
                data = await apiClient.request(`/assets/by-agent/${realId}`) || [];
            } else if (agent.type === 'API') { // SaaS
                const allSoftware = await apiClient.request('/software') || [];
                data = allSoftware.filter(s => s.is_discovered);
            } else if (agent.type === 'Directory') { // AD
                data = await apiClient.request('/users') || [];
            }

            setSelectedAgentDiscoveries({ agent, data });
        } catch (err) {
            console.error('Failed to fetch discoveries for agent:', err);
            showToast(`Failed to load data for ${agent.name}`, 'error');
        } finally {
            setDiscoveriesModalLoading(false);
        }
    };

    const fetchDashboardStats = async (currentAgents = []) => {
        try {
            const assetStats = await apiClient.request('/assets/stats');
            if (assetStats) {
                const agentStats = assetStats.agent_stats || {};
                setStats({
                    totalAssets: assetStats.total?.toLocaleString() || '0',
                    activeAgents: `${agentStats.active || 0}/${agentStats.total || currentAgents.length || 0}`,
                    networkHealth: agentStats.avg_health ? `${agentStats.avg_health.toFixed(1)}%` : '100%',
                    cloudStatus: agentStats.cloud_sync || 'Standby'
                });
            }
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err);
        }
    };

    const fetchAgents = async () => {
        try {
            const registry = await apiClient.get('/agents/registry');
            if (registry && Array.isArray(registry)) {
                // Map backend last_sync to UI friendly format
                const mappedAgents = registry.map(agent => ({
                    ...agent,
                    lastSync: agent.last_sync ? new Date(agent.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never',
                    endpoint: agent.id === 'agent-snmp' ? '/collect/scan' : 
                             agent.id === 'agent-cloud' ? '/collect/cloud/sync' :
                             agent.id === 'agent-saas' ? '/collect/saas/trigger' :
                             agent.id === 'agent-ad' ? '/collect/users/trigger' :
                             agent.id === 'agent-server' ? '/collect/server/scan' : '/collect/trigger'
                }));
                setAgents(mappedAgents);
                return mappedAgents;
            }
            return [];
        } catch (err) {
            console.error('Failed to fetch agent registry:', err);
            return [];
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const logs = await apiClient.request('/audit/logs?limit=10&entity_type=Asset');
            if (logs && Array.isArray(logs)) {
                setActivity(logs.map(log => ({
                    id: log.id,
                    event: log.action.replace(/_/g, ' '),
                    entity: log.details?.hostname || log.details?.name || 'Unknown Asset',
                    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    fullTime: new Date(log.timestamp).toLocaleString(),
                    status: 'Success',
                    details: log.details || {},
                    user: log.performed_by || 'System'
                })));
            }
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        }
    };

    const fetchMetadata = async () => {
        try {
            const data = await apiClient.get('/setup/metadata');
            if (data && data.agent_metadata) {
                setAgentMetadata(data.agent_metadata);
            }
        } catch (err) {
            console.error('Failed to fetch agent metadata:', err);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            const currentAgents = await fetchAgents();
            await Promise.all([
                fetchMetadata(),
                fetchAuditLogs(),
                fetchDashboardStats(currentAgents),
                ...(currentAgents || []).map(a => fetchAgentMetrics(a.id))
            ]);
            setLoading(false);
        };
        fetchData();
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const triggerScan = async (agent) => {
        const agentId = agent.id;
        setActiveSweeps(prev => ({ ...prev, [agentId]: true }));

        try {
            // Map UI agent to real backend endpoints
            let endpoint = agent.endpoint;
            let method = 'POST';
            let params = {};

            if (agent.id === 'agent-snmp') {
                // For SNMP we generally trigger existing db config, or pass if needed
            } else if (agent.id === 'agent-server') {
                // Pass the current UI state for Server Scanner
                params = {
                    targets: serverConfig.targets,
                    os_type: serverConfig.osType,
                    credentials: {
                        username: serverConfig.username,
                        password: serverConfig.password,
                        private_key: serverConfig.privateKey
                    }
                };
                // Basic validation
                if (!params.targets || !params.credentials.username) {
                    showToast('Target IP and Username are required for Server Scan', 'error');
                    setActiveSweeps(prev => ({ ...prev, [agentId]: false }));
                    return;
                }
            }


            const response = await apiClient.request(endpoint, {
                method: method,
                body: Object.keys(params).length > 0 ? params : {}
            });

            console.log('Discovery Trigger Response:', response);

            if (response.status === 'success') {
                showToast(response.message || 'Discovery mission launched successfully!', 'success');
                if (response.count !== undefined) {
                    console.log(`Scan Results: ${response.count} devices found`);
                }

                // Update agent status for visual feedback
                setAgents(prev => prev.map(a =>
                    a.id === agentId ? { ...a, status: 'online', lastSync: 'Just now' } : a
                ));

                // Handle Async Scan
                if (response.async && response.scan_id) {
                    console.log(`Async scan started: ${response.scan_id}`);
                    setScanProgress(prev => ({
                        ...prev,
                        [agentId]: { percent: 0, status: 'running', message: 'Starting scan...', scanId: response.scan_id }
                    }));
                    pollScanStatus(agentId, response.scan_id);
                } else {
                    // Non-async scan (e.g. local discovery): refresh asset inventory immediately
                    setTimeout(() => refreshData(), 1500);
                }

                // Handle server scan results specifically
                if (response.results && response.results.length > 0) {
                    console.log('Server Scan Details:', response.results);
                }
            } else {
                showToast(response.message || 'Failed to start discovery.', 'error');
            }
            setTimeout(fetchAuditLogs, 2000);

            // Update agent health/status in UI if it was standby
            if (agentId === 'agent-snmp') {
                setAgents(prev => prev.map(a =>
                    a.id === 'agent-snmp' ? { ...a, status: 'online', health: 100, lastSync: 'Just now' } : a
                ));
            }
        } catch (error) {
            console.error('Trigger error:', error);
            showToast(error.message || 'Failed to trigger discovery.', 'error');
        } finally {
            setActiveSweeps(prev => ({ ...prev, [agentId]: false }));
        }
    };

    const pollScanStatus = async (agentId, scanId) => {
        const interval = setInterval(async () => {
            try {
                const status = await apiClient.request(`/collect/scan/status/${scanId}`);
                console.log('Scan Status:', status);

                if (status.status === 'completed' || status.status === 'failed') {
                    clearInterval(interval);
                    setScanProgress(prev => ({
                        ...prev,
                        [agentId]: null
                    }));

                    if (status.status === 'completed') {
                        showToast(`Scan complete: ${status.devices_found} devices found`, 'success');
                        // Refresh listings and asset inventory context
                        fetchAgentMetrics(agentId);
                        fetchDashboardStats();
                        refreshData();
                    } else {
                        showToast(`Scan failed: ${status.error || 'Unknown error'}`, 'error');
                    }
                    setActiveSweeps(prev => ({ ...prev, [agentId]: false }));
                } else {
                    setScanProgress(prev => ({
                        ...prev,
                        [agentId]: {
                            percent: status.progress_percent,
                            status: status.status,
                            message: `Scanning... ${status.scanned_hosts}/${status.total_hosts} hosts`,
                            scanId: scanId
                        }
                    }));
                }
            } catch (err) {
                console.error('Poll error:', err);
                clearInterval(interval);
                setActiveSweeps(prev => ({ ...prev, [agentId]: false }));
            }
        }, 2000);
    };

    const testSNMPConnection = async () => {
        setTestingConnection(true);
        try {
            // Use first usable host (not network addr .0) — e.g. 192.168.1.0/24 → 192.168.1.1
            const base = snmpConfig.networkRange.split('/')[0];
            const octets = base.split('.');
            const testIp = (octets.length === 4 && octets[3] === '0')
                ? octets.slice(0, 3).join('.') + '.1'
                : base;

            const response = await apiClient.request('/collect/scan/validate', {
                method: 'POST',
                body: {
                    test_ip: testIp,
                    community: snmpConfig.snmpVersion === 'v2c' ? snmpConfig.communityString : undefined
                }
            });

            if (response.status === 'success') {
                showToast(
                    `✓ Connection successful! Found: ${response.device_info?.vendor || 'Unknown'} ${response.device_info?.type || 'Device'}`,
                    'success'
                );
            } else {
                showToast(response.message || '✗ Connection test failed', 'error');
            }
        } catch (error) {
            console.error('Connection test error:', error);
            showToast('Connection test failed: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            setTestingConnection(false);
        }
    };

    const triggerGlobalSync = async () => {
        showToast('Initiating Global Infrastructure Sweep...', 'info');
        // Trigger the two most critical ones in parallel
        const snmpAgent = agents.find(a => a.id === 'agent-snmp');
        const adAgent = agents.find(a => a.id === 'agent-ad');

        await Promise.all([
            triggerScan(snmpAgent),
            triggerScan(adAgent)
        ]);
    };

    const handleSaveConfig = async (updatedAgent) => {
        if (updatedAgent.type === 'Network') {
            // Validate CIDR
            const cidrRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
            if (!cidrRegex.test(snmpConfig.networkRange)) {
                setToast({ message: 'Invalid Network Range CIDR format (e.g., 192.168.1.0/24)', type: 'error' });
                return;
            }
            if (snmpConfig.snmpVersion === 'v3') {
                if (!snmpConfig.username) {
                    setToast({ message: 'Security Username is required for v3', type: 'error' });
                    return;
                }
            } else {
                if (!snmpConfig.communityString) {
                    setToast({ message: 'Community String is required for v2c', type: 'error' });
                    return;
                }
            }

            // Save SNMP Config to Backend
            try {
                await apiClient.put(`/agents/${updatedAgent.id}/config`, {
                    config: {
                        ...snmpConfig,
                        // Ensure contextName is included if version is v3
                        contextName: snmpConfig.snmpVersion === 'v3' ? snmpConfig.contextName : ''
                    }
                });
            } catch (error) {
                console.error('Failed to save SNMP config:', error);
                setToast({ message: 'Failed to save configuration', type: 'error' });
                return;
            }
        } else if (updatedAgent.type === 'Server') {
            if (!serverConfig.targets || !serverConfig.username) {
                setToast({ message: 'Target IPs and Username are required', type: 'error' });
                return;
            }

            try {
                await apiClient.put(`/agents/${updatedAgent.id}/config`, {
                    config: serverConfig
                });
                showToast('Server Scanner configuration saved', 'success');
            } catch (error) {
                console.error('Failed to save Server config:', error);
                showToast('Failed to save configuration', 'error');
                return;
            }
        } else if (updatedAgent.type === 'Cloud') {
            // Filter out empty values so we don't overwrite existing secrets with blanks
            const filteredCloud = Object.fromEntries(
                Object.entries(cloudConfig).filter(([, v]) => v && String(v).trim() !== '')
            );
            try {
                await apiClient.put(`/agents/${updatedAgent.id}/config`, { config: filteredCloud });
                showToast('Cloud credentials saved securely', 'success');
            } catch (error) {
                console.error('Failed to save Cloud config:', error);
                showToast('Failed to save cloud configuration', 'error');
                return;
            }
        }

        // Save Schedule
        try {
            await apiClient.post(`/agents/${updatedAgent.id}/schedule`, {
                cron_expression: scheduleConfig.cron_expression,
                is_enabled: scheduleConfig.is_enabled
            });
        } catch (error) {
            console.error('Failed to save schedule:', error);
            setToast({ message: 'Failed to save schedule', type: 'error' });
            return;
        }

        setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
        setConfigAgent(null);
        showToast(`${updatedAgent.name} settings updated successfully`);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-8 right-8 z-50 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 ${toast.type === 'error' ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' :
                    toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' :
                        'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    }`}>
                    {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                    <span className="text-sm font-bold">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Config Modal */}
            {configAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-app-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-blue-500/20 shadow-blue-500/10 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-app-border flex flex-shrink-0 justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-app-text tracking-tight">Agent Configuration</h3>
                                    <p className="text-app-text-muted text-[10px] font-black uppercase tracking-widest">{configAgent.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setConfigAgent(null)} className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                            {/* Tabs */}
                            <div className="flex border-b border-app-border bg-app-surface-soft px-8 pt-6 gap-6 sticky top-0 z-10 backdrop-blur-md">
                                <button
                                    onClick={() => setActiveTab('config')}
                                    className={`pb-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'config' ? 'border-blue-500 text-blue-400' : 'border-transparent text-app-text-muted hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    General settings
                                </button>
                                <button
                                    onClick={() => setActiveTab('schedule')}
                                    className={`pb-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'schedule' ? 'border-blue-500 text-blue-400' : 'border-transparent text-app-text-muted hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    Automation Schedule
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                {activeTab === 'config' ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Display Name</label>
                                            <input
                                                type="text"
                                                value={configAgent.name}
                                                onChange={(e) => setConfigAgent({ ...configAgent, name: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Agent Role</label>
                                            <input
                                                type="text"
                                                value={configAgent.role}
                                                onChange={(e) => setConfigAgent({ ...configAgent, role: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                            />
                                        </div>


                                        {/* SNMP Scanner Specific Configuration */}
                                        {configAgent.type === 'Network' && (
                                            <div className="space-y-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Server className="text-blue-400" size={16} />
                                                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">SNMP Configuration</h4>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Network Range (CIDR)</label>
                                                    <input
                                                        type="text"
                                                        value={snmpConfig.networkRange}
                                                        onChange={(e) => setSnmpConfig({ ...snmpConfig, networkRange: e.target.value })}
                                                        placeholder="192.168.1.0/24"
                                                        className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">SNMP Version</label>
                                                    <select
                                                        value={snmpConfig.snmpVersion}
                                                        onChange={(e) => setSnmpConfig({ ...snmpConfig, snmpVersion: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                                    >
                                                        <option value="v2c">v2c (Standard)</option>
                                                        <option value="v3">v3 (Secure USM)</option>
                                                    </select>
                                                </div>

                                                {snmpConfig.snmpVersion === 'v3' ? (
                                                    <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Security Username</label>
                                                                <input
                                                                    type="text"
                                                                    value={snmpConfig.username}
                                                                    onChange={(e) => setSnmpConfig({ ...snmpConfig, username: e.target.value })}
                                                                    placeholder="snmp-user"
                                                                    className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight text-blue-400">Context Name <span className="text-[10px] lowercase opacity-60">(Optional)</span></label>
                                                                <input
                                                                    type="text"
                                                                    value={snmpConfig.contextName}
                                                                    onChange={(e) => setSnmpConfig({ ...snmpConfig, contextName: e.target.value })}
                                                                    placeholder="vlan-1"
                                                                    className="w-full px-4 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl text-app-text placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Auth Protocol</label>
                                                                <select
                                                                    value={snmpConfig.authProtocol}
                                                                    onChange={(e) => setSnmpConfig({ ...snmpConfig, authProtocol: e.target.value })}
                                                                    className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                                                >
                                                                    <option value="NONE">None</option>
                                                                    <option value="MD5">MD5</option>
                                                                    <option value="SHA">SHA</option>
                                                                    <option value="SHA256">SHA256</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Auth Key</label>
                                                                <input
                                                                    type="password"
                                                                    value={snmpConfig.authKey}
                                                                    onChange={(e) => setSnmpConfig({ ...snmpConfig, authKey: e.target.value })}
                                                                    placeholder="••••••••"
                                                                    className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Priv Protocol</label>
                                                                <select
                                                                    value={snmpConfig.privProtocol}
                                                                    onChange={(e) => setSnmpConfig({ ...snmpConfig, privProtocol: e.target.value })}
                                                                    className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                                                >
                                                                    <option value="NONE">None</option>
                                                                    <option value="DES">DES</option>
                                                                    <option value="CBC-DES">CBC-DES</option>
                                                                    <option value="3DES">3DES</option>
                                                                    <option value="AES">AES (128)</option>
                                                                    <option value="AES192">AES-192</option>
                                                                    <option value="AES256">AES-256</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Priv Key</label>
                                                                <input
                                                                    type="password"
                                                                    value={snmpConfig.privKey}
                                                                    onChange={(e) => setSnmpConfig({ ...snmpConfig, privKey: e.target.value })}
                                                                    placeholder="••••••••"
                                                                    className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Community String</label>
                                                        <input
                                                            type="password"
                                                            value={snmpConfig.communityString}
                                                            onChange={(e) => setSnmpConfig({ ...snmpConfig, communityString: e.target.value })}
                                                            placeholder="public"
                                                            className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                                        />
                                                    </div>
                                                )}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Exclusions (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={snmpConfig.exclusions}
                                                        onChange={(e) => setSnmpConfig({ ...snmpConfig, exclusions: e.target.value })}
                                                        placeholder="192.168.1.1, 192.168.1.254"
                                                        className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                                    />
                                                </div>

                                                {/* Test Connection Button */}
                                                {configAgent.type === 'Network' && (
                                                    <div className="pt-2">
                                                        <button
                                                            onClick={testSNMPConnection}
                                                            disabled={testingConnection || !snmpConfig.networkRange}
                                                            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 text-app-text font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        >
                                                            {testingConnection ? (
                                                                <>
                                                                    <RefreshCw size={16} className="animate-spin" />
                                                                    Testing Connection...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 size={16} />
                                                                    Test Connection
                                                                </>
                                                            )}
                                                        </button>
                                                        <p className="text-xs text-app-text-muted mt-2 text-center">
                                                            Tests credentials against {(() => {
                                                                const base = snmpConfig.networkRange.split('/')[0];
                                                                const octets = base.split('.');
                                                                return (octets.length === 4 && octets[3] === '0')
                                                                    ? octets.slice(0, 3).join('.') + '.1'
                                                                    : base;
                                                            })()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Server Scanner Specific Configuration */}
                                        {configAgent.type === 'Server' && (
                                            <div className="space-y-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Terminal className="text-indigo-400" size={16} />
                                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Remote Server Access</h4>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Target IPs</label>
                                                    <textarea
                                                        value={serverConfig.targets}
                                                        onChange={(e) => setServerConfig({ ...serverConfig, targets: e.target.value })}
                                                        placeholder="192.168.1.15, 10.0.0.50"
                                                        rows={2}
                                                        className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-sm resize-none"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">OS Type</label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setServerConfig({ ...serverConfig, osType: 'linux', username: 'root' })}
                                                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${serverConfig.osType === 'linux' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-app-surface-soft border-transparent text-app-text-muted hover:text-slate-900 dark:hover:text-white'}`}
                                                        >
                                                            Linux (SSH)
                                                        </button>
                                                        <button
                                                            onClick={() => setServerConfig({ ...serverConfig, osType: 'windows', username: 'Administrator' })}
                                                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${serverConfig.osType === 'windows' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-app-surface-soft border-transparent text-app-text-muted hover:text-slate-900 dark:hover:text-white'}`}
                                                        >
                                                            Windows (WinRM)
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Username</label>
                                                        <input
                                                            type="text"
                                                            value={serverConfig.username}
                                                            onChange={(e) => setServerConfig({ ...serverConfig, username: e.target.value })}
                                                            placeholder={serverConfig.osType === 'linux' ? 'root' : 'Administrator'}
                                                            className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Password</label>
                                                        <input
                                                            type="password"
                                                            value={serverConfig.password}
                                                            onChange={(e) => setServerConfig({ ...serverConfig, password: e.target.value })}
                                                            placeholder="••••••••"
                                                            className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                {serverConfig.osType === 'linux' && (
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Private Key (PEM)</label>
                                                        <textarea
                                                            value={serverConfig.privateKey}
                                                            onChange={(e) => setServerConfig({ ...serverConfig, privateKey: e.target.value })}
                                                            placeholder="-----BEGIN RSA PRIVATE KEY-----"
                                                            rows={3}
                                                            className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-[10px] resize-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ── Cloud Provider Configuration ── */}
                                        {configAgent.type === 'Cloud' && (
                                            <div className="space-y-4 p-4 rounded-2xl bg-sky-500/5 border border-sky-500/20">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Cloud className="text-sky-400" size={16} />
                                                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">Cloud Provider Credentials</h4>
                                                </div>
                                                <p className="text-[10px] text-app-text-muted leading-relaxed">Credentials are encrypted and stored securely. Leave a field blank to keep the existing value.</p>
                                                {/* Provider sub-tabs */}
                                                <div className="flex gap-1 p-1 bg-app-surface-soft rounded-xl">
                                                    {['aws','azure','gcp','oci'].map(p => (
                                                        <button key={p} onClick={() => setCloudProvider(p)}
                                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${cloudProvider === p ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'text-app-text-muted hover:text-app-text'}`}>
                                                            {p.toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                                {/* AWS */}
                                                {cloudProvider === 'aws' && (
                                                    <div className="space-y-3 animate-in fade-in duration-200">
                                                        {[{k:'aws_access_key_id',l:'Access Key ID',ph:'AKIAIOSFODNN7EXAMPLE',s:false},
                                                          {k:'aws_secret_access_key',l:'Secret Access Key',ph:'wJalrXUt/K7MDENG/bPxRfiCYEXAMPLE',s:true},
                                                          {k:'aws_regions',l:'Regions (comma-separated)',ph:'us-east-1, eu-west-1',s:false}
                                                        ].map(({k,l,ph,s}) => (
                                                            <div key={k} className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{l}</label>
                                                                <input type={s?'password':'text'} value={cloudConfig[k]}
                                                                    onChange={e => setCloudConfig({...cloudConfig, [k]: e.target.value})}
                                                                    placeholder={ph}
                                                                    className="w-full px-3 py-2 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 font-mono text-sm transition-all" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {/* Azure */}
                                                {cloudProvider === 'azure' && (
                                                    <div className="space-y-3 animate-in fade-in duration-200">
                                                        {[{k:'azure_subscription_id',l:'Subscription ID',ph:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',s:false},
                                                          {k:'azure_tenant_id',l:'Tenant ID',ph:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',s:false},
                                                          {k:'azure_client_id',l:'Client ID',ph:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',s:false},
                                                          {k:'azure_client_secret',l:'Client Secret',ph:'••••••••••••••••••••',s:true}
                                                        ].map(({k,l,ph,s}) => (
                                                            <div key={k} className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{l}</label>
                                                                <input type={s?'password':'text'} value={cloudConfig[k]}
                                                                    onChange={e => setCloudConfig({...cloudConfig, [k]: e.target.value})}
                                                                    placeholder={ph}
                                                                    className="w-full px-3 py-2 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 font-mono text-sm transition-all" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {/* GCP */}
                                                {cloudProvider === 'gcp' && (
                                                    <div className="space-y-3 animate-in fade-in duration-200">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Project ID</label>
                                                            <input type="text" value={cloudConfig.gcp_project_id}
                                                                onChange={e => setCloudConfig({...cloudConfig, gcp_project_id: e.target.value})}
                                                                placeholder="my-gcp-project-123"
                                                                className="w-full px-3 py-2 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 font-mono text-sm transition-all" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Service Account Key (JSON)</label>
                                                            <textarea value={cloudConfig.gcp_service_account_key}
                                                                onChange={e => setCloudConfig({...cloudConfig, gcp_service_account_key: e.target.value})}
                                                                placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
                                                                rows={5}
                                                                className="w-full px-3 py-2 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 font-mono text-[11px] resize-none transition-all" />
                                                            <p className="text-[10px] text-app-text-muted">Paste the full JSON from your GCP service account key file.</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* OCI */}
                                                {cloudProvider === 'oci' && (
                                                    <div className="space-y-3 animate-in fade-in duration-200">
                                                        {[{k:'oci_tenancy_ocid',l:'Tenancy OCID',ph:'ocid1.tenancy.oc1..aaa...',s:false},
                                                          {k:'oci_user_ocid',l:'User OCID',ph:'ocid1.user.oc1..aaa...',s:false},
                                                          {k:'oci_fingerprint',l:'API Fingerprint',ph:'aa:bb:cc:dd:...',s:false},
                                                          {k:'oci_region',l:'Region',ph:'us-ashburn-1',s:false}
                                                        ].map(({k,l,ph,s}) => (
                                                            <div key={k} className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{l}</label>
                                                                <input type={s?'password':'text'} value={cloudConfig[k]}
                                                                    onChange={e => setCloudConfig({...cloudConfig, [k]: e.target.value})}
                                                                    placeholder={ph}
                                                                    className="w-full px-3 py-2 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 font-mono text-sm transition-all" />
                                                            </div>
                                                        ))}
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Private Key (PEM)</label>
                                                            <textarea value={cloudConfig.oci_private_key}
                                                                onChange={e => setCloudConfig({...cloudConfig, oci_private_key: e.target.value})}
                                                                placeholder="-----BEGIN RSA PRIVATE KEY-----"
                                                                rows={4}
                                                                className="w-full px-3 py-2 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 font-mono text-[11px] resize-none transition-all" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-app-surface-soft border border-app-border group hover:border-blue-500/20 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                                                    <Clock size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-app-text">Automated Scanning</h4>
                                                    <p className="text-[10px] text-app-text-muted font-medium tracking-tight">Run discovery automatically on a schedule</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setScheduleConfig({ ...scheduleConfig, is_enabled: !scheduleConfig.is_enabled })}
                                                className={`w-12 h-6 rounded-full transition-all relative ${scheduleConfig.is_enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${scheduleConfig.is_enabled ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className={`space-y-4 transition-all duration-300 ${scheduleConfig.is_enabled ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Quick Presets</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { label: 'Every Hour', value: '0 * * * *' },
                                                        { label: 'Daily (Midnight)', value: '0 0 * * *' },
                                                        { label: 'Weekly (Mon)', value: '0 0 * * 1' },
                                                        { label: 'Monthly (1st)', value: '0 0 1 * *' },
                                                    ].map(preset => (
                                                        <button
                                                            key={preset.value}
                                                            onClick={() => setScheduleConfig({ ...scheduleConfig, cron_expression: preset.value })}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${scheduleConfig.cron_expression === preset.value
                                                                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                                : 'bg-app-surface-soft border-app-border text-app-text-muted text-app-text-muted hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface'
                                                                }`}
                                                        >
                                                            {preset.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">Cron Schedule (Advanced)</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={scheduleConfig.cron_expression}
                                                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, cron_expression: e.target.value })}
                                                        placeholder="0 0 * * *"
                                                        className="w-full px-4 py-2.5 bg-app-surface-soft border border-app-border rounded-xl text-app-text placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm pr-10"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted">
                                                        <Clock size={14} />
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                                    <Info size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">Schedule Preview</p>
                                                        <p className="text-xs text-slate-700 dark:text-slate-700 font-medium leading-relaxed">
                                                            {(() => {
                                                                try {
                                                                    return scheduleConfig.cron_expression ? cronstrue.toString(scheduleConfig.cron_expression) : "No schedule set";
                                                                } catch (e) {
                                                                    return "Invalid cron expression format";
                                                                }
                                                            })()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4">
                                            <div className="p-4 rounded-xl bg-app-surface-soft border border-app-border">
                                                <span className="text-[10px] uppercase font-black text-app-text-muted block mb-1">Last Run</span>
                                                <span className="text-sm font-mono text-slate-700 dark:text-slate-700">
                                                    {scheduleConfig.last_run ? new Date(scheduleConfig.last_run).toLocaleString() : 'Never'}
                                                </span>
                                            </div>
                                            <div className="p-4 rounded-xl bg-app-surface-soft border border-app-border">
                                                <span className="text-[10px] uppercase font-black text-app-text-muted block mb-1">Next Run</span>
                                                <span className="text-sm font-mono text-blue-400 font-bold">
                                                    {scheduleConfig.next_run ? new Date(scheduleConfig.next_run).toLocaleString() : 'Pending...'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/20 border-t border-app-border flex flex-shrink-0 gap-3">
                            <button
                                onClick={() => setConfigAgent(null)}
                                className="flex-1 py-3 rounded-xl font-bold text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSaveConfig(configAgent)}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-app-text rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div >
            )
            }

            {/* Selected Log Details Modal */}
            {
                selectedLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-app-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-purple-500/20 shadow-purple-500/10 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-app-border flex flex-shrink-0 justify-between items-center bg-gradient-to-r from-purple-500/10 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-app-text tracking-tight">Event Intelligence</h3>
                                        <p className="text-app-text-muted text-[10px] font-black uppercase tracking-widest">{selectedLog.event}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLog(null)} className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Target Entity</label>
                                        <p className="text-app-text font-bold">{selectedLog.entity}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Status</label>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                            <p className="text-emerald-400 font-black uppercase tracking-tighter text-xs">{selectedLog.status}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Exact Timestamp</label>
                                        <p className="text-app-text-muted font-mono text-xs">{selectedLog.fullTime}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Performed By</label>
                                        <p className="text-app-text-muted font-bold flex items-center gap-2">
                                            <Shield size={12} className="text-purple-400" />
                                            {selectedLog.user}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Metadata Payload</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {Object.entries(selectedLog.details)
                                            .filter(([key]) => key !== 'trigger_source')
                                            .map(([key, value]) => {
                                                const strVal = typeof value === 'string' ? value.replace(/_/g, ' ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
                                                const isIpAddress = key.toLowerCase() === 'ip_address' && typeof value === 'string' && value.includes('; ');
                                                const ipEntries = isIpAddress ? value.split('; ').map(s => s.trim()).filter(Boolean) : [];
                                                return (
                                                    <div key={key} className={`p-4 rounded-2xl bg-app-surface-soft border border-app-border group hover:border-blue-500/20 transition-all ${isIpAddress ? 'flex flex-col gap-2' : 'flex items-center justify-between'}`}>
                                                        <span className="text-xs font-bold text-app-text-muted text-app-text-muted uppercase tracking-tight">
                                                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                        </span>
                                                        {isIpAddress && ipEntries.length > 0 ? (
                                                            <ul className="text-sm font-black text-blue-400 font-mono list-none p-0 m-0 space-y-1">
                                                                {ipEntries.map((entry, i) => <li key={i}>{entry}</li>)}
                                                            </ul>
                                                        ) : (
                                                            <span className="text-sm font-black text-blue-400 font-mono">{strVal}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        {Object.keys(selectedLog.details).length === 0 && (
                                            <div className="py-8 text-center bg-app-surface-soft rounded-2xl border border-dashed border-app-border">
                                                <p className="text-xs text-app-text-muted font-bold uppercase tracking-widest">No detailed payload available</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800/20 border-t border-app-border flex flex-shrink-0 gap-3">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="flex-1 py-3 bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text rounded-xl font-bold transition-all active:scale-95 text-sm"
                                >
                                    Close Intelligence Data
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Agent Discoveries Modal */}
            {
                selectedAgentDiscoveries && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-app-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-blue-500/20 shadow-blue-500/10 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-app-border flex flex-shrink-0 justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                                        <Database size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-app-text tracking-tight">Agent Discoveries</h3>
                                        <p className="text-app-text-muted text-[10px] font-black uppercase tracking-widest">Findings reported by {selectedAgentDiscoveries.agent.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedAgentDiscoveries(null)} className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                                {discoveriesModalLoading ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                                        <RefreshCw className="animate-spin text-blue-500" size={40} />
                                        <p className="text-app-text-muted font-bold uppercase tracking-widest text-xs">Querying Intelligence Layer...</p>
                                    </div>
                                ) : selectedAgentDiscoveries.data.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedAgentDiscoveries.data.map((item, idx) => (
                                            <div key={item.id || idx} className="p-5 rounded-2xl bg-app-surface-soft border border-app-border hover:border-blue-500/20 transition-all group">
                                                {selectedAgentDiscoveries.agent.type === 'API' ? (
                                                    /* Software License View */
                                                    <>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                                                                    <Package size={18} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-app-text group-hover:text-emerald-300 transition-all">{item.name}</h4>
                                                                    <p className="text-[10px] font-mono text-app-text-muted uppercase">{item.vendor}</p>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-tighter border border-blue-500/20">
                                                                {item.license_type || 'SaaS'}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                                                            <div className="flex flex-col">
                                                                <span className="text-app-text-muted font-bold uppercase tracking-tight">Status</span>
                                                                <span className="text-app-text-muted font-mono">{item.status}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-app-text-muted font-bold uppercase tracking-tight">Seats</span>
                                                                <span className="text-app-text-muted font-mono">{item.total_seats || 'Unlimited'}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : selectedAgentDiscoveries.agent.type === 'Directory' ? (
                                                    /* User View */
                                                    <>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-all">
                                                                    <Users size={18} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-app-text group-hover:text-amber-300 transition-all">{item.full_name}</h4>
                                                                    <p className="text-[10px] font-mono text-app-text-muted uppercase">{item.email}</p>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-tighter border border-emerald-500/20">
                                                                {item.status}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                                                            <div className="flex flex-col">
                                                                <span className="text-app-text-muted font-bold uppercase tracking-tight">Department</span>
                                                                <span className="text-app-text-muted font-mono">{item.department || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-app-text-muted font-bold uppercase tracking-tight">Role</span>
                                                                <span className="text-app-text-muted font-mono">{item.role}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    /* Standard Asset View */
                                                    <>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-all">
                                                                    <Server size={18} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-app-text group-hover:text-blue-300 transition-all">{item.name}</h4>
                                                                    <p className="text-[10px] font-mono text-app-text-muted uppercase">{item.serial_number}</p>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-tighter border border-emerald-500/20">
                                                                {item.status}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                                                            <div className="flex flex-col">
                                                                <span className="text-app-text-muted font-bold uppercase tracking-tight">Model</span>
                                                                <span className="text-app-text-muted font-mono">{item.model}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-app-text-muted font-bold uppercase tracking-tight">IP Address</span>
                                                                {(() => {
                                                                    const raw = item.specifications?.['IP Address'] || 'N/A';
                                                                    const entries = typeof raw === 'string' && raw.includes('; ') ? raw.split('; ').map(s => s.trim()).filter(Boolean) : [raw];
                                                                    return entries.length > 1 ? (
                                                                        <ul className="text-blue-400 font-mono font-bold text-[10px] space-y-0.5 list-none p-0 m-0">
                                                                            {entries.map((entry, i) => (
                                                                                <li key={i} className="leading-tight">{entry}</li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <span className="text-blue-400 font-mono font-bold">{raw}</span>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center bg-app-surface-soft rounded-3xl border border-dashed border-app-border">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 text-app-text-muted">
                                            <Database size={32} />
                                        </div>
                                        <h4 className="text-app-text font-bold mb-1">No Discoveries Recorded</h4>
                                        <p className="text-app-text-muted text-xs max-w-xs mx-auto">This agent has not yet reported any findings to the central intelligence registry.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800/20 border-t border-app-border flex flex-shrink-0 gap-3">
                                <button
                                    onClick={() => setSelectedAgentDiscoveries(null)}
                                    className="w-full py-3 bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text rounded-xl font-bold transition-all active:scale-95 text-sm"
                                >
                                    Close Intelligence View
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Agent Details Modal */}

            {
                selectedAgentDetails && agentMetadata && agentMetadata[selectedAgentDetails.id] && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-app-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-blue-500/20 shadow-blue-500/10 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-app-border flex flex-shrink-0 justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-app-text tracking-tight">{selectedAgentDetails.name}</h3>
                                        <p className="text-app-text-muted text-[10px] font-black uppercase tracking-widest">{selectedAgentDetails.role} • Technical Documentation</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedAgentDetails(null)} className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-6">

                                {/* Purpose */}

                                <div className="p-5 rounded-2xl bg-app-surface-soft border border-app-border">

                                    <div className="flex items-center gap-2 mb-3">

                                        <Target className="text-blue-400" size={18} />

                                        <h4 className="text-sm font-bold text-app-text uppercase tracking-tight">Purpose</h4>

                                    </div>

                                    <p className="text-app-text-muted text-sm leading-relaxed">{agentMetadata[selectedAgentDetails.id].purpose}</p>

                                </div>



                                {/* Discovery Methods */}

                                <div className="p-5 rounded-2xl bg-app-surface-soft border border-app-border">

                                    <div className="flex items-center gap-2 mb-3">

                                        <Layers className="text-emerald-400" size={18} />

                                        <h4 className="text-sm font-bold text-app-text uppercase tracking-tight">Discovery Methods</h4>

                                    </div>

                                    <div className="flex flex-wrap gap-2">

                                        {agentMetadata[selectedAgentDetails.id].discoveryMethods.map((method, idx) => (

                                            <span key={idx} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">

                                                {method}

                                            </span>

                                        ))}

                                    </div>

                                </div>



                                {/* Data Sources */}

                                <div className="p-5 rounded-2xl bg-app-surface-soft border border-app-border">

                                    <div className="flex items-center gap-2 mb-3">

                                        <Database className="text-purple-400" size={18} />

                                        <h4 className="text-sm font-bold text-app-text uppercase tracking-tight">Data Sources</h4>

                                    </div>

                                    <div className="grid grid-cols-2 gap-2">

                                        {agentMetadata[selectedAgentDetails.id].dataSources.map((source, idx) => (

                                            <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-700">

                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>

                                                <span>{source}</span>

                                            </div>

                                        ))}

                                    </div>

                                </div>



                                {/* Capabilities */}

                                <div className="p-5 rounded-2xl bg-app-surface-soft border border-app-border">

                                    <div className="flex items-center gap-2 mb-3">

                                        <Zap className="text-amber-400" size={18} />

                                        <h4 className="text-sm font-bold text-app-text uppercase tracking-tight">Capabilities</h4>

                                    </div>

                                    <div className="space-y-2">

                                        {agentMetadata[selectedAgentDetails.id].capabilities.map((capability, idx) => (

                                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-700">

                                                <Check className="text-amber-400 flex-shrink-0 mt-0.5" size={14} />

                                                <span>{capability}</span>

                                            </div>

                                        ))}

                                    </div>

                                </div>



                                {/* Schedule */}

                                <div className="p-5 rounded-2xl bg-app-surface-soft border border-app-border">

                                    <div className="flex items-center gap-2 mb-3">

                                        <Calendar className="text-cyan-400" size={18} />

                                        <h4 className="text-sm font-bold text-app-text uppercase tracking-tight">Execution Schedule</h4>

                                    </div>

                                    <p className="text-app-text-muted text-sm">{agentMetadata[selectedAgentDetails.id].schedule}</p>

                                </div>



                                {/* Output */}

                                <div className="p-5 rounded-2xl bg-app-surface-soft border border-app-border">

                                    <div className="flex items-center gap-2 mb-3">

                                        <FileText className="text-indigo-400" size={18} />

                                        <h4 className="text-sm font-bold text-app-text uppercase tracking-tight">Output Format</h4>

                                    </div>

                                    <p className="text-app-text-muted text-sm">{agentMetadata[selectedAgentDetails.id].output}</p>

                                </div>

                            </div>



                            <div className="p-6 bg-slate-50 dark:bg-slate-800/20 border-t border-app-border flex flex-shrink-0 gap-3">
                                <button

                                    onClick={() => setSelectedAgentDetails(null)}

                                    className="w-full py-3 bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text rounded-xl font-bold transition-all active:scale-95 text-sm"

                                >

                                    Close Documentation

                                </button>
                            </div>

                        </div>

                    </div>

                )
            }

            {/* Agent Metrics Modal */}
            {viewingMetrics && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-app-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-blue-500/20 shadow-blue-500/10 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-app-border flex flex-shrink-0 justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-app-text tracking-tight">Mission Metrics</h3>
                                    <p className="text-app-text-muted text-[10px] font-black uppercase tracking-widest">
                                        Performance data for {agents.find(a => a.id === viewingMetrics)?.name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setViewingMetrics(null)} className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            {!agentMetrics[viewingMetrics] ? (
                                <div className="py-12 text-center">
                                    <BarChart3 size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                                    <p className="text-app-text-muted font-bold uppercase tracking-widest text-xs">No recent mission telemetry available</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(agentMetrics[viewingMetrics]).map(([key, value]) => (
                                        <div key={key} className="p-4 rounded-2xl bg-app-surface-soft border border-app-border group hover:border-blue-500/20 transition-all">
                                            <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-2">{key.replace(/_/g, ' ')}</span>
                                            <span className="text-xl font-black text-blue-400 font-mono">
                                                {(() => {
                                                    if (typeof value === 'number') {
                                                        if (key.toLowerCase().includes('time') || key.toLowerCase().includes('duration')) {
                                                            return `${value.toFixed(2)}s`;
                                                        }
                                                        return value.toLocaleString();
                                                    }
                                                    if (value && typeof value === 'object') {
                                                        if (key === 'assets') {
                                                            const discovered = value.discovered || 0;
                                                            if (discovered === 0) return 'No active assets found (Scan Successful)';
                                                            return `${discovered} discovered / ${value.synced || 0} synced`;
                                                        }
                                                        if (key === 'providers') {
                                                            return `${value.succeeded || 0}/${value.attempted || 0} active`;
                                                        }
                                                        if (key === 'discovery_times') {
                                                            return Object.entries(value)
                                                                .map(([p, t]) => `${p}: ${Number(t).toFixed(1)}s`)
                                                                .join(', ') || 'N/A';
                                                        }
                                                        if (key === 'errors_by_status') {
                                                            const total = Object.values(value).reduce((a, b) => a + b, 0);
                                                            return total > 0 ? `${total} errors` : 'None';
                                                        }
                                                        return JSON.stringify(value);
                                                    }
                                                    return String(value);
                                                })()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/20 border-t border-app-border flex flex-shrink-0 gap-3">
                            <button
                                onClick={() => {
                                    fetchAgentMetrics(viewingMetrics);
                                    showToast('Refreshing mission telemetry...');
                                }}
                                className="flex-1 py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 rounded-xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} />
                                Refresh Telemetry
                            </button>
                            <button
                                onClick={() => setViewingMetrics(null)}
                                className="flex-1 py-3 bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text rounded-xl font-bold transition-all active:scale-95 text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-app-text tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        Discovery Mission Control
                    </h2>
                    <p className="text-app-text-muted mt-2 text-lg">Autonomous intelligence agents for global infrastructure visibility</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={triggerGlobalSync}
                        className="px-6 py-3 rounded-2xl bg-blue-600 text-app-text font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 active:scale-95 group"
                    >
                        <Zap size={20} className="group-hover:animate-pulse" />
                        <span>Global Sync</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Active Agents', value: stats.activeAgents, sub: 'Systems Running', icon: Cpu, color: 'blue' },
                    { label: 'Discovered Assets', value: stats.totalAssets, sub: '+12 today', icon: Database, color: 'purple' },
                    { label: 'Discovery Fleet Health', value: stats.networkHealth, sub: 'No critical failures', icon: Activity, color: 'emerald' },
                    { label: 'Cloud Sync', value: stats.cloudStatus, sub: 'Last sync: 15m ago', icon: Cloud, color: 'indigo' },
                ].map((stat, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-app-border relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/10 blur-3xl -mr-8 -mt-8 transition-all duration-500 group-hover:scale-150`} />
                        <div className="flex items-baseline justify-between mb-4">
                            <div className={`p-3 rounded-2xl bg-${stat.color}-500/20 text-${stat.color}-400 border border-${stat.color}-500/20`}>
                                <stat.icon size={24} />
                            </div>
                            <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">Real-time</span>
                        </div>
                        <h3 className="text-2xl font-black text-app-text">{stat.value}</h3>
                        <p className="text-app-text-muted text-xs font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-${stat.color}-400/60 text-[10px] mt-2 font-medium`}>{stat.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Agent Status Cards */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-app-text flex items-center gap-2">
                            <Shield className="text-blue-400" size={20} />
                            Active Agent Registry
                        </h3>
                        <div className="flex gap-2 text-[10px] font-bold text-app-text-muted uppercase tracking-widest">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Online</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Standby</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {agents.map((agent) => {
                            const isSyncing = activeSweeps[agent.id];
                            const progress = scanProgress[agent.id];
                            return (
                                <div
                                    key={agent.id}
                                    onClick={() => fetchAgentDiscoveries(agent)}
                                    className={`p-6 rounded-3xl bg-white dark:bg-slate-900/60 border transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98] ${isSyncing ? 'border-blue-500/50 shadow-lg shadow-blue-500/5' : 'border-app-border hover:border-blue-500/30'}`}
                                >
                                    {isSyncing && (
                                        <div className="absolute inset-0 bg-blue-500/5 animate-pulse flex items-center justify-center">
                                            <div className="w-full h-full bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -translate-x-full animate-shimmer" />
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-6 relative">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-app-border transition-all ${agent.status === 'online' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-50 dark:bg-slate-800/50 text-app-text-muted'}`}>
                                                {agent.type === 'System' && <Cpu size={24} />}
                                                {agent.type === 'Cloud' && <Cloud size={24} />}
                                                {agent.type === 'API' && <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />}
                                                {agent.type === 'Directory' && <Users size={24} />}
                                                {agent.type === 'Network' && <Server size={24} />}
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-app-text group-hover:text-blue-300 transition-colors uppercase tracking-tight">{agent.name === 'SNMP Scanner' ? 'SNMP Scanner' : agent.name}</h4>
                                                <p className="text-app-text-muted text-xs font-medium">{agent.role}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${agent.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                            {isSyncing ? 'Syncing...' : agent.status}
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6 relative">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-app-text-muted font-bold uppercase tracking-widest text-[9px]">Last Telemetry</span>
                                            <span className="text-app-text-muted font-mono">{agent.lastSync}</span>
                                        </div>

                                        {progress && progress.status === 'running' ? (
                                            <>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-blue-400 font-bold uppercase tracking-widest text-[9px] animate-pulse">Scan In Progress</span>
                                                    <span className="text-blue-300 font-mono">{progress.percent}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-app-border">
                                                    <div
                                                        className="h-full bg-blue-500 transition-all duration-300 relative overflow-hidden"
                                                        style={{ width: `${Math.max(progress.percent, 5)}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-app-text-muted text-app-text-muted text-center truncate">{progress.message}</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-app-text-muted font-bold uppercase tracking-widest text-[9px]">Operational Health</span>
                                                    <span className={`font-bold ${agent.health > 90 ? 'text-emerald-400' : agent.health > 0 ? 'text-amber-400' : 'text-app-text-muted'}`}>{agent.health}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-app-border">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${agent.health > 90 ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                        style={{ width: `${agent.health}%` }}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2 relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); triggerScan(agent); }}
                                            disabled={isSyncing}
                                            className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${isSyncing
                                                ? 'bg-blue-600/40 text-blue-200 cursor-not-allowed'
                                                : 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 active:scale-95'
                                                }`}
                                        >
                                            {isSyncing ? (
                                                <RefreshCw size={14} className="animate-spin" />
                                            ) : (
                                                <Play size={14} className="fill-current" />
                                            )}
                                            {isSyncing ? 'Processing' : 'Run Sweep'}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fetchAgentMetrics(agent.id);
                                                setViewingMetrics(agent.id);
                                            }}
                                            className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:bg-slate-800 text-app-text-muted text-app-text-muted rounded-xl border border-app-border transition-all active:scale-95"
                                            title="View Performance Metrics"
                                        >
                                            <BarChart3 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfigAgent(agent); }}
                                            className="p-3 rounded-xl bg-app-surface-soft border border-app-border text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-all active:scale-95"
                                            title="Configure Agent"
                                        >
                                            <Settings size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedAgentDetails(agent); }}
                                            className="p-3 rounded-xl bg-app-surface-soft border border-app-border text-app-text-muted hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all active:scale-95"
                                            title="View Agent Details"
                                        >
                                            <Info size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `/security/port-policies?agentId=${agent.id}`;
                                            }}
                                            className="px-3 py-3 rounded-xl bg-white dark:bg-slate-900/70 border border-indigo-500/40 text-[10px] font-semibold text-indigo-300 hover:bg-indigo-600/20 hover:text-indigo-100 transition-all active:scale-95"
                                            title="View Port Policies for this Agent"
                                        >
                                            Port Policies
                                        </button>
                                    </div>

                                    {agentMetrics[agent.id] && (
                                        <div className="mt-4 pt-4 border-t border-app-border flex gap-4 text-[9px] font-bold text-app-text-muted uppercase tracking-widest overflow-hidden">
                                            <div className="flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-blue-400" />
                                                <span>Duration: {(agentMetrics[agent.id].duration || agentMetrics[agent.id].duration_seconds || 0).toFixed(1)}s</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                                <span>Assets: {agentMetrics[agent.id].assets_synced || agentMetrics[agent.id].users_extracted || agentMetrics[agent.id].software_count || 0}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-app-text flex items-center gap-2">
                            <Terminal className="text-purple-400" size={20} />
                            Intelligence Feed
                        </h3>
                        <button onClick={fetchAuditLogs} className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-all">
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    <div className="rounded-3xl bg-white dark:bg-slate-900/60 border border-app-border p-2 overflow-hidden backdrop-blur-md relative min-h-[400px]">
                        {loading && (
                            <div className="absolute inset-0 z-10 bg-white dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                                <RefreshCw className="animate-spin text-blue-500" size={32} />
                            </div>
                        )}
                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {activity.length > 0 ? activity.map((item) => (
                                <div key={item.id} className="relative pl-6 pb-6 border-l border-app-border last:pb-0 group">
                                    <div className={`absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-slate-900 ${item.status === 'Success' ? 'bg-blue-500 group-hover:bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-amber-500 group-hover:bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'} transition-all`} />
                                    <div className="flex justify-between items-start mb-1">
                                        <h5 className="text-sm font-bold text-app-text tracking-tight group-hover:text-blue-300 transition-colors uppercase">{item.event}</h5>
                                        <span className="text-[10px] font-mono text-app-text-muted">{item.time}</span>
                                    </div>
                                    <p className="text-xs text-app-text-muted text-app-text-muted font-medium mb-2">{item.entity}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${item.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>
                                            {item.status}
                                        </span>
                                        <button
                                            onClick={() => setSelectedLog(item)}
                                            className="text-[10px] text-blue-400/60 hover:text-blue-400 font-bold transition-colors"
                                        >
                                            Details
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-20 text-center opacity-50">
                                    <Inbox className="mx-auto mb-4 text-app-text-muted" size={32} />
                                    <p className="text-sm text-app-text-muted font-bold uppercase tracking-widest">No Intelligence Data</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

function Inbox({ className, size }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;
}
