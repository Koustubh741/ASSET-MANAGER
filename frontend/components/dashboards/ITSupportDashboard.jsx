import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    Wrench, ShieldCheck, Terminal, AlertCircle, X, CheckCircle, Play, Server, Lock,
    Activity, ArrowRight, Trash2, Clock, MapPin, User, FileText, Check, MoreHorizontal,
    Printer, ChevronDown, ChevronRight, Eye, Ticket, Search, Info, RefreshCw, TrendingUp, Zap, Monitor,
} from 'lucide-react';
import {
    Layout, Card, Typography, Table, Tag, Button, Progress, Timeline,
    Input, Space, Badge, Avatar, Divider, ConfigProvider, theme
} from 'antd';
import apiClient from '@/lib/apiClient';
import { formatId, copyToClipboard } from '@/lib/idHelper';
import SmartIdGuideModal from '@/components/SmartIdGuideModal';
import { useToast } from '@/components/common/Toast';
import ComplianceCheckModal from '@/components/ComplianceCheckModal';
import { useAssetContext, ASSET_STATUS } from '@/contexts/AssetContext';
import { useRole } from '@/contexts/RoleContext';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';
// SecurityWidget is now replaced by modern cards

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// Helper Component for Manual Install Items (Step 2 of Config)
const SoftwareInstallItem = ({ app, assetId }) => {
    const [status, setStatus] = useState('pending'); // pending | installing | installed

    const handleInstall = async () => {
        setStatus('installing');
        try {
            await apiClient.provisionSoftware(assetId, app);
            setStatus('installed');
        } catch (e) {
            console.error("Manual provision failed:", e);
            setStatus('pending');
        }
    };

    return (
        <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-app-border">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded text-app-text-muted">
                    <Server size={14} />
                </div>
                <span className="text-sm text-slate-900 dark:text-slate-200 font-medium">{app}</span>
            </div>

            {status === 'pending' && (
                <button
                    onClick={handleInstall}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-app-text px-3 py-1.5 rounded transition-colors"
                >
                    Install
                </button>
            )}

            {status === 'installing' && (
                <span className="text-xs text-indigo-400 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    Pushing...
                </span>
            )}

            {status === 'installed' && (
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded flex items-center gap-1 border border-emerald-500/20">
                    <Check size={12} /> Installed
                </span>
            )}
        </div>
    );
};

export default function ITSupportDashboard() {
    const router = useRouter();
    const toast = useToast();
    const { user } = useRole();
    const { assets, updateAssetStatus, requests, tickets, itApproveRequest, itRejectRequest, registerByod, exitRequests, processExitByod, refreshData } = useAssetContext();

    // Derived state for queues instead of static state (guard assets in case context not ready)
    const safeAssets = Array.isArray(assets) ? assets : [];
    const pendingQueue = safeAssets.filter(a => (a?.status === ASSET_STATUS.ALLOCATED || a?.status === ASSET_STATUS.CONFIGURING));

    // 1. Incoming Asset Requests (Awaiting IT Management Action)
    // NOTE: `AssetContext` merges Tickets into `requests` for some dashboards.
    // Tickets must NOT be routed through the asset-request IT approval endpoint.
    const incomingRequests = requests.filter(r =>
        r.assetType !== 'Ticket' &&
        r.currentOwnerRole === 'IT_MANAGEMENT' &&
        (r.status === 'MANAGER_APPROVED' || r.status === 'IT_APPROVED' || r.status === 'REQUESTED' || r.status === 'BYOD_COMPLIANCE_CHECK')
    );

    // Global tickets state is now provided by AssetContext

    // Active Support Tickets (OPEN status)
    const activeTickets = tickets.filter(t => t.status?.toUpperCase() === 'OPEN' || t.status?.toUpperCase() === 'IN_PROGRESS');
    const closedTickets = tickets.filter(t => t.status?.toUpperCase() === 'RESOLVED' || t.status?.toUpperCase() === 'CLOSED');

    // Deployment Queue: Assets ready for deployment
    const deployedArgs = safeAssets.filter(a => (a?.status === ASSET_STATUS.READY_FOR_DEPLOYMENT));

    // Disposal Queue: Assets marked for scrap
    const disposalQueue = safeAssets.filter(a => (a?.status === ASSET_STATUS.SCRAP_CANDIDATE));

    // Discovery Queue: Assets found by agent (match API "Discovered" or context enum)
    const discoveredAssets = safeAssets.filter(a => {
        const s = (a?.status || '').toString().trim();
        return s === ASSET_STATUS.DISCOVERED || s.toLowerCase() === 'discovered';
    });

    // Legacy fallback states (if we need to write to anything local, but ideally we write to context)
    // We don't need setPendingQueue anymore as it drives from Context.

    // STATE: Modals & Workflows
    const [activeModal, setActiveModal] = useState(null); // 'PENDING', 'TICKETS', 'DEPLOY', 'DISPOSAL', 'CONFIG', 'TICKET_VIEW', 'RESOLVE_TICKET', 'RESOLVED_TICKET_VIEW'
    const [selectedItem, setSelectedItem] = useState(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    // STATE: Config Wizard
    const [configStep, setConfigStep] = useState(1);
    const [technicians, setTechnicians] = useState([]);
    const [isAssigning, setIsAssigning] = useState(false);

    // STATE: Search Query & Results
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    // Ticket Category Stats
    const [assetStats, setAssetStats] = useState({});
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const globalStats = await apiClient.getAssetStats();
                setAssetStats(globalStats || {});
            } catch (e) {
                console.error("Failed to load dashboard statistics:", e);
            } finally {
                setStatsLoading(false);
            }
        };
        loadStats();
    }, []);

    useEffect(() => {
        let active = true;

        // Immediate feedback: Clear old results and set searching state if there's a query
        if (searchQuery && (activeModal === 'TICKETS' || activeModal === 'CLOSED_TICKETS')) {
            setIsSearching(true);
            setSearchResults(null); // Clear stale results
        } else {
            setSearchResults(null);
            setIsSearching(false);
            return;
        }

        const fetchResults = async () => {
            try {
                let departmentScope = null;
                // For Departmental Managers in IT, show their specific queue
                if (isManagerial && !isAdmin && isITStaff) {
                    departmentScope = user.department || user.domain;
                }
                const results = await apiClient.getTickets(0, 500, departmentScope, searchQuery);

                // MAP raw API results to the standard format the UI expects (matching AssetContext)
                const mappedResults = results.map(t => ({
                    ...t,
                    status: (t.status || '').toUpperCase(),
                    assetType: 'Ticket',
                    requestedBy: {
                        name: t.requestor_name || t.requestor_id || 'Employee',
                        email: t.requestor_email || ''
                    },
                    assignedTo: t.assigned_to_name || t.assigned_to_id || 'Unassigned',
                    createdAt: t.created_at
                }));

                if (active) {
                    setSearchResults(mappedResults);
                    setIsSearching(false);
                }
            } catch (e) {
                console.error("Search failed:", e);
                if (active) setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(fetchResults, 400); // Slightly longer debounce for smoother feel
        return () => {
            active = false;
            clearTimeout(debounceTimer);
        };
    }, [searchQuery, activeModal, user]);

    // Derive displayed tickets
    const displayActiveTickets = searchResults
        ? searchResults.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
        : activeTickets;

    const displayClosedTickets = searchResults
        ? searchResults.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED')
        : closedTickets;

    // STATE: Ticket Resolution
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolutionType, setResolutionType] = useState('Fixed');
    const [resolutionStep, setResolutionStep] = useState(1);
    const [activeChecklist, setActiveChecklist] = useState([]);

    // STATE: BYOD Compliance Modal
    const [complianceModalOpen, setComplianceModalOpen] = useState(false);

    // --- WORKFLOW ACTIONS ---

    // 1. CONFIGURATION WORKFLOW
    const startConfig = (item) => {
        setSelectedItem(item);
        setConfigStep(1);
        setActiveModal('CONFIG');
    };

    useEffect(() => {
        const fetchTechnicians = async () => {
            try {
                // Only include specialized solvers (NOT management/admin)
                const itRoles = ['IT_SUPPORT', 'SUPPORT_SPECIALIST'];
                const allUsers = await apiClient.getUsers({ status: 'ACTIVE' });
                const filtered = allUsers.filter(u => itRoles.includes(u.role));
                setTechnicians(filtered);
            } catch (err) {
                console.error("Failed to fetch technicians:", err);
            }
        };
        fetchTechnicians();
    }, []);

    const handleConfigStepComplete = () => {
        if (configStep < 5) {
            setConfigStep(prev => prev + 1);
        } else {
            // FINISH CONFIGURATION
            // Update asset status in Context
            updateAssetStatus(selectedItem.id, ASSET_STATUS.READY_FOR_DEPLOYMENT);

            // UI Cleanup
            setActiveModal(null);
            setSelectedItem(null);
        }
    };

    // 2. DISPOSAL WORKFLOW
    const handleStartWipe = (id) => {
        // Mock wipe start
        toast.info(`Secure Wipe started for Asset ID ${id}. This will take approx 45 mins.`);
    };

    const handleMarkDisposed = (id) => {
        if (confirm("Confirm disposal? This action is irreversible.")) {
            updateAssetStatus(id, ASSET_STATUS.DISPOSED); // or RETIRED
        }
    };

    // 3. DEPLOYMENT WORKFLOW
    const handleHandover = (item) => {
        toast.success(`Handover protocol initiated for ${item.assignedUser}. Email notification sent.`);
        updateAssetStatus(item.id, ASSET_STATUS.IN_USE);
    };

    const handleGenerateAck = (item) => {
        toast.info(`Generating PDF Acknowledgement for ${item.name} (${item.id})...`);
    };

    // 4. TICKET RESOLUTION WORKFLOW
    const openResolveModal = (ticket) => {
        setSelectedItem(ticket);
        setResolutionNotes(ticket.resolution_notes || '');
        setResolutionType('Fixed');
        // Reset Wizard but keep existing checklist
        setResolutionStep(1);
        setActiveChecklist(ticket.resolution_checklist || []);
        setActiveModal('RESOLVE_TICKET');
    };

    const submitResolution = async () => {
        if (!resolutionNotes) {
            toast.error("Please enter troubleshooting notes.");
            return;
        }
        const total = activeChecklist.length;
        const checked = activeChecklist.filter(i => i.checked).length;
        const percentage = total > 0 ? (checked / total) * 100 : 100.0;

        try {
            await apiClient.resolveTicket(selectedItem.id, resolutionNotes, activeChecklist, percentage);
            await refreshData();
            toast.success("Incident resolved!");
            setActiveModal(null);
        } catch (e) {
            toast.error("Resolution failed: " + e.message);
        }
    };

    const handleAssignTicket = async (techId) => {
        setIsAssigning(true);
        try {
            await apiClient.updateTicket(selectedItem.id, { assigned_to_id: techId });
            await refreshData();
            toast.success("Ticket assigned successfully!");
            setActiveModal(null);
        } catch (err) {
            toast.error("Assignment failed: " + (err.response?.data?.detail || err.message));
        } finally {
            setIsAssigning(false);
        }
    };

    const submitProgress = () => {
        if (!resolutionNotes && activeChecklist.length === 0) {
            toast.error("Please add notes or checklist items to update progress.");
            return;
        }

        // Calculate Percentage
        const total = activeChecklist.length;
        const checked = activeChecklist.filter(i => i.checked).length;
        const percentage = total > 0 ? (checked / total) * 100 : 0;

        // Update Progress
        updateProgress(selectedItem.id, resolutionNotes, activeChecklist, percentage);
    };

    // Ticket Actions
    const acknowledgeTicket = async (ticketId) => {
        try {
            await apiClient.acknowledgeTicket(ticketId);
            await refreshData();
            toast.success("Ticket acknowledged!");
        } catch (error) {
            console.error("Failed to acknowledge ticket:", error);
            toast.error("Failed to acknowledge ticket: " + error.message);
        }
    };

    const resolveTicket = async (ticketId, notes, checklist, percentage) => {
        try {
            await apiClient.resolveTicket(ticketId, notes, checklist, percentage);
            await refreshData();
            toast.success("Ticket resolved successfully!");
        } catch (error) {
            console.error("Failed to resolve ticket:", error);
            toast.error("Failed to resolve ticket: " + error.message);
        }
    };

    const updateProgress = async (ticketId, notes, checklist, percentage, silent = false) => {
        try {
            await apiClient.updateTicketProgress(ticketId, notes, checklist, percentage);
            await refreshData();
            if (!silent) toast.success("Progress updated and user notified!");
        } catch (error) {
            console.error("Failed to update progress:", error);
            if (!silent) toast.error("Failed to update progress: " + error.message);
        }
    }

    const saveDraft = () => {
        if (!selectedItem) return;
        // Guard: do not fire API call if there is nothing to save yet
        if (!resolutionNotes && activeChecklist.length === 0) return;
        const total = activeChecklist.length;
        const checked = activeChecklist.filter(i => i.checked).length;
        // If we have notes but nothing checked, we are at least at 10%
        const percentage = total > 0 ? (checked / total) * 100 : (resolutionNotes ? 10 : 0);
        updateProgress(selectedItem.id, resolutionNotes, activeChecklist, percentage, true);
    };



    // --- HELPERS ---
    const ConfigStep = ({ step, current }) => {
        const isCompleted = current > step;
        const isCurrent = current === step;
        return (
            <div className={`flex items-center gap-2 ${isCurrent ? 'text-indigo-400 font-bold' : isCompleted ? 'text-emerald-400' : 'text-app-text-muted'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                    ${isCurrent ? 'border-indigo-400 bg-indigo-500/20' : isCompleted ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
                    {isCompleted ? <Check size={16} /> : <span>{step}</span>}
                </div>
                {step < 5 && <div className={`flex-1 h-0.5 w-8 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>}
            </div>
        );
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#4f46e5',
                    borderRadius: 12,
                    fontFamily: 'Inter, sans-serif',
                },
            }}
        >
            <Layout className="min-h-screen bg-app-bg">

                <Content className="max-w-[1600px] mx-auto w-full px-10 py-12 neural-compact">
                    {/* --- HEADER --- */}
                    <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-8 relative">
                        <div className="relative z-10 flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-[0_20px_40px_rgba(79,70,229,0.4)] border border-app-border-soft transform hover:rotate-6 transition-all duration-500 group">
                                <Terminal className="text-app-text w-8 h-8 group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <h1 className="text-xl font-['Outfit'] font-black text-app-text tracking-tighter m-0 uppercase leading-none">
                                    IT Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Center</span>
                                </h1>
                                <div className="flex items-center gap-4 mt-3">
                                    <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2 shadow-lg">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{user?.persona?.replace(/_/g, ' ') || 'SYSTEM OPERATOR'}</span>
                                    </div>
                                    <span className="text-app-text-muted text-[11px] font-black uppercase tracking-[0.2em] opacity-60">ID: {user?.full_name?.split(' ')[0].toUpperCase()} // VERIFIED</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative w-full lg:w-[500px] group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10">
                                <Search size={20} className="text-app-text-muted group-hover:text-indigo-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Neural Registry Search: Devices, Identities, Incidents..."
                                className="w-full h-16 bg-app-surface-soft border border-slate-300 border-app-border rounded-[2rem] pl-14 pr-8 text-app-text text-sm font-bold placeholder:text-app-text-muted focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 backdrop-blur-2xl transition-all shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {/* Hotkey Decorator */}
                            <div className="absolute right-5 inset-y-0 flex items-center pointer-events-none opacity-40">
                                <span className="px-2 py-1 rounded-md border border-app-border-soft text-[10px] font-black text-app-text-muted uppercase tracking-widest">CMD + K</span>
                            </div>
                        </div>
                    </header>

                    <ActionsNeededBanner
                        title="Actions needed"
                        items={[
                            ...(incomingRequests.length > 0 ? [{ label: 'Pending approval', count: incomingRequests.length, onClick: () => setActiveModal('PENDING'), icon: Terminal, variant: 'primary' }] : []),
                            ...(activeTickets.length > 0 ? [{ label: 'Open tickets', count: activeTickets.length, onClick: () => router.push('/tickets/advanced'), icon: Ticket, variant: 'warning' }] : []),
                            ...(deployedArgs.length > 0 && !(user?.persona === 'IT_GOVERNANCE' || user?.persona === 'EXECUTIVE_STRATEGY') ? [{ label: 'Ready for handover', count: deployedArgs.length, onClick: () => setActiveModal('DEPLOY'), icon: CheckCircle, variant: 'success' }] : []),
                        ]}
                    />

                    <Divider className="my-8" />



                    <Divider className="my-8" />

                    {/* --- METRIC CARDS --- */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
                        {[
                            { label: 'Pending Approval', value: incomingRequests.length, trend: assetStats?.request_trend || "Stable", color: 'indigo', action: () => setActiveModal('PENDING'), icon: Terminal },
                            { label: 'Open Tickets', value: activeTickets.length, trend: assetStats?.ticket_trend || "0%", color: 'rose', action: () => router.push('/tickets/advanced'), icon: Ticket, isTrendUp: true },
                            { label: 'Deployment Ops', value: deployedArgs.length, trend: assetStats?.ready_trend || "Stable", color: 'emerald', action: () => setActiveModal('DEPLOY'), icon: CheckCircle },
                            { label: 'Scrap Queue', value: disposalQueue.length, trend: "-12%", color: 'slate', action: () => setActiveModal('DISPOSAL'), icon: Trash2 },
                            { label: 'Asset Discovery', value: discoveredAssets.length > 1000 ? `${(discoveredAssets.length / 1000).toFixed(1)}k` : discoveredAssets.length, trend: `+${discoveredAssets.length > 1000 ? '157' : '0'}`, color: 'sky', icon: Activity },
                            { label: 'Incidents Closed', value: closedTickets.length, trend: assetStats?.resolution_rate || "100%", color: 'blue', action: () => setActiveModal('CLOSED_TICKETS'), icon: ShieldCheck }
                        ].map((stat, i) => (
                            <div
                                key={i}
                                onClick={stat.action}
                                className={`glass-card p-6 cursor-pointer border-t-2 transition-all duration-500 hover:-translate-y-2 group relative overflow-hidden
                                    ${stat.color === 'indigo' ? 'border-indigo-500' :
                                        stat.color === 'rose' ? 'border-rose-500' :
                                            stat.color === 'emerald' ? 'border-emerald-500' :
                                                stat.color === 'slate' ? 'border-slate-500' :
                                                    stat.color === 'sky' ? 'border-sky-500' : 'border-blue-500'}`}
                            >
                                <div className={`absolute -right-8 -top-8 w-24 h-24 bg-${stat.color}-500 opacity-0 blur-[40px] group-hover:opacity-20 transition-opacity`}></div>

                                <div className="flex justify-between items-start mb-4 relative z-10 transition-transform group-hover:translate-x-1">
                                    <Text className="text-[9px] font-black text-app-text-muted uppercase tracking-[0.2em]">{stat.label}</Text>
                                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border
                                        ${stat.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                            stat.color === 'rose' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    stat.color === 'slate' ? 'bg-slate-500/10 text-app-text-muted border-slate-300 border-app-border' :
                                                        stat.color === 'sky' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                        {stat.isTrendUp && <TrendingUp size={10} className="animate-pulse" />}
                                        {stat.trend}
                                    </div>
                                </div>
                                <div className="flex items-end justify-between relative z-10">
                                    <Title level={2} className={`!m-0 !text-2xl font-['Outfit'] font-black text-app-text group-hover:text-${stat.color}-400 transition-colors drop-shadow-sm`}>
                                        {stat.value || 0}
                                    </Title>
                                    <stat.icon size={20} className="text-slate-800 group-hover:text-app-text/20 transition-all transform group-hover:rotate-12" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* --- DASHBOARD WIDGETS --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                        {/* --- DASHBOARD WIDGETS --- */}
                        {/* Security Health Widget */}
                        <div className="lg:col-span-5 glass-panel p-8 relative overflow-hidden group">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-700"></div>

                            <div className="flex items-center justify-between mb-10 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-['Outfit'] font-black text-app-text tracking-tight uppercase">Security Health</h3>
                                        <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                            Global Protection Matrix
                                        </p>
                                    </div>
                                </div>
                                <Button type="text" className="text-app-text-muted hover:text-app-text" icon={<MoreHorizontal size={20} />} />
                            </div>

                            <div className="flex items-center gap-10 mb-10 relative z-10">
                                <div className="relative w-40 h-40 shrink-0">
                                    <div className="absolute inset-0 rounded-full border-4 border-app-border shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)]"></div>
                                    <div className="w-full h-full rounded-full flex flex-col items-center justify-center bg-app-surface-soft backdrop-blur-2xl border border-slate-300 border-app-border shadow-2xl animate-float">
                                        <Text className="text-xl font-['Outfit'] font-black text-app-text leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{assetStats?.health_score || 0}%</Text>
                                        <Text className="text-[9px] text-app-text-muted font-black uppercase mt-2 tracking-[0.2em]">Safety Index</Text>
                                    </div>
                                    {/* Pulse Ring */}
                                    <div className="absolute -inset-2 rounded-full border border-indigo-500/20 animate-pulse duration-[3000ms]"></div>
                                </div>

                                <div className="flex-1 space-y-6">
                                    {[
                                        { label: 'Network Policy', value: assetStats?.policy_compliance || 0, color: 'indigo' },
                                        { label: 'Active Monitoring', value: assetStats?.active_monitoring || 0, color: 'emerald' }
                                    ].map((metric, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-2">
                                                <Text className="text-app-text-muted">{metric.label}</Text>
                                                <Text className={`text-${metric.color}-400`}>{metric.value}%</Text>
                                            </div>
                                            <div className="h-1.5 w-full bg-app-surface-soft rounded-full overflow-hidden border border-app-border">
                                                <div
                                                    className={`h-full bg-gradient-to-r from-${metric.color}-600 to-${metric.color}-400 shadow-[0_0_10px_rgba(var(--${metric.color === 'indigo' ? '99,102,241' : '16,185,129'}),0.4)] transition-all duration-1000`}
                                                    style={{ width: `${metric.value}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                                {[
                                    { label: 'BitLocker', status: 'Enforced', color: 'emerald' },
                                    { label: 'EDR Active', status: 'Protected', color: 'emerald' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3.5 bg-black/20 border border-app-border rounded-2xl group/item hover:bg-app-surface-soft transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full bg-${item.color}-500 shadow-[0_0_8px_rgba(var(--${item.color === 'emerald' ? '16,185,129' : '99,102,241'}),0.6)] animate-pulse`}></div>
                                            <Text className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{item.label}</Text>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg bg-${item.color}-500/10 text-${item.color}-400 text-[8px] font-black uppercase tracking-widest border border-${item.color}-500/20`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fleet Lifecycle Widget */}
                        <div className="lg:col-span-7 glass-panel p-8 border border-slate-300 border-app-border relative overflow-hidden group">
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full"></div>

                            <div className="flex items-center justify-between mb-10 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-['Outfit'] font-black text-app-text tracking-tight uppercase">Fleet Lifecycle</h3>
                                        <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.2em] mt-1 italic">Tactical Aging & Readiness Stats</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] text-app-text-muted text-[10px] font-black border border-slate-300 border-app-border uppercase tracking-widest shadow-lg">Global Feed</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6 mb-10 relative z-10">
                                {[
                                    { label: 'New (0-1y)', value: '42%', color: 'emerald', icon: Check, glow: 'rgba(16,185,129,0.3)' },
                                    { label: 'Mid (1-3y)', value: '38%', color: 'indigo', icon: Activity, glow: 'rgba(99,102,241,0.3)' },
                                    { label: 'EoL (3y+)', value: '20%', color: 'rose', icon: AlertCircle, glow: 'rgba(244,63,94,0.3)' }
                                ].map((item, i) => (
                                    <div key={i} className="p-6 rounded-[2rem] bg-app-surface-soft border border-app-border text-center group/aging hover:bg-slate-200/50 dark:hover:bg-slate-100 dark:bg-white/[0.05] hover:border-indigo-500/20 transition-all duration-500 shadow-xl">
                                        <div className={`w-12 h-12 rounded-2xl bg-${item.color}-500/10 flex items-center justify-center mx-auto mb-4 border border-${item.color}-500/20 shadow-[0_0_15px_${item.glow}] group-hover/aging:scale-110 group-hover/aging:rotate-3 transition-all duration-500`}>
                                            <item.icon size={20} className={`text-${item.color}-400`} />
                                        </div>
                                        <div className="text-xl font-['Outfit'] font-black text-app-text mb-1 drop-shadow-sm">{item.value}</div>
                                        <div className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.2em]">{item.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-8 pt-8 border-t border-app-border relative z-10">
                                <div>
                                    <div className="flex justify-between items-center mb-5">
                                        <span className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                            Live Capacity Allocation
                                        </span>
                                        <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest bg-indigo-500/10 px-4 py-1.5 rounded-xl border border-indigo-500/10 shadow-lg">85% Optimization</span>
                                    </div>
                                    <div className="flex gap-1.5 h-4 w-full rounded-2xl overflow-hidden bg-app-surface p-1 border border-app-border shadow-sm dark:shadow-inner">
                                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 w-[60%] rounded-l-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
                                        <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 w-[25%] shadow-[0_0_15px_rgba(99,102,241,0.3)]"></div>
                                        <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 w-[15%] rounded-r-xl shadow-[0_0_15px_rgba(244,63,94,0.3)]"></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6 mt-8">
                                        {[
                                            { label: 'Active', value: '142 Units', color: 'emerald' },
                                            { label: 'Spare', value: '58 Units', color: 'indigo' },
                                            { label: 'Repair', value: '24 Units', color: 'rose' }
                                        ].map((slot, i) => (
                                            <div key={i} className={`flex flex-col gap-1.5 ${i === 1 ? 'border-x border-app-border px-6' : ''}`}>
                                                <div className={`flex items-center gap-2 ${i === 2 ? 'justify-end' : i === 1 ? 'justify-center' : ''}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full bg-${slot.color}-500 shadow-[0_0_8px_rgba(var(--${slot.color === 'emerald' ? '16,185,129' : slot.color === 'indigo' ? '99,102,241' : '244,63,94'}),0.5)]`}></div>
                                                    <span className="text-[9px] font-black text-app-text-muted uppercase tracking-[0.2em]">{slot.label}</span>
                                                </div>
                                                <div className={`text-sm font-black text-app-text ${i === 2 ? 'text-right' : i === 1 ? 'text-center' : ''}`}>{slot.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SLA & Oversight Widget */}
                    {(user?.persona === 'IT_GOVERNANCE' || user?.persona === 'IT_OPERATIONS' || user?.persona === 'EXECUTIVE_STRATEGY') && (
                        <div className="glass-panel p-10 border border-slate-300 border-app-border shadow-[0_40px_80px_rgba(0,0,0,0.5)] relative overflow-hidden group mb-12 animate-in slide-in-from-bottom-6 duration-700">
                            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full"></div>

                            <div className="flex items-center justify-between mb-12 relative z-10">
                                <div>
                                    <h3 className="text-xl font-['Outfit'] font-black text-app-text tracking-tighter flex items-center gap-5 uppercase">
                                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-lg">
                                            <Activity size={32} />
                                        </div>
                                        SLA & Operational Oversight
                                    </h3>
                                    <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.4em] mt-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.6)]"></span>
                                        Governance Command Registry
                                    </p>
                                </div>
                                <span className="px-6 py-2.5 bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] border border-rose-500/20 rounded-[2rem] shadow-xl shadow-rose-500/5 flex items-center gap-3">
                                    <AlertCircle size={14} /> Critical Sync Active
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 relative z-10">
                                {[
                                    { label: 'Avg Resolution Time', value: '4.2h', trend: '12% Velocity Gain', color: 'indigo', icon: Clock },
                                    { label: 'Overdue Incidents', value: activeTickets.filter(t => t.urgency === 'High').length, trend: 'Tactical Action Reg.', color: 'rose', icon: AlertCircle, isRose: true, action: () => router.push('/tickets/advanced?filter=OVERDUE') },
                                    { label: 'Deployment Velocity', value: '94%', trend: 'Target Synchronized', color: 'sky', icon: Zap }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-app-surface-soft p-8 rounded-[2.5rem] border border-app-border shadow-sm dark:shadow-inner group/stat hover:bg-slate-200 dark:hover:bg-white/[0.04] hover:border-indigo-500/20 transition-all duration-500">
                                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">{stat.label}</label>
                                        <div className={`text-xl font-['Outfit'] font-black ${stat.isRose ? 'text-rose-600 dark:text-rose-500' : 'text-app-text'} drop-shadow-sm group-hover/stat:scale-105 transition-transform origin-left duration-500`}>
                                            {stat.value}
                                        </div>
                                        <div className={`text-[9px] text-${stat.color}-400 font-black uppercase tracking-widest mt-6 flex items-center gap-2 bg-${stat.color}-500/10 w-fit px-4 py-1.5 rounded-xl border border-${stat.color}-500/20 shadow-lg shadow-${stat.color}-500/5 uppercase`}>
                                            <stat.icon size={12} /> {stat.trend}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                {[
                                    { label: 'First Response SLA', value: '98.4%', color: 'emerald' },
                                    { label: 'Tactical Resolution SLA', value: '92.1%', color: 'indigo' }
                                ].map((sla, i) => (
                                    <div key={i} className="p-8 rounded-[2rem] bg-app-surface-soft border border-app-border shadow-sm dark:shadow-inner group-hover:bg-slate-200 dark:group-hover:bg-slate-50 dark:bg-white/[0.02] transition-colors duration-500">
                                        <div className="flex justify-between items-center mb-5">
                                            <span className="text-[11px] font-black text-app-text-muted uppercase tracking-[0.3em] font-['Outfit']">{sla.label}</span>
                                            <span className={`text-sm font-black text-${sla.color}-400 tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]`}>{sla.value}</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-app-surface-soft rounded-full overflow-hidden border border-app-border p-0.5">
                                            <div
                                                className={`h-full bg-gradient-to-r from-${sla.color}-600 to-${sla.color}-400 shadow-[0_0_15px_rgba(var(--${sla.color === 'emerald' ? '16,185,129' : '99,102,241'}),0.4)] rounded-full transition-all duration-1000`}
                                                style={{ width: sla.value }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {pendingQueue.length > 0 && (
                        <div className="glass-panel p-1 border border-slate-300 border-app-border rounded-2xl mb-12 overflow-hidden bg-white dark:bg-white/[0.01]">
                            {/* ... existing table if needed or just a placeholder ... */}
                        </div>
                    )}


                    {/* ===================================================================================== */}
                    {/* MODALS */}
                    {/* ===================================================================================== */}

                    {
                        activeModal && (
                            <>
                                {activeModal === 'REQUEST_DETAILS' && selectedItem && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-app-bg/40 backdrop-blur-xl animate-in fade-in duration-300">
                                        <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-app-border shadow-2xl">
                                            <div className="p-8 border-b border-app-border bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
                                                <div>
                                                    <h3 className="text-2xl font-['Outfit'] font-bold text-app-text tracking-tight">Request Specification</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p
                                                            className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono uppercase tracking-widest opacity-60 cursor-help hover:underline decoration-indigo-400/30 line-clamp-1"
                                                            onClick={() => copyToClipboard(selectedItem.id, 'Request ID')}
                                                            title={`Full ID: ${selectedItem.id} - Click to copy`}
                                                        >
                                                            {formatId(selectedItem.id, selectedItem.assetType === 'Ticket' ? 'ticket' : 'asset', selectedItem)}
                                                        </p>
                                                        <button
                                                            onClick={() => setIsGuideOpen(true)}
                                                            className="p-1 text-app-text-muted hover:text-indigo-500 transition-colors"
                                                            title="View ID Format Guide"
                                                        >
                                                            <Info size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <button onClick={() => setActiveModal('PENDING')} className="p-3 bg-app-surface-soft hover:bg-slate-200 dark:hover:bg-white/[0.08] text-app-text-muted hover:text-slate-900 dark:hover:text-app-text rounded-2xl border border-app-border transition-all">
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                                                <div>
                                                    <label className="text-xs text-app-text-muted uppercase block mb-2">Business Justification</label>
                                                    <div className="text-app-text-muted text-sm whitespace-pre-wrap leading-relaxed bg-app-surface-soft p-6 rounded-3xl border border-app-border">
                                                        {selectedItem.justification || 'No justification telemetry recorded.'}
                                                    </div>
                                                </div>

                                                {selectedItem.business_justification && selectedItem.business_justification !== selectedItem.justification && (
                                                    <div className="mt-4 pt-4 border-t border-app-border">
                                                        <label className="text-xs text-app-text-muted uppercase block mb-2">Detailed Business Justification</label>
                                                        <div className="text-app-text-muted text-sm whitespace-pre-wrap leading-relaxed">
                                                            {selectedItem.business_justification}
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedItem.manager_approvals && selectedItem.manager_approvals.length > 0 && (
                                                    <div>
                                                        <h3 className="text-sm font-bold text-app-text-muted uppercase mb-3 border-b border-app-border pb-2">Approval History</h3>
                                                        <div className="space-y-2">
                                                            {selectedItem.manager_approvals.map((approval, idx) => (
                                                                <div key={idx} className="flex justify-between items-start text-xs bg-slate-50 dark:bg-white/[0.03] p-2 rounded-xl border border-app-border">
                                                                    <div>
                                                                        <span className="font-bold text-slate-200">{approval.reviewer_name}</span>
                                                                        <span className="text-app-text-muted mx-1">({approval.type || 'Review'})</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className={`font-bold ${approval.decision?.includes('REJECT') ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                            {approval.decision}
                                                                        </div>
                                                                        <div className="text-app-text-muted">{new Date(approval.timestamp).toLocaleString()}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-300 border-app-border flex justify-end gap-3 shrink-0">
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt("Enter rejection reason:");
                                                        if (reason) {
                                                            itRejectRequest(selectedItem.id, reason);
                                                            setActiveModal('PENDING');
                                                        }
                                                    }}
                                                    className="px-4 py-2 text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                                                >
                                                    Reject Request
                                                </button>
                                                {selectedItem.status === 'IT_APPROVED' && selectedItem.assetType === 'BYOD' ? (
                                                    <button
                                                        onClick={() => {
                                                            registerByod(selectedItem.id);
                                                            setActiveModal('PENDING');
                                                        }}
                                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-app-text rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-xs uppercase tracking-widest"
                                                    >
                                                        <ShieldCheck size={18} /> Validate & Register BYOD
                                                    </button>
                                                ) : selectedItem.status === 'BYOD_COMPLIANCE_CHECK' && selectedItem.assetType === 'BYOD' ? (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                registerByod(selectedItem.id);
                                                                setActiveModal(null);
                                                            }}
                                                            className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-app-text rounded-xl font-bold shadow-lg shadow-sky-500/20 flex items-center gap-2 text-xs uppercase tracking-widest"
                                                        >
                                                            <ShieldCheck size={18} /> Validate & Register BYOD
                                                        </button>
                                                        <button
                                                            onClick={() => setComplianceModalOpen(true)}
                                                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-app-text rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-xs uppercase tracking-widest"
                                                        >
                                                            <CheckCircle size={18} /> Run Compliance Check
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            itApproveRequest(selectedItem.id);
                                                            setActiveModal('PENDING');
                                                        }}
                                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-app-text rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
                                                    >
                                                        <CheckCircle size={18} /> Approve & Forward
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {
                                    activeModal === 'TICKET_VIEW' && selectedItem && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
                                            <div className="glass-panel overflow-hidden border border-slate-300 border-app-border shadow-2xl animate-in zoom-in-95 duration-300 w-full max-w-2xl max-h-[90vh] flex flex-col">
                                                <div className="p-8 border-b border-app-border bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="text-2xl font-['Outfit'] font-bold text-app-text tracking-tight">Incident Detail</h3>
                                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${selectedItem.priority?.toUpperCase() === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                }`}>
                                                                {selectedItem.priority || 'MEDIUM'} PRIORITY
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p
                                                                className="text-[10px] text-indigo-400 font-mono uppercase tracking-widest opacity-60 cursor-help hover:underline decoration-indigo-400/30"
                                                                onClick={() => copyToClipboard(selectedItem.id, 'Ticket ID')}
                                                                title={`Full ID: ${selectedItem.id} - Click to copy`}
                                                            >
                                                                {formatId(selectedItem.id, 'ticket', selectedItem)}
                                                            </p>
                                                            <button
                                                                onClick={() => setIsGuideOpen(true)}
                                                                className="p-1 text-app-text-muted hover:text-indigo-500 transition-colors"
                                                                title="View ID Format Guide"
                                                            >
                                                                <Info size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setActiveModal(['RESOLVED', 'CLOSED'].includes(selectedItem?.status?.toUpperCase()) ? 'CLOSED_TICKETS' : 'TICKETS')} className="p-3 bg-slate-50 dark:bg-white/[0.03] hover:bg-white/[0.08] text-app-text-muted hover:text-app-text rounded-2xl border border-app-border transition-all">
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                                                    <div>
                                                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1.5">Description & Context</label>
                                                        <h4 className="text-xl font-bold text-slate-200 leading-tight mb-4">{selectedItem.subject}</h4>
                                                        <div className="p-6 bg-slate-50 dark:bg-white/[0.03] rounded-3xl border border-app-border text-app-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                                                            {selectedItem.description || 'No additional telemetry provided for this incident.'}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-app-border">
                                                        <div>
                                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Status</label>
                                                            <div className="text-sm font-bold text-indigo-400 uppercase tracking-widest">{selectedItem.status}</div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Stakeholder</label>
                                                            <div
                                                                className="text-sm font-bold text-app-text-muted cursor-help hover:text-indigo-400"
                                                                onClick={() => copyToClipboard(selectedItem.requestor_id, 'Requester ID')}
                                                                title={`UUID: ${selectedItem.requestor_id || 'N/A'} - Click to copy`}
                                                            >
                                                                {selectedItem.requestor_name || 'System Auto-Gen'}
                                                                <span className="ml-2 text-[10px] opacity-60 font-mono italic">
                                                                    ({formatId(selectedItem.requestor_id || selectedItem.requestor_name, 'user')})
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ALLOCATION SECTION (FOR MANAGERS) */}
                                                    <div className="pt-6 border-t border-app-border">
                                                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">Tactical Allocation</label>
                                                        <div className="flex gap-3">
                                                            <div className="flex-1 relative group">
                                                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                                    <User size={16} className="text-app-text-muted group-focus-within:text-indigo-400 transition-colors" />
                                                                </div>
                                                                <select
                                                                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-300 border-app-border rounded-2xl pl-12 pr-4 py-3.5 text-sm text-app-text-muted focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none transition-all cursor-pointer"
                                                                    value={selectedItem.assigned_to_id || ''}
                                                                    onChange={(e) => handleAssignTicket(e.target.value)}
                                                                    disabled={isAssigning}
                                                                >
                                                                    <option value="">Unassigned Operational Queue</option>
                                                                    {technicians.map(tech => (
                                                                        <option key={tech.id} value={tech.id} className="bg-white dark:bg-slate-900 border-none">
                                                                            {tech.full_name} — {tech.persona?.replace('_', ' ') || tech.role}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                                                    {isAssigning ? <RefreshCw size={16} className="animate-spin text-indigo-500" /> : <ChevronDown size={16} className="text-app-text-muted" />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {
                                                    (!['RESOLVED', 'CLOSED'].includes(selectedItem?.status?.toUpperCase())) && (
                                                        <div className="p-8 border-top border-app-border bg-slate-50 dark:bg-white/[0.02] shrink-0 flex justify-end">
                                                            <button
                                                                onClick={() => { setActiveModal('TICKETS'); openResolveModal(selectedItem); }}
                                                                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-app-text rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all text-sm uppercase tracking-widest flex items-center gap-3"
                                                            >
                                                                START RESOLUTION WIZARD <ArrowRight size={18} />
                                                            </button>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        </div>
                                    )
                                }
                                {/* ---- RESOLVED TICKET DETAILS MODAL ---- */}
                                {
                                    activeModal === 'RESOLVED_TICKET_VIEW' && selectedItem && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
                                            <div className="glass-panel overflow-hidden border border-slate-300 border-app-border shadow-2xl animate-in zoom-in-95 duration-300 w-full max-w-2xl max-h-[90vh] flex flex-col">
                                                <div className="p-8 border-b border-app-border bg-emerald-500/[0.03] flex justify-between items-center shrink-0">
                                                    <div>
                                                        <h3 className="text-2xl font-['Outfit'] font-bold text-app-text tracking-tight flex items-center gap-3">
                                                            <ShieldCheck size={24} className="text-emerald-400" />
                                                            Post-Incident Report
                                                        </h3>
                                                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em] mt-1">Operational Audit Sync</p>
                                                    </div>
                                                    <button onClick={() => setActiveModal('CLOSED_TICKETS')} className="p-3 bg-slate-50 dark:bg-white/[0.03] hover:bg-white/[0.08] text-app-text-muted hover:text-app-text rounded-2xl border border-app-border transition-all">
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                                                    <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-app-border">
                                                        <div className="col-span-2">
                                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Incident Subject</label>
                                                            <div className="text-lg font-bold text-app-text leading-tight">{selectedItem.subject}</div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Impact Agent</label>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div
                                                                    className="text-sm font-bold text-indigo-400 font-mono opacity-80 cursor-help hover:underline"
                                                                    onClick={() => copyToClipboard(selectedItem.id, 'Incident ID')}
                                                                    title={`UUID: ${selectedItem.id} - Click to copy`}
                                                                >
                                                                    {formatId(selectedItem.id, 'ticket', selectedItem)}
                                                                </div>
                                                                <button
                                                                    onClick={() => setIsGuideOpen(true)}
                                                                    className="p-1 text-app-text-muted hover:text-indigo-500 transition-colors"
                                                                    title="View ID Format Guide"
                                                                >
                                                                    <Info size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Requestor</label>
                                                            <div
                                                                className="text-sm font-bold text-app-text-muted cursor-help hover:text-indigo-400"
                                                                onClick={() => copyToClipboard(selectedItem.requestor_id, 'Requester ID')}
                                                                title={`UUID: ${selectedItem.requestor_id || 'N/A'} - Click to copy`}
                                                            >
                                                                {formatId(selectedItem.requestor_id, 'user')}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-4 mb-6">
                                                            <h4 className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] whitespace-nowrap">Resolution Telemetry</h4>
                                                            <div className="h-px w-full bg-app-surface-soft"></div>
                                                        </div>

                                                        <div className="space-y-6">
                                                            <div className="p-6 bg-slate-50 dark:bg-white/[0.03] border border-app-border rounded-3xl shadow-sm dark:shadow-inner">
                                                                <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-3">Diagnostic Summary</label>
                                                                <p className="text-sm text-app-text-muted leading-relaxed whitespace-pre-wrap">
                                                                    {selectedItem.resolution_notes || 'No tactical notes recorded.'}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-4">Verification Trail</label>
                                                                <div className="space-y-2">
                                                                    {selectedItem.resolution_checklist && selectedItem.resolution_checklist.length > 0 ? (
                                                                        selectedItem.resolution_checklist.map((check, idx) => (
                                                                            <div key={idx} className="flex items-center gap-4 p-4 bg-white dark:bg-white/[0.01] border border-app-border rounded-2xl group hover:bg-slate-50 dark:bg-white/[0.03] transition-all">
                                                                                <div className="w-6 h-6 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                                                                                    <CheckCircle size={14} className="text-emerald-400" />
                                                                                </div>
                                                                                <span className="text-sm text-app-text-muted group-hover:text-slate-200 transition-colors">{check.text}</span>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-center py-8 border-2 border-dashed border-app-border rounded-3xl">
                                                                            <p className="text-xs text-app-text-muted font-bold uppercase tracking-widest">No checklist data found</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-8 border-t border-app-border bg-slate-50 dark:bg-white/[0.02] shrink-0 flex justify-end">
                                                    <button
                                                        onClick={() => setActiveModal('CLOSED_TICKETS')}
                                                        className="px-8 py-4 bg-app-surface-soft hover:bg-app-surface text-app-text rounded-2xl font-bold border border-slate-300 border-app-border transition-all text-sm uppercase tracking-widest"
                                                    >
                                                        CLOSE ARCHIVE
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }

                                {/* ---- ITEM VIEW (Deploy / Disposal) MODAL ---- */}
                                {
                                    activeModal === 'ITEM_VIEW' && selectedItem && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
                                            <div className="glass-panel overflow-hidden border border-slate-300 border-app-border shadow-2xl animate-in zoom-in-95 duration-300 w-full max-w-lg flex flex-col">
                                                <div className={`p-8 border-b border-app-border bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center shrink-0`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${selectedItem._viewType === 'deploy'
                                                            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                                            }`}>
                                                            {selectedItem._viewType === 'deploy' ? <Package size={24} /> : <Trash2 size={24} />}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-['Outfit'] font-bold text-app-text tracking-tight">
                                                                {selectedItem._viewType === 'deploy' ? 'Deployment Spec' : 'Disposal Audit'}
                                                            </h3>
                                                            <p className="text-[10px] text-app-text-muted font-black uppercase tracking-widest mt-1">Asset Traceability</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setActiveModal(selectedItem._viewType === 'deploy' ? 'DEPLOY' : 'DISPOSAL')} className="p-3 bg-slate-50 dark:bg-white/[0.03] hover:bg-white/[0.08] text-app-text-muted hover:text-app-text rounded-2xl border border-app-border transition-all">
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                                                    <div>
                                                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1.5">Asset Identity</label>
                                                        <div className="text-lg font-bold text-app-text leading-tight">{selectedItem.name}</div>
                                                        <div className="text-[10px] text-indigo-400 font-mono mt-1 uppercase tracking-widest opacity-60">{selectedItem.id}</div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-app-border">
                                                        {selectedItem._viewType === 'deploy' ? (
                                                            <>
                                                                <div>
                                                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Target User</label>
                                                                    <div className="text-sm font-bold text-app-text-muted">{selectedItem.assignedUser || 'Unassigned'}</div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Stock Location</label>
                                                                    <div className="text-sm font-bold text-app-text-muted">{selectedItem.location || 'Central Lab'}</div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div>
                                                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Serial Hash</label>
                                                                    <div className="text-xs font-mono text-app-text-muted">{selectedItem.serial || 'NOT_LOGGED'}</div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Decom Reason</label>
                                                                    <div className="text-sm font-bold text-rose-400 uppercase tracking-widest">{selectedItem.reason || 'EOL'}</div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Purge Method</label>
                                                                    <div className="text-sm font-bold text-app-text-muted">{selectedItem.method || 'Secure Wipe'}</div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1">Asset Age</label>
                                                                    <div className="text-sm font-bold text-app-text-muted">{selectedItem.age || 'Unknown'}</div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-8 border-t border-app-border bg-slate-50 dark:bg-white/[0.02] shrink-0 flex justify-end">
                                                    <button
                                                        onClick={() => setActiveModal(selectedItem._viewType === 'deploy' ? 'DEPLOY' : 'DISPOSAL')}
                                                        className="px-8 py-4 bg-app-surface-soft hover:bg-app-surface text-app-text rounded-2xl font-bold border border-slate-300 border-app-border transition-all text-sm uppercase tracking-widest"
                                                    >
                                                        CLOSE INSPECTION
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                                {/* ---- BYOD COMPLIANCE CHECK MODAL ---- */}
                                <ComplianceCheckModal
                                    isOpen={complianceModalOpen}
                                    onClose={() => setComplianceModalOpen(false)}
                                    request={selectedItem}
                                    onUpdate={() => refreshData()}
                                />

                                {/* ---- CONFIG WIZARD MODAL (5 STEPS) ---- */}
                                {
                                    activeModal === 'CONFIG' && selectedItem && (
                                        <div className="bg-white dark:bg-slate-900 border border-app-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in scale-95 duration-200 flex flex-col max-h-[90vh]">
                                            <div className="bg-gradient-to-r from-indigo-900/50 to-slate-900 p-6 border-b border-app-border flex justify-between items-center shrink-0">
                                                <div>
                                                    <h2 className="text-xl font-bold text-app-text flex items-center gap-2">
                                                        <Terminal size={20} className="text-indigo-400" />
                                                        Workstation Configuration
                                                    </h2>
                                                    <p className="text-sm text-indigo-300/60 mt-1">Ticket: {selectedItem.id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-mono text-app-text-muted block uppercase tracking-wider">Target User</span>
                                                    <span className="text-sm font-bold text-app-text">{selectedItem.user}</span>
                                                </div>
                                            </div>

                                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                                {/* Steps Indicator */}
                                                <div className="flex justify-between mb-8 px-4">
                                                    {[1, 2, 3, 4, 5].map(s => <ConfigStep key={s} step={s} current={configStep} />)}
                                                </div>

                                                {/* Step Content */}
                                                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-6 border border-app-border min-h-[300px]">

                                                    {/* STEP 1: ASSET OVERVIEW */}
                                                    {configStep === 1 && (
                                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                                            <h3 className="text-lg font-bold text-app-text mb-4">Step 1: Asset Overview</h3>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-app-border">
                                                                    <span className="text-xs text-app-text-muted uppercase">Model</span>
                                                                    <div className="text-app-text font-medium">{selectedItem.model || 'Standard Workstation'}</div>
                                                                </div>
                                                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-app-border">
                                                                    <span className="text-xs text-app-text-muted uppercase">Serial Number</span>
                                                                    <div className="text-app-text font-medium">{selectedItem.serial || 'Unknown'}</div>
                                                                </div>
                                                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-app-border col-span-2">
                                                                    <span className="text-xs text-app-text-muted uppercase">Specs</span>
                                                                    <div className="text-app-text font-medium">{selectedItem.details || 'Standard Configuration'}</div>
                                                                </div>
                                                            </div>
                                                            <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-200 text-sm flex gap-2">
                                                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                                                Please physically verify the serial number matches the asset tag before proceeding.
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* STEP 2: OS SELECTION (NOW SOFTWARE PROVISIONING) */}
                                                    {configStep === 2 && (
                                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                                            <h3 className="text-lg font-bold text-app-text mb-4">Step 2: OS & Image Selection</h3>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                <label className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-500 rounded-lg cursor-pointer">
                                                                    <input type="radio" name="os" defaultChecked className="w-5 h-5 text-indigo-600" />
                                                                    <div>
                                                                        <div className="font-bold text-app-text">Windows 11 Enterprise 23H2 (Stable)</div>
                                                                        <div className="text-xs text-app-text-muted">Standard Corporate Image v4.2</div>
                                                                    </div>
                                                                </label>
                                                                <label className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 border border-app-border rounded-lg cursor-pointer opacity-60">
                                                                    <input type="radio" name="os" className="w-5 h-5 text-indigo-600" />
                                                                    <div>
                                                                        <div className="font-bold text-app-text">Windows 10 Enterprise LTSC</div>
                                                                        <div className="text-xs text-app-text-muted">Legacy Systems Only</div>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* STEP 3: SECURITY TOOLS */}
                                                    {configStep === 3 && (
                                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                                            <h3 className="text-lg font-bold text-app-text mb-4">Step 3: Security Tools Setup</h3>
                                                            <p className="text-sm text-app-text-muted text-app-text-muted mb-4">Manually verify installation or push via MDM.</p>
                                                            <div className="space-y-2">
                                                                <SoftwareInstallItem app="CrowdStrike Falcon Sensor" assetId={selectedItem.id} />
                                                                <SoftwareInstallItem app="Zscaler Client Connector" assetId={selectedItem.id} />
                                                                <SoftwareInstallItem app="Tanium Client" assetId={selectedItem.id} />
                                                                <SoftwareInstallItem app="Local Admin Password Solution (LAPS)" assetId={selectedItem.id} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* STEP 4: NETWORK */}
                                                    {configStep === 4 && (
                                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                                            <h3 className="text-lg font-bold text-app-text mb-4">Step 4: Network Configuration</h3>

                                                            <div className="space-y-4">
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-xs text-app-text-muted text-app-text-muted uppercase font-bold">Domain Join</label>
                                                                    <select className="bg-white dark:bg-slate-900 border border-app-border text-app-text p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                                                        <option>CORP.GLOBAL (Default)</option>
                                                                        <option>DMZ.LOCAL</option>
                                                                        <option>WORKGROUP</option>
                                                                    </select>
                                                                </div>

                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-xs text-app-text-muted text-app-text-muted uppercase font-bold">VLAN Assignment</label>
                                                                    <select className="bg-white dark:bg-slate-900 border border-app-border text-app-text p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                                                        <option>VLAN 100 - Employee Workstations</option>
                                                                        <option>VLAN 200 - Developers</option>
                                                                        <option>VLAN 900 - Guest</option>
                                                                    </select>
                                                                </div>

                                                                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded border border-emerald-500/20">
                                                                    <CheckCircle size={16} />
                                                                    <span>DHCP Reservation Found: 10.20.4.112</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* STEP 5: FINAL VALIDATION */}
                                                    {configStep === 5 && (
                                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                                            <h3 className="text-lg font-bold text-app-text mb-4">Step 5: Final Validation</h3>
                                                            <div className="space-y-3">
                                                                {[
                                                                    "BIOS Password Set",
                                                                    "Physical Damage Check",
                                                                    "BitLocker Encryption Active",
                                                                    "Windows Activated",
                                                                    "Latest Windows Updates Applied"
                                                                ].map((check, i) => (
                                                                    <label key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded border border-app-border cursor-pointer hover:bg-slate-200 dark:bg-slate-700 transition-colors">
                                                                        <input type="checkbox" defaultChecked={i < 3} className="w-5 h-5 rounded text-indigo-600 bg-slate-200 dark:bg-slate-700 border-slate-600 focus:ring-indigo-500" />
                                                                        <span className="text-slate-900 dark:text-slate-200">{check}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-6 flex justify-end gap-3">
                                                    {configStep < 5 ? (
                                                        <>
                                                            <button
                                                                onClick={() => setActiveModal(null)}
                                                                className="px-4 py-2 text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={handleConfigStepComplete}
                                                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-app-text rounded-lg font-semibold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                                            >
                                                                {configStep === 4 ? 'Validate & Finish' : 'Next Step'} <ArrowRight size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={handleConfigStepComplete}
                                                            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-app-text rounded-lg font-semibold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 animate-pulse"
                                                        >
                                                            <CheckCircle size={20} /> Complete Configuration
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                {
                                    ['PENDING', 'TICKETS', 'CLOSED_TICKETS', 'DEPLOY', 'DISPOSAL'].includes(activeModal) && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white dark:bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-300">
                                            <div className="glass-panel overflow-hidden border border-app-border shadow-2xl animate-in zoom-in-95 duration-300 w-full max-w-6xl max-h-[85vh] flex flex-col">
                                                <div className="p-8 border-b border-app-border bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
                                                    <div>
                                                        <h3 className="text-2xl font-['Outfit'] font-bold text-app-text tracking-tight">
                                                            {activeModal === 'PENDING' ? 'Registration & Provisioning' :
                                                                activeModal === 'TICKETS' ? 'Active Operational Incidents' :
                                                                    activeModal === 'CLOSED_TICKETS' ? 'Resolution History' :
                                                                        activeModal === 'DEPLOY' ? 'Ready for Deployment' : 'Asset Disposal Queue'}
                                                        </h3>
                                                        <p className="text-xs text-app-text-muted font-bold uppercase tracking-widest mt-1">
                                                            {activeModal === 'TICKETS' ? 'Priority 1 & Standard Support Queue' : 'Managed Fleet Operations'}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-4 items-center">
                                                        {(activeModal === 'TICKETS' || activeModal === 'CLOSED_TICKETS') && (
                                                            <div className="relative group">
                                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted group-focus-within:text-indigo-400 transition-colors" size={18} />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Scylla Search..."
                                                                    className="pl-12 pr-6 py-2.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-300 border-app-border rounded-2xl text-app-text text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none w-72 transition-all placeholder:text-app-text-muted"
                                                                    value={searchQuery}
                                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                                />
                                                            </div>
                                                        )}
                                                        <button onClick={() => { setActiveModal(null); setSearchQuery(''); }} className="p-3 bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-app-text-muted hover:text-slate-900 dark:hover:text-app-text rounded-2xl border border-app-border transition-all">
                                                            <X size={20} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="overflow-auto custom-scrollbar flex-1">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="sticky top-0 z-10">
                                                            <tr className="bg-slate-100 dark:bg-slate-900/40 backdrop-blur-md border-b border-app-border">
                                                                <th className="p-5 text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em]">Primary Identifier</th>
                                                                <th className="p-5 text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em]">Origin / Stakeholder</th>
                                                                <th className="p-5 text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em]">Categorization</th>
                                                                <th className="p-5 text-right text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em]">Operational Logic</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                                                            {activeModal === 'PENDING' && (incomingRequests.length === 0 ? (
                                                                <tr><td colSpan="4" className="p-4 text-app-text-muted text-app-text-muted text-center">No incoming requests.</td></tr>
                                                            ) : incomingRequests.map(req => (
                                                                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all group border-b border-slate-100 dark:border-white/[0.02]">
                                                                    <td className="p-5">
                                                                        <div className="font-['Outfit'] font-bold text-app-text text-base flex items-center gap-2">
                                                                            {req.assetType || req.title}
                                                                            {req.assetType === 'BYOD' && <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-black uppercase tracking-widest">BYOD</span>}
                                                                        </div>
                                                                        <div className="text-xs text-app-text-muted font-mono mt-1 opacity-60">{req.id}</div>
                                                                    </td>
                                                                    <td className="p-5">
                                                                        <div className="text-sm text-app-text-muted font-semibold">{req.requestedBy?.name || 'Unknown'}</div>
                                                                        <div className="text-[11px] text-app-text-muted mt-1 uppercase tracking-wider font-bold">{req.requestedBy?.role || 'User'} • {req.assetType}</div>
                                                                    </td>
                                                                    <td className="p-5">
                                                                        <div className="flex flex-col gap-1.5">
                                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit border ${req.urgency === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-app-surface-soft text-app-text-muted border-slate-300 border-app-border'}`}>
                                                                                {req.urgency ? req.urgency.toUpperCase() : 'STANDARD'}
                                                                            </span>
                                                                            <div className="text-[10px] text-app-text-muted font-black uppercase tracking-widest ml-1">{req.status}</div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-5 text-right">
                                                                        <div className="flex justify-end gap-3 items-center">
                                                                            <button
                                                                                onClick={() => { setSelectedItem(req); setActiveModal('REQUEST_DETAILS'); }}
                                                                                className="p-2 text-app-text-muted hover:text-slate-900 dark:hover:text-app-text hover:bg-slate-100 dark:hover:bg-app-surface-soft rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-300 border-app-border transition-all"
                                                                                title="View Specifications"
                                                                            >
                                                                                <Eye size={18} />
                                                                            </button>

                                                                            <button
                                                                                onClick={() => {
                                                                                    const reason = prompt("Enter rejection reason Scylla:");
                                                                                    if (reason) itRejectRequest(req.id, reason);
                                                                                }}
                                                                                className="px-4 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl border border-rose-500/10 hover:border-rose-500/30 transition-all"
                                                                            >
                                                                                Discard
                                                                            </button>

                                                                            {req.status === 'IT_APPROVED' && req.assetType === 'BYOD' ? (
                                                                                <button
                                                                                    onClick={() => registerByod(req.id)}
                                                                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-app-text rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all flex items-center gap-2 text-xs"
                                                                                >
                                                                                    <ShieldCheck size={16} /> VALIDATE & COMMIT
                                                                                </button>
                                                                            ) : req.status === 'BYOD_COMPLIANCE_CHECK' && req.assetType === 'BYOD' ? (
                                                                                <div className="flex gap-2">
                                                                                    <button
                                                                                        onClick={() => { setSelectedItem(req); setComplianceModalOpen(true); }}
                                                                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-app-text rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 text-xs"
                                                                                    >
                                                                                        <Activity size={16} /> SCAN COMPLIANCE
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => registerByod(req.id)}
                                                                                        className="px-5 py-2.5 bg-app-surface-soft hover:bg-app-surface text-app-text rounded-xl font-bold border border-slate-300 border-app-border transition-all text-xs"
                                                                                    >
                                                                                        BYPASS & REGISTER
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => itApproveRequest(req.id)}
                                                                                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-app-text rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all text-xs uppercase tracking-widest"
                                                                                >
                                                                                    {req.assetType === 'BYOD' ? 'Initialize Verification' : 'Commit & Allocate'}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )))}

                                                            {activeModal === 'TICKETS' && (displayActiveTickets.length === 0 ? (
                                                                <tr><td colSpan="4" className="p-8 text-app-text-muted font-medium text-center">{isSearching ? 'Synchronizing Scylla...' : 'Operational tranquility: No active incidents.'}</td></tr>
                                                            ) : displayActiveTickets.map(item => (
                                                                <tr key={item.id} className="hover:bg-white/[0.04] transition-all group border-b border-white/[0.02]">
                                                                    <td className="p-5">
                                                                        <div className="font-['Outfit'] font-bold text-app-text text-base leading-tight">{item.subject}</div>
                                                                        <div className="text-[10px] text-indigo-400 font-mono mt-1 uppercase tracking-widest opacity-60">{formatId(item.id, 'ticket', item)}</div>
                                                                    </td>
                                                                    <td className="p-5">
                                                                        <div className="text-sm text-app-text-muted font-semibold">{item.requestedBy?.name || 'Unknown'}</div>
                                                                        <div className="text-[10px] text-app-text-muted mt-1 uppercase tracking-wider font-black">
                                                                            Assigned: <span className="text-blue-400">{item.assignedTo || 'UNALLOCATED'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-5">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className={`w-2 h-2 rounded-full ${item.status?.toUpperCase() === 'IN_PROGRESS' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'} animate-pulse`}></div>
                                                                            <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${item.status?.toUpperCase() === 'IN_PROGRESS' ? 'text-blue-400' : 'text-amber-400'}`}>{item.status}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-5 text-right">
                                                                        <div className="flex justify-end gap-3 items-center">
                                                                            <button
                                                                                onClick={() => { setSelectedItem(item); setActiveModal('TICKET_VIEW'); }}
                                                                                className="p-2 text-app-text-muted hover:text-app-text hover:bg-app-surface-soft rounded-xl border border-transparent hover:border-slate-300 border-app-border transition-all"
                                                                                title="Inspect Payload"
                                                                            >
                                                                                <Eye size={18} />
                                                                            </button>
                                                                            {(item.status?.toUpperCase() === 'OPEN') && (
                                                                                <button
                                                                                    onClick={() => acknowledgeTicket(item.id)}
                                                                                    className="px-4 py-2 text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl border border-blue-500/10 hover:border-blue-500/30 transition-all uppercase tracking-widest"
                                                                                >
                                                                                    Acknowledge
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => openResolveModal(item)}
                                                                                className="px-5 py-2.5 bg-app-surface-soft hover:bg-emerald-600/10 text-app-text-muted hover:text-emerald-400 border border-slate-300 border-app-border hover:border-emerald-500/30 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                                                            >
                                                                                <CheckCircle size={14} /> Commit Fix
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )))}

                                                            {activeModal === 'CLOSED_TICKETS' && (displayClosedTickets.length === 0 ? (
                                                                <tr><td colSpan="4" className="p-8 text-app-text-muted font-medium text-center">{isSearching ? 'Synchronizing Scylla...' : 'Resolution history is currently empty.'}</td></tr>
                                                            ) : displayClosedTickets.map(item => (
                                                                <tr key={item.id} className="hover:bg-white/[0.04] transition-all group border-b border-white/[0.02]">
                                                                    <td className="p-5">
                                                                        <div className="font-['Outfit'] font-bold text-app-text-muted text-base leading-tight opacity-70 group-hover:opacity-100 transition-opacity">{item.subject}</div>
                                                                        <div className="text-[10px] text-app-text-muted font-mono mt-1 uppercase tracking-widest">{formatId(item.id, 'ticket', item)}</div>
                                                                    </td>
                                                                    <td className="p-5">
                                                                        <div className="text-sm text-app-text-muted font-semibold">{item.requestedBy?.name || 'Unknown'}</div>
                                                                        <div className="text-[10px] text-app-text-muted mt-1 uppercase tracking-wider font-bold">
                                                                            Solved by: <span className="text-emerald-500/70">{item.assignedTo || 'System'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-5">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className="w-2 h-2 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                                                                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500/50 group-hover:text-emerald-500 transition-colors">{item.status}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-5 text-right">
                                                                        <div className="flex justify-end gap-3 items-center">
                                                                            <button
                                                                                onClick={() => { setSelectedItem(item); setActiveModal('RESOLVED_TICKET_VIEW'); }}
                                                                                className="px-5 py-2.5 bg-app-surface-soft hover:bg-app-surface text-app-text-muted hover:text-app-text border border-app-border hover:border-app-border-soft rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                                                            >
                                                                                <Eye size={16} /> Audit Trail
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )))}

                                                            {
                                                                activeModal === 'DEPLOY' && (deployedArgs.length === 0 ? (
                                                                    <tr><td colSpan="4" className="p-8 text-app-text-muted font-medium text-center">No assets staged for deployment.</td></tr>
                                                                ) : deployedArgs.map(item => (
                                                                    <tr key={item.id} className="hover:bg-white/[0.04] transition-all group border-b border-white/[0.02]">
                                                                        <td className="p-5">
                                                                            <div className="font-['Outfit'] font-bold text-app-text text-base leading-tight">{item.name}</div>
                                                                            <div className="text-[10px] text-indigo-400 font-mono mt-1 uppercase tracking-widest opacity-60">{formatId(item.id, 'asset', item)}</div>
                                                                        </td>
                                                                        <td className="p-5">
                                                                            <div className="text-sm text-app-text-muted font-semibold">{item.assignedUser || 'Unassigned'}</div>
                                                                            <div className="text-[10px] text-app-text-muted mt-1 uppercase tracking-wider font-bold">{item.location || 'Central Stockroom'}</div>
                                                                        </td>
                                                                        <td className="p-5">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">STAGED</span>
                                                                                <div className="flex items-center gap-1 text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">
                                                                                    <Shield size={10} /> Secure
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-5 text-right">
                                                                            <div className="flex justify-end gap-3 items-center">
                                                                                <button
                                                                                    onClick={() => { setSelectedItem({ ...item, _viewType: 'deploy' }); setActiveModal('ITEM_VIEW'); }}
                                                                                    className="p-2 text-app-text-muted hover:text-app-text hover:bg-app-surface-soft rounded-xl border border-transparent hover:border-slate-300 border-app-border transition-all"
                                                                                    title="Inspect Asset"
                                                                                >
                                                                                    <Eye size={18} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleGenerateAck(item)}
                                                                                    className="px-4 py-2 text-xs font-bold text-app-text-muted hover:text-app-text hover:bg-app-surface rounded-xl border border-app-border hover:border-app-border-soft transition-all flex items-center gap-2 uppercase tracking-widest"
                                                                                >
                                                                                    <Printer size={14} /> ACK
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => deployAsset(item.id)}
                                                                                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-app-text rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all text-xs uppercase tracking-widest"
                                                                                >
                                                                                    DEPLOY
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr >
                                                                )))
                                                            }

                                                            {
                                                                activeModal === 'DISPOSAL' && (disposalQueue.length === 0 ? (
                                                                    <tr><td colSpan="4" className="p-8 text-app-text-muted font-medium text-center">Disposal queue is sanitized and empty.</td></tr>
                                                                ) : disposalQueue.map(item => (
                                                                    <tr key={item.id} className="hover:bg-white/[0.04] transition-all group border-b border-white/[0.02]">
                                                                        <td className="p-5">
                                                                            <div className="font-['Outfit'] font-bold text-app-text text-base leading-tight">{item.name}</div>
                                                                            <div className="text-[10px] text-rose-400 font-mono mt-1 uppercase tracking-widest opacity-60">{formatId(item.id, 'asset', item)}</div>
                                                                        </td>
                                                                        <td className="p-5">
                                                                            <div className="text-sm text-app-text-muted font-semibold">{item.reason || 'End of Life'}</div>
                                                                            <div className="text-[10px] text-app-text-muted mt-1 uppercase tracking-wider font-bold">WIPE STATUS: <span className="text-amber-400">{item.wipeStatus || 'PENDING'}</span></div>
                                                                        </td>
                                                                        <td className="p-5">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-500/20">SCHEDULED</span>
                                                                                {item.isSecure && (
                                                                                    <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                                                                                        <Shield size={10} /> ENCRYPTED
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-5 text-right">
                                                                            <div className="flex justify-end gap-3 items-center">
                                                                                <button
                                                                                    onClick={() => { setSelectedItem(item); setActiveModal('DISPOSAL_DETAILS'); }}
                                                                                    className="p-2 text-app-text-muted hover:text-app-text hover:bg-app-surface-soft rounded-xl border border-transparent hover:border-slate-300 border-app-border transition-all"
                                                                                    title="Audit Specs"
                                                                                >
                                                                                    <Eye size={18} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const certId = `SEC-WIPE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                                                                                        if (confirm(`Authorize Secure Destruction for ${item.id}?\nSanitization Certificate: ${certId}`)) {
                                                                                            processDisposal(item.id, certId);
                                                                                        }
                                                                                    }}
                                                                                    className="px-6 py-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-app-text border border-rose-500/20 hover:border-rose-600 rounded-xl font-bold transition-all text-xs uppercase tracking-widest shadow-lg shadow-rose-500/5 hover:shadow-rose-500/20"
                                                                                >
                                                                                    PURGE ASSET
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr >
                                                                )))
                                                            }
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                {/* ---- TICKET RESOLUTION WIZARD (3 STEPS) ---- */}
                                {activeModal === 'RESOLVE_TICKET' && selectedItem && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
                                        <div className="glass-panel overflow-hidden border border-slate-300 border-app-border shadow-2xl animate-in zoom-in-95 duration-300 w-full max-w-2xl max-h-[90vh] flex flex-col">
                                            <div className="p-8 border-b border-app-border bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/10">Incident Resolution</span>
                                                        <span className="text-[10px] text-app-text-muted font-bold">STEP {resolutionStep} OF 3</span>
                                                    </div>
                                                    <h3 className="text-2xl font-['Outfit'] font-bold text-app-text tracking-tight">
                                                        {resolutionStep === 1 ? 'Diagnostic Review' : resolutionStep === 2 ? 'Resolution Protocol' : 'Final Verification'}
                                                    </h3>
                                                </div>
                                                <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-50 dark:bg-white/[0.03] hover:bg-white/[0.08] text-app-text-muted hover:text-app-text rounded-2xl border border-app-border transition-all">
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                                                {resolutionStep === 1 && (
                                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                                        <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10">
                                                            <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                <Info size={14} /> Subject Analysis
                                                            </h4>
                                                            <p className="text-lg text-app-text font-medium mb-2">{selectedItem.subject}</p>
                                                            <p className="text-sm text-app-text-muted leading-relaxed">{selectedItem.description}</p>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-app-border">
                                                                <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Reporter</div>
                                                                <div className="text-sm text-app-text font-bold">{selectedItem.requestedBy?.name}</div>
                                                            </div>
                                                            <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-app-border">
                                                                <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Created</div>
                                                                <div className="text-sm text-app-text font-bold">{new Date(selectedItem.createdAt).toLocaleDateString()}</div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <h4 className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Diagnostic Checklist</h4>
                                                            {[
                                                                "User identity verified via SSO logs",
                                                                "Hardware diagnostic telemetry clear",
                                                                "Impact scope confirmed (Individual)",
                                                                "Prior resolution history reviewed"
                                                            ].map((item, i) => (
                                                                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-app-border">
                                                                    <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                                                        <Check size={12} />
                                                                    </div>
                                                                    <span className="text-xs text-app-text-muted">{item}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {resolutionStep === 2 && (
                                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Resolution Category</label>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                {['Fixed', 'Workaround', 'Referral'].map(type => (
                                                                    <button
                                                                        key={type}
                                                                        onClick={() => setResolutionType(type)}
                                                                        className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${resolutionType === type ? 'bg-indigo-600 border-indigo-500 text-app-text shadow-lg' : 'bg-slate-50 dark:bg-white/[0.02] border-slate-300 border-app-border text-app-text-muted hover:bg-app-surface-soft'}`}
                                                                    >
                                                                        {type}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Resolution Summary</label>
                                                            <textarea
                                                                className="w-full h-32 bg-slate-50 dark:bg-white/[0.03] border border-slate-300 border-app-border rounded-2xl p-4 text-app-text text-sm focus:outline-none focus:border-indigo-500 transition-all"
                                                                placeholder="Detail the technical steps taken to remediate this incident..."
                                                                value={resolutionNotes}
                                                                onChange={(e) => setResolutionNotes(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {resolutionStep === 3 && (
                                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                                        <div className="text-center py-6">
                                                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-4 border-emerald-500/30 mx-auto mb-6">
                                                                <CheckCircle size={40} className="text-emerald-400" />
                                                            </div>
                                                            <h4 className="text-xl font-bold text-app-text mb-2">Ready for Archive</h4>
                                                            <p className="text-sm text-app-text-muted">All resolution steps have been logged. Resolution will be synced to Neural Cache.</p>
                                                        </div>

                                                        <div className="p-6 bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-app-border space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-app-text-muted">
                                                                <span>Resolution Type</span>
                                                                <span className="text-indigo-400">{resolutionType}</span>
                                                            </div>
                                                            <div className="h-px bg-app-surface-soft"></div>
                                                            <div className="space-y-2">
                                                                <div className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Summary Preview</div>
                                                                <div className="text-xs text-app-text-muted italic">"{resolutionNotes || 'No summary provided'}"</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-8 border-t border-app-border bg-slate-50 dark:bg-white/[0.02] shrink-0 flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    {[1, 2, 3].map(step => (
                                                        <div key={step} className={`w-8 h-1 rounded-full ${resolutionStep >= step ? 'bg-indigo-500' : 'bg-app-surface'}`}></div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-4">
                                                    {resolutionStep > 1 && <button onClick={() => setResolutionStep(resolutionStep - 1)} className="px-6 py-2.5 bg-app-surface-soft hover:bg-app-surface text-app-text rounded-xl font-bold transition-all text-xs uppercase tracking-widest">Back</button>}
                                                    {resolutionStep < 3 ? (
                                                        <button onClick={() => setResolutionStep(resolutionStep + 1)} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-app-text rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all text-xs uppercase tracking-widest">Next</button>
                                                    ) : (
                                                        <button onClick={submitResolution} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-app-text rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all text-xs uppercase tracking-widest">Resolve & Close</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ---- BYOD EXIT DETAILS ---- */}
                                {activeModal === 'BYOD_EXIT_DETAILS' && selectedItem && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
                                        <div className="glass-panel overflow-hidden border border-slate-300 border-app-border shadow-2xl animate-in zoom-in-95 duration-300 w-full max-w-2xl max-h-[90vh] flex flex-col">
                                            <div className="p-8 border-b border-app-border bg-slate-50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
                                                <div>
                                                    <h3 className="text-2xl font-['Outfit'] font-bold text-app-text tracking-tight flex items-center gap-3">
                                                        <ShieldCheck className="text-blue-400" size={24} />
                                                        BYOD Offboarding
                                                    </h3>
                                                    <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.2em] mt-1">Managed Exit Protocol</p>
                                                </div>
                                                <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-50 dark:bg-white/[0.03] hover:bg-white/[0.08] text-app-text-muted hover:text-app-text rounded-2xl border border-app-border transition-all">
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                                                {/* User Payload Info */}
                                                <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-white/[0.03] rounded-3xl border border-app-border shadow-sm dark:shadow-inner">
                                                    <div>
                                                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1.5">Stakeholder</label>
                                                        <div className="text-base font-bold text-app-text leading-none">{selectedItem.user_name || 'Unknown'}</div>
                                                        <div className="text-xs text-indigo-400 font-mono mt-1 opacity-70">{selectedItem.user_email || selectedItem.user_id}</div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest block mb-1.5">Organization</label>
                                                        <div className="text-base font-bold text-app-text-muted leading-none">{selectedItem.user_department || 'General Operations'}</div>
                                                        <div className="text-[10px] text-app-text-muted font-black uppercase tracking-widest mt-1">Scylla Identified</div>
                                                    </div>
                                                </div>

                                                {/* BYOD Devices Snapshot */}
                                                <div>
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <h4 className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] whitespace-nowrap">Provisioned Personal Assets</h4>
                                                        <div className="h-px w-full bg-app-surface-soft"></div>
                                                    </div>

                                                    {selectedItem.byod_snapshot && selectedItem.byod_snapshot.length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {selectedItem.byod_snapshot.map((device, idx) => (
                                                                <div key={idx} className="p-5 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:bg-white/[0.05] border border-app-border rounded-2xl transition-all group shadow-sm">
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/10 group-hover:scale-110 transition-transform">
                                                                            <Smartphone size={20} className="text-blue-400" />
                                                                        </div>
                                                                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                                                                            {device.os_version?.toUpperCase() || 'OS'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="font-['Outfit'] font-bold text-app-text text-base leading-tight">{device.device_model}</div>
                                                                    <div className="text-[10px] text-app-text-muted font-mono mt-1 opacity-60">SN: {device.serial_number}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-12 bg-slate-50 dark:bg-white/[0.02] border-2 border-dashed border-app-border rounded-3xl">
                                                            <p className="text-xs text-app-text-muted font-bold uppercase tracking-widest">No verified device snapshots found</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-8 border-t border-app-border bg-slate-50 dark:bg-white/[0.02] shrink-0 flex gap-4">
                                                <button
                                                    onClick={() => setActiveModal(null)}
                                                    className="flex-1 px-6 py-4 bg-app-surface-soft hover:bg-app-surface text-app-text rounded-2xl font-bold border border-slate-300 border-app-border transition-all text-sm uppercase tracking-widest"
                                                >
                                                    Retain Assets
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Authorize MDM Unenrollment & Sanitization for ${selectedItem.user_name || selectedItem.user_id}?`)) {
                                                            await processExitByod(selectedItem.id);
                                                            setActiveModal(null);
                                                        }
                                                    }}
                                                    className="flex-[2] px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-app-text rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3"
                                                >
                                                    <ShieldAlert size={20} /> EXECUTE DE-REGISTRATION
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    {/* --- BYOD EXIT COMPLIANCE TABLE --- */}
                    <Card
                        className="!bg-white dark:!bg-white dark:bg-slate-900 shadow-sm border-slate-100 border-app-border overflow-hidden"
                        styles={{ body: { padding: 0 } }}
                    >
                        <div className="px-6 py-5 border-b border-slate-100 border-app-border flex items-center justify-between">
                            <div>
                                <Title level={4} className="!m-0 !text-lg font-bold text-app-text">BYOD Exit Compliance</Title>
                                <Text className="text-xs text-app-text-muted">Managing device de-registration for departing personnel</Text>
                            </div>
                            <Space>
                                <Badge count={`${exitRequests.filter(r => r.status === 'OPEN' || r.status === 'ASSETS_PROCESSED').length} Urgent Actions`} overflowCount={99} color="#ef4444" className="!text-[10px] font-bold" />
                            </Space>
                        </div>

                        <Table
                            dataSource={exitRequests.filter(r => r.status === 'OPEN' || r.status === 'ASSETS_PROCESSED')}
                            rowKey="id"
                            pagination={false}
                            className="custom-antd-table"
                            columns={[
                                {
                                    title: 'Employee Name',
                                    key: 'user',
                                    render: (record) => (
                                        <Space size={12}>
                                            <Avatar className="bg-indigo-50 text-indigo-600 font-bold !text-xs">
                                                {(record.user_name || record.user_id || 'JW').split(' ').map(n => n[0]).join('')}
                                            </Avatar>
                                            <Text className="text-sm font-semibold text-app-text">{record.user_name || record.user_id}</Text>
                                        </Space>
                                    )
                                },
                                {
                                    title: 'Device Model',
                                    key: 'device',
                                    render: (record) => (
                                        <div>
                                            <Text className="text-sm text-app-text-muted font-medium">
                                                {record.byod_snapshot?.[0]?.device_model || 'Personal Device'}
                                            </Text>
                                            <div className="text-[11px] text-app-text-muted font-mono">
                                                SN: {record.byod_snapshot?.[0]?.serial_number || 'N/A'}
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    title: 'Offboarding Date',
                                    key: 'date',
                                    render: (record) => (
                                        <Text className="text-sm text-app-text-muted">
                                            {record.id.startsWith('EXIT') ? 'Oct 24, 2023' : 'Recently'}
                                        </Text>
                                    )
                                },
                                {
                                    title: 'Status',
                                    key: 'status',
                                    render: (record) => (
                                        <Tag color={record.status === 'OPEN' ? 'warning' : 'success'} className="!text-[10px] font-bold uppercase rounded-md py-0.5 px-2">
                                            {record.status === 'OPEN' ? 'Pending' : 'Verified'}
                                        </Tag>
                                    )
                                },
                                {
                                    title: 'Actions',
                                    key: 'actions',
                                    align: 'right',
                                    render: (record) => (
                                        <Space size={8}>
                                            <button
                                                className="px-3 py-1 bg-white border border-slate-200 text-app-text-muted text-xs font-bold rounded-lg hover:bg-slate-50 transition-all"
                                                onClick={() => { setSelectedItem(record); setActiveModal('BYOD_EXIT_DETAILS'); }}
                                            >
                                                Review
                                            </button>
                                            <button
                                                className="px-3 py-1 bg-rose-600 text-app-text text-xs font-bold rounded-lg hover:bg-rose-500 transition-all"
                                                onClick={async () => {
                                                    if (confirm(`Confirm MDM unenrollment and data wipe for BYOD devices belonging to ${record.user_name || record.user_id}?`)) {
                                                        await processExitByod(record.id);
                                                    }
                                                }}
                                            >
                                                De-register
                                            </button>
                                        </Space>
                                    )
                                }
                            ]}
                        />
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 border-app-border">
                            <Button type="link" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 p-0 flex items-center gap-1">
                                Show all compliance records <ArrowRight size={14} />
                            </Button>
                        </div>
                    </Card>

                    {/* Support Floating Action Button */}
                    <div className="fixed bottom-8 right-8 z-40">
                        <div className="w-12 h-12 bg-white dark:bg-slate-900 hover:bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center group cursor-pointer transition-all">
                            <Activity className="text-app-text group-hover:rotate-12 transition-transform" size={24} />
                        </div>
                    </div>

                    <SmartIdGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
                </Content>
            </Layout>
        </ConfigProvider>
    );
}

