import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Package, CheckCircle, AlertTriangle, Clock, Activity, Download, Plus, Layers, LayoutGrid, Calendar, ArrowUpRight, DollarSign, TrendingDown, ShoppingBag, LogOut, Trash, FileText, Filter, Search, UserPlus, Users, Settings, Scan, RefreshCw, Eye, ShieldCheck, X, Terminal, AlertCircle, ChevronRight, Wallet, Monitor, Sparkles } from 'lucide-react'
import AlertsFeed from '@/components/AlertsFeed'
import SecurityWidget from './SecurityWidget'
import WorkflowVisualizer from '@/components/WorkflowVisualizer'
import QuickScanner from '@/components/Scanner/QuickScanner';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/components/common/Toast';
import { useAssetContext } from '@/contexts/AssetContext'; // Added context
import { sanitizeAsset, calculateDashboardStats } from '@/utils/assetNormalizer';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';

export default function SystemAdminDashboard({ forceView }) {
    const toast = useToast();
    const router = useRouter()
    const { ROLES, user: currentUser, currentRole, isAdmin } = useRole();
    // Asset Context for Requests
    const { incomingRequests, activeTickets, itApproveRequest, itRejectRequest, registerByod } = useAssetContext();

    const [loading, setLoading] = useState(true)
    // Dedicated pages: forceView from route; analytics lives on its own page, so only Overview or Requests here
    const timeRange = forceView || (router.query.view === 'requests' ? 'Requests' : 'Overview')
    const roleSlug = router.query.role || 'system-admin'
    const [pendingUsers, setPendingUsers] = useState([])
    const [scanning, setScanning] = useState(false)
    const [adSyncing, setAdSyncing] = useState(false)
    const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false)

    // Modal State
    const [activeModal, setActiveModal] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [configStep, setConfigStep] = useState(1); // For config modal if needed

    const [allAssets, setAllAssets] = useState([]);

    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        repair: 0,
        warranty_risk: 0,
        total_value: 0,
        discovered: 0, // Added discovered count here
        by_status: [],
        by_segment: [],
        by_type: [],
        by_location: [],
        trends: { monthly: [], quarterly: [] }
    });

    const [saasStats, setSaasStats] = useState({
        total_licenses: 0,
        monthly_spend: 0,
        discovered_count: 0
    });

    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [assetResponse, apiLicenses, statsResponse] = await Promise.all([
                    apiClient.getAssets(),
                    apiClient.getSoftwareLicenses(),
                    apiClient.getAssetStats()
                ]);

                const apiAssets = assetResponse.data || [];

                setAllAssets(apiAssets.map(sanitizeAsset));
                setStats(statsResponse);
                setStatsLoading(false);

                // Calculate SaaS stats
                const sStats = {
                    total_licenses: apiLicenses.length,
                    monthly_spend: apiLicenses.reduce((acc, curr) => acc + (curr.cost || 0), 0),
                    discovered_count: apiLicenses.filter(l => l.is_discovered).length
                };
                setSaasStats(sStats);

                setLoading(false);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
                setAllAssets([]);
                setLoading(false);
            }
        };
        loadDashboardData();
    }, []);

    const [activeUsers, setActiveUsers] = useState([])
    const [exitRequests, setExitRequests] = useState([])
    const [activeRequestsTab, setActiveRequestsTab] = useState('asset')

    const fetchPendingUsers = async () => {
        try {
            if (!currentUser) return;
            const pendingResponse = await apiClient.getUsers({ status: 'PENDING' });
            const pending = pendingResponse.data || [];
            setPendingUsers(pending);
            const activeResponse = await apiClient.getUsers({ status: 'ACTIVE' });
            const active = activeResponse.data || [];
            setActiveUsers(active);

            const exits = await apiClient.getExitRequests();
            setExitRequests(exits);
        } catch (error) {
            console.error('Failed to fetch pending users:', error);
        }
    }

    const handleActivateUser = async (userId) => {
        try {
            if (!currentUser) return;
            await apiClient.activateUser(userId);
            // Refresh list
            fetchPendingUsers();
        } catch (error) {
            console.error('Failed to activate user:', error);
            toast.error('Failed to activate user: ' + error.message);
        }
    }

    const handleDenyUser = async (userId) => {
        if (!confirm('Are you sure you want to deny this access request?')) return;
        try {
            if (!currentUser) return;
            await apiClient.denyUser(userId);
            // Refresh list
            fetchPendingUsers();
        } catch (error) {
            console.error('Failed to deny user:', error);
            toast.error('Failed to deny user: ' + error.message);
        }
    }

    const handleNetworkScan = async () => {
        const cidr = prompt("Enter Network Range to Scan (CIDR):", "192.168.1.0/24");
        if (!cidr) return;

        setScanning(true);
        try {
            const result = await apiClient.triggerNetworkScan(cidr);
            toast.success(`Scan Complete: ${result.message}`);
            // Refresh assets
            const assetResponse = await apiClient.getAssets();
            const apiAssets = assetResponse.data || [];
            setAllAssets(apiAssets.map(sanitizeAsset));
        } catch (error) {
            console.error('Scan failed:', error);
            toast.error('Scan failed: ' + error.message);
        } finally {
            setScanning(false);
        }
    }

    const handleAdSync = async () => {
        setAdSyncing(true);
        try {
            const result = await apiClient.triggerAdSync();
            toast.success(`AD Sync Complete: ${result.message}`);
        } catch (error) {
            console.error('AD Sync failed:', error);
            toast.error('AD Sync failed: ' + error.message);
        } finally {
            setAdSyncing(false);
        }
    }

    const handleDeactivateUser = async (userId) => {
        if (!confirm('Are you sure you want to deactivate this account directly? This skips the official exit process.')) return;
        try {
            if (!currentUser) return;
            await apiClient.denyUser(userId);
            fetchPendingUsers();
        } catch (error) {
            console.error('Failed to deactivate user:', error);
            toast.error('Failed to deactivate user: ' + error.message);
        }
    }

    const handleInitiateExit = async (userId) => {
        if (!confirm('Are you sure you want to initiate the exit process for this user? This will create an exit request and reclaim assets.')) return;
        try {
            if (!currentUser) return;
            await apiClient.initiateExit(userId);
            fetchPendingUsers();
        } catch (error) {
            console.error('Failed to initiate exit:', error);
            toast.error('Failed to initiate exit: ' + error.message);
        }
    }

    const handleCompleteExit = async (requestId) => {
        if (!confirm('Are you sure you want to finalize this exit? This will deactivate the user account permanently.')) return;
        try {
            if (!currentUser) return;
            await apiClient.completeExitRequest(requestId);
            fetchPendingUsers();
            toast.success('Exit process completed successfully. User account has been deactivated.');
        } catch (error) {
            console.error('Failed to complete exit:', error);
            toast.error('Failed to complete exit: ' + error.message);
        }
    }

    useEffect(() => {
        if (timeRange === 'Requests') {
            fetchPendingUsers();
        }
    }, [timeRange, currentUser]);

    useEffect(() => {
        if (isAdmin && currentUser?.id) fetchPendingUsers();
    }, [isAdmin, currentUser?.id]);

    useEffect(() => {
        if (allAssets.length > 0 && stats.total === 0) {
            // Fallback for initial load if stats haven't arrived but assets have
            // This is mostly legacy now but keeps the UI safe
            const newStats = calculateDashboardStats(allAssets);
            if (newStats) setStats(newStats);
        }
    }, [allAssets, stats.total]);

    const handleExport = () => {
        if (!allAssets || allAssets.length === 0) return
        const headers = ["Asset Name", "Segment", "Type", "Model", "Serial Number", "Status", "Cost", "Location", "Assigned To", "Assigned By", "Purchase Date"]
        const csvContent = [
            headers.join(','),
            ...allAssets.map(asset => [
                `"${asset.name}"`,
                `"${asset.segment}"`,
                `"${asset.type}"`,
                `"${asset.model}"`,
                `"${asset.serial_number}"`,
                `"${asset.status}"`,
                `"${asset.cost || 0}"`,
                `"${asset.location}"`,
                `"${asset.assigned_to || ''}"`,
                `"${asset.assigned_by || ''}"`,
                `"${asset.purchase_date || ''}"`
            ].join(','))
        ].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', 'asset_inventory_report.csv')
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }

    if (loading) return (
        <div className="flex h-screen items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
                </div>
                <p className="text-app-text-muted font-medium animate-pulse">Loading Dashboard...</p>
            </div>
        </div>
    )

    const StatCard = ({ title, value, subtext, icon: Icon, colorClass, gradient, trend }) => (
        <div className="glass-panel !p-6 relative group transition-all duration-500 overflow-hidden border-white/5 hover:border-primary/50">
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/40 group-hover:border-primary"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/40 group-hover:border-primary"></div>
            
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 border border-primary/20 bg-primary/5 flex items-center justify-center relative overflow-hidden group-hover:border-primary/40 group-hover:bg-primary/10 transition-colors">
                        <Icon className="text-primary/70 group-hover:text-primary transition-colors" size={20} />
                    </div>
                    {trend && (
                        <div className="px-2 py-0.5 border border-success/30 bg-success/5 text-[9px] font-mono text-success uppercase tracking-widest shadow-[0_0_10px_rgba(var(--color-success),0.2)]">
                            {trend}
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    <h3 className="text-2xl font-mono font-bold text-app-text tracking-tighter mb-1.5 group-hover:text-primary transition-colors">
                        {value}
                    </h3>
                    <p className="text-[9px] font-bold text-app-text-muted uppercase tracking-[0.2em]">
                        {title}
                    </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold text-app-text-muted/60 uppercase tracking-widest truncate max-w-[140px] italic">{subtext}</span>
                        <ArrowUpRight size={10} className="text-app-text-muted/40 group-hover:text-primary transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-app-bg text-app-text font-['Space_Grotesk'] relative overflow-x-hidden selection:bg-primary/30">
            
            {/* BACKGROUND TELEMETRY LAYERS */}
            <div className="fixed inset-0 pointer-events-none opacity-20 select-none z-0">
                <div className="absolute top-4 left-4 text-[9px] space-y-1 text-primary/50 uppercase tracking-tight font-mono">
                    <div>LAT: 40.7128° N</div>
                    <div>LNG: 74.0060° W</div>
                    <div>UTC: {new Date().toISOString()}</div>
                </div>
                {/* Tactical grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"></div>
            </div>

            {/* SCANNING LINE */}
            <div className="fixed top-0 left-0 w-full h-[2px] bg-primary/10 shadow-[0_0_20px_rgba(var(--color-primary),0.2)] animate-scan z-50 pointer-events-none"></div>

            <div className="relative z-10 w-full px-4 md:px-10 lg:px-12 py-8 space-y-8 neural-compact max-w-[1600px] mx-auto">
                
                {/* HEADER SECTION */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="relative">
                        <div className="absolute -left-6 top-1 bottom-1 w-[2px] bg-primary shadow-[0_0_15px_rgba(var(--color-primary),0.5)]"></div>
                        <div className="flex items-center gap-4 mb-2">
                            <h2 className="text-3xl font-bold tracking-[0.1em] uppercase text-app-text">
                                {timeRange === 'Requests' ? 'Operational_Registry' : 'Executive_Control'}
                                <span className="text-primary animate-pulse ml-2">_</span>
                            </h2>
                            <div className="px-2 py-0.5 border border-primary/30 bg-primary/5 text-[9px] font-mono text-primary/60 tracking-widest">
                                B6.H1.L4
                            </div>
                        </div>
                        <p className="text-app-text-muted text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3">
                            {timeRange === 'Requests' ? (
                                <><Activity size={14} className="text-primary animate-pulse" /> Asset Lifecycle & Permission Matrix</>
                            ) : (
                                <><ShieldCheck size={14} className="text-success" /> Inventory Status & Security Protocol Hub</>
                            )}
                        </p>
                    </div>

                    {/* TOP ACTION BELT (Moved to top level for urgency) */}
                    <div className="flex flex-wrap items-center gap-2 bg-white/5 p-2 border border-white/5 backdrop-blur-md">
                        {isAdmin && (
                            <>
                                <button
                                    onClick={handleAdSync}
                                    disabled={adSyncing}
                                    className={`px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition-all border ${adSyncing ? 'bg-primary/10 text-primary/40 border-primary/10' : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 hover:border-primary shadow-[0_0_10px_rgba(var(--color-primary),0.1)]'}`}
                                >
                                    <RefreshCw size={12} className={`inline-block mr-2 ${adSyncing ? 'animate-spin' : ''}`} />
                                    {adSyncing ? 'Syncing...' : 'Sync_AD'}
                                </button>
                                <button
                                    onClick={handleNetworkScan}
                                    disabled={scanning}
                                    className={`px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition-all border ${scanning ? 'bg-success/10 text-success/40 border-success/10' : 'bg-success/5 text-success border-success/20 hover:bg-success/10 hover:border-success shadow-[0_0_10px_rgba(var(--color-success),0.1)]'}`}
                                >
                                    <Activity size={12} className={`inline-block mr-2 ${scanning ? 'animate-pulse' : ''}`} />
                                    {scanning ? 'Scanning...' : 'Net_Discovery'}
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setBarcodeScannerOpen(true)}
                            className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest bg-amber-500/5 text-amber-500 border border-amber-500/20 hover:border-amber-500 transition-all"
                        >
                            <Scan size={12} className="inline-block mr-2" />
                            Hardware_Scan
                        </button>
                        <Link href="/assets/add" className="ml-2">
                            <button className="px-6 py-2 text-[9px] font-bold uppercase tracking-widest bg-primary text-white border border-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--color-primary),0.4)] transition-all">
                                <Plus size={14} className="inline-block mr-2" strokeWidth={3} />
                                Init_Asset
                            </button>
                        </Link>
                    </div>
                </div>

                {timeRange === 'Overview' && (
                    <ActionsNeededBanner
                        title="Actions needed"
                        items={[
                            ...(pendingUsers.length > 0 ? [{ label: 'Pending user approvals', count: pendingUsers.length, icon: UserPlus, variant: 'primary' }] : []),
                            ...(exitRequests.length > 0 ? [{ label: 'Exit requests', count: exitRequests.length, icon: LogOut, variant: 'warning' }] : []),
                            ...((incomingRequests?.length || 0) > 0 ? [{ label: 'Asset requests (IT)', count: incomingRequests.length, icon: Terminal, variant: 'info' }] : []),
                        ]}
                    />
                )}

                {timeRange === 'Overview' && (
                    <div className="flex flex-col xl:flex-row items-center justify-between gap-8 mb-12">
                        {/* Unified Command Bar */}
                        <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-100/50 dark:bg-white/[0.03] p-3 border border-app-border backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.4)] w-full xl:w-auto overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                            {/* View Toggles */}
                            <div className="flex bg-slate-200/50 dark:bg-black/20 p-1.5 border border-app-border w-full md:w-auto relative z-10">
                                {[
                                    { view: 'Overview', icon: LayoutGrid, href: `/dashboard/${roleSlug}` },
                                    { view: 'Analytics', icon: Activity, href: `/dashboard/${roleSlug}/analytics` },
                                    { view: 'Requests', icon: Clock, href: `/dashboard/${roleSlug}/requests`, badge: pendingUsers.length }
                                ].map((item) => (
                                    <Link
                                        key={item.view}
                                        href={item.href}
                                        className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-2.5 ${timeRange === item.view
                                            ? 'bg-indigo-600 text-app-text shadow-[0_10px_25px_rgba(79,70,229,0.4)] scale-105'
                                            : 'text-app-text-muted hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-app-surface-soft'
                                            }` }
                                    >
                                        <item.icon size={14} />
                                        {item.view}
                                        {item.badge > 0 && (
                                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-app-text animate-pulse">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>

                            <div className="hidden md:block w-px h-10 bg-app-surface mx-2 relative z-10"></div>

                            {/* Executive Actions */}
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto relative z-10">
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={handleAdSync}
                                            disabled={adSyncing}
                                            className={`flex-1 md:flex-none group px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 border ${adSyncing ? 'bg-indigo-900/20 text-indigo-400/50 border-indigo-500/10' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]'}`}
                                        >
                                            <RefreshCw size={14} className={adSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
                                            <span>{adSyncing ? 'Syncing' : 'AD Sync'}</span>
                                        </button>
                                        <button
                                            onClick={handleNetworkScan}
                                            disabled={scanning}
                                            className={`flex-1 md:flex-none group px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 border ${scanning ? 'bg-emerald-900/20 text-emerald-400/50 border-emerald-500/10' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'}`}
                                        >
                                            <Activity size={14} className={scanning ? 'animate-pulse' : 'group-hover:scale-125 transition-transform'} />
                                            <span>{scanning ? 'Scanning' : 'Net Scan'}</span>
                                        </button>
                                    </>
                                )}
                                <button onClick={handleExport} className="flex-1 md:flex-none group px-5 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/[0.03] text-app-text-muted border border-app-border hover:bg-slate-200 dark:hover:bg-app-surface hover:text-slate-900 dark:hover:text-app-text hover:border-slate-300 dark:hover:border-app-border-soft transition-all">
                                    <Download size={14} className="group-hover:-translate-y-1 transition-transform" />
                                    <span>Export</span>
                                </button>
                                <button
                                    onClick={() => setBarcodeScannerOpen(true)}
                                    className="flex-1 md:flex-none group px-5 py-3 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all"
                                >
                                    <Scan size={14} className="group-hover:scale-110 transition-transform" />
                                    <span>Scan Barcode</span>
                                </button>
                                <Link href="/assets/add" className="flex-1 md:flex-none">
                                    <button className="w-full px-8 py-3 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-600 to-blue-600 text-app-text shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all border border-slate-300 border-app-border">
                                        <Plus size={16} strokeWidth={3} />
                                        <span>Init Asset</span>
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {timeRange === 'Overview' && isAdmin && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Link href="/assets">
                                <StatCard
                                    title="Total Assets"
                                    value={stats?.total || 0}
                                    subtext="Global inventory count"
                                    icon={Package}
                                    colorClass="text-blue-500"
                                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                                    trend={stats?.asset_trend}
                                />
                            </Link>
                            <Link href="/assets?status=In Use">
                                <StatCard
                                    title="In Use"
                                    value={stats?.active || 0}
                                    subtext="Currently deployed devices"
                                    icon={CheckCircle}
                                    colorClass="text-emerald-500"
                                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                                    trend={stats?.active_trend || "+5%"}
                                />
                            </Link>
                            <Link href="/assets?status=Repair">
                                <StatCard
                                    title="In Repair"
                                    value={stats?.repair || 0}
                                    subtext="Maintenance & Service"
                                    icon={AlertTriangle}
                                    colorClass="text-orange-500"
                                    gradient="bg-gradient-to-br from-orange-500 to-amber-600"
                                />
                            </Link>
                            <Link href="/assets?risk=warranty">
                                <StatCard
                                    title="Warranty Risk"
                                    value={stats?.warranty_risk || 0}
                                    subtext="Expiring within 30 days"
                                    icon={Clock}
                                    colorClass="text-rose-500"
                                    gradient="bg-gradient-to-br from-rose-500 to-pink-600"
                                    trend={stats?.warranty_risk > 0 ? "Urgent" : "Stable"}
                                />
                            </Link>
                            <Link href="/assets?status=Discovered">
                                <StatCard
                                    title="Discovered"
                                    value={stats?.discovered || 0}
                                    subtext="Found by auto-agent"
                                    icon={Activity}
                                    colorClass="text-purple-500"
                                    gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
                                    trend="New"
                                />
                            </Link>
                            <Link href="/assets?status=In Stock">
                                <StatCard
                                    title="In Stock"
                                    value={stats?.in_stock || 0}
                                    subtext="Ready for assignment"
                                    icon={Layers}
                                    colorClass="text-violet-500"
                                    gradient="bg-gradient-to-br from-violet-500 to-fuchsia-600"
                                />
                            </Link>
                            <Link href="/assets?status=Maintenance">
                                <StatCard
                                    title="In Maintenance"
                                    value={stats?.maintenance || 0}
                                    subtext="Routine checkups"
                                    icon={Activity}
                                    colorClass="text-amber-500"
                                    gradient="bg-gradient-to-br from-amber-500 to-yellow-600"
                                />
                            </Link>
                            <Link href="/assets?segment=IT">
                                <StatCard
                                    title="IT Assets"
                                    value={stats?.it || 0}
                                    subtext="Computing & Network"
                                    icon={Package}
                                    colorClass="text-blue-500"
                                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                                />
                            </Link>
                            <Link href="/assets?segment=Non-IT">
                                <StatCard
                                    title="Non-IT Assets"
                                    value={stats?.non_it || 0}
                                    subtext="Furniture & Accessories"
                                    icon={Layers}
                                    colorClass="text-purple-500"
                                    gradient="bg-gradient-to-br from-purple-500 to-pink-600"
                                />
                            </Link>
                            <Link href="/security/port-policies">
                                <StatCard
                                    title="Port Policies"
                                    value={stats?.policies_count || 0}
                                    subtext="Security compliance state"
                                    icon={ShieldCheck}
                                    colorClass="text-blue-400"
                                    gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
                                />
                            </Link>

                            {isAdmin && (
                                <>
                                    {/* Financial Metrics */}
                                    <Link href="/assets">
                                        <StatCard
                                            title="Asset Value"
                                            value={`₹${(stats?.total_value || 0).toLocaleString()}`}
                                            subtext="Total inventory valuation"
                                            icon={DollarSign}
                                            colorClass="text-cyan-400"
                                            gradient="bg-gradient-to-br from-cyan-500 to-blue-500"
                                            trend={stats?.value_trend || "+8%"}
                                        />
                                    </Link>
                                    <Link href="/assets">
                                        <StatCard
                                            title="Net Asset Value"
                                            value={`₹${((stats?.total_value || 0) * 0.85).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                            subtext="After depreciation"
                                            icon={TrendingDown}
                                            colorClass="text-purple-400"
                                            gradient="bg-gradient-to-br from-purple-500 to-pink-500"
                                        />
                                    </Link>
                                    <Link href="/dashboard/system-admin/procurement">
                                        <StatCard
                                            title="YTD Purchases"
                                            value={`₹${(stats?.ytd_purchases || 0).toLocaleString()}`}
                                            subtext="Procurement step updates"
                                            icon={ShoppingBag}
                                            colorClass="text-amber-400"
                                            gradient="bg-gradient-to-br from-amber-500 to-orange-500"
                                            trend={stats?.procurement_trend || "+15%"}
                                        />
                                    </Link>
                                    <Link href="/dashboard/system-admin/finance">
                                        <StatCard
                                            title="Budget Queue"
                                            value={stats?.budget_queue_count || 0}
                                            subtext="Finance step updates"
                                            icon={Wallet}
                                            colorClass="text-emerald-400"
                                            gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
                                        />
                                    </Link>
                                    <Link href="/software">
                                        <StatCard
                                            title="Active Licenses"
                                            value={saasStats.total_licenses}
                                            subtext={`${saasStats.discovered_count} discovered via agent`}
                                            icon={Layers}
                                            colorClass="text-emerald-400"
                                            gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
                                            trend="Live"
                                        />
                                    </Link>
                                    <Link href="/software">
                                        <StatCard
                                            title="SaaS Spend"
                                            value={`₹${saasStats.monthly_spend.toLocaleString()}`}
                                            subtext="Extracted subscription cost"
                                            icon={DollarSign}
                                            colorClass="text-violet-400"
                                            gradient="bg-gradient-to-br from-violet-500 to-fuchsia-500"
                                        />
                                    </Link>
                                    <Link href="/analytics/oem">
                                        <StatCard
                                            title="OEM Intelligence"
                                            value="Neural Dashboard"
                                            subtext="Cost & Reliability Matrix"
                                            icon={Sparkles}
                                            colorClass="text-indigo-400"
                                            gradient="bg-gradient-to-br from-indigo-500 to-purple-600"
                                            trend="AI Ready"
                                        />
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Workflow Visualization */}
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <WorkflowVisualizer />
                        </div>


                    </>
                )}

                {/* Main Content Layout */}
                {
                    timeRange === 'Overview' ? (
                        /* OVERVIEW LAYOUT - Alerts & Recent only (Asset Analytics and Cost & Renewal Trends moved to Analytics page) */
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            {/* Status & Oversight */}
                            <div className="xl:col-span-1 space-y-8">
                                <SecurityWidget />
                            </div>

                            <div className="xl:col-span-2 space-y-8">
                                {/* Alerts Feed - Tactical HUD Wrapper */}
                                <div className="glass-panel p-6 relative border border-white/5 overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-2 h-full bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors"></div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 border border-rose-500/20 bg-rose-500/5 flex items-center justify-center">
                                                <AlertCircle size={16} className="text-rose-500/70" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-widest text-app-text">System_Alerts</h3>
                                                <p className="text-[8px] font-mono text-app-text-muted/60 uppercase tracking-tight">Active_Anomaly_Detection_V2.1</p>
                                            </div>
                                        </div>
                                        <div className="px-2 py-0.5 border border-rose-500/30 bg-rose-500/5 text-[8px] font-mono text-rose-500 tracking-tighter animate-pulse">
                                            LIVE_FEED
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <AlertsFeed />
                                        {/* HUD Scanline */}
                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-rose-500/[0.02] to-transparent h-[10%] animate-scan mix-blend-overlay"></div>
                                    </div>
                                </div>

                                {/* Recent Assets Mini Table */}
                                <div className="glass-panel p-10 border border-slate-300 border-app-border shadow-2xl relative overflow-hidden group/recent">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full group-hover/recent:bg-blue-500/10 transition-all duration-700"></div>

                                    <div className="flex justify-between items-center mb-10 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-none bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                                <Package size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-['Outfit'] font-black text-app-text tracking-tight uppercase">Recent Arrivals</h3>
                                                <p className="text-app-text-muted text-[10px] font-black uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                                    Global Ledger Feed
                                                </p>
                                            </div>
                                        </div>
                                        <Link href="/assets?sort=newest" className="px-6 py-2.5 rounded-none text-[10px] font-black uppercase tracking-widest text-app-text-muted border border-slate-300 border-app-border hover:bg-app-surface hover:text-app-text hover:border-blue-500/50 transition-all shadow-lg">
                                            Open Registry
                                        </Link>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 relative z-10">
                                        {allAssets.slice(0, 4).map((asset) => (
                                            <div key={asset.id} className="relative group p-5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/40 transition-all duration-300 cursor-pointer overflow-hidden shadow-xl">
                                                <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="px-2 py-0.5 border border-primary/20 bg-primary/5 text-[8px] font-bold text-primary/70 uppercase tracking-widest">
                                                            {asset.vendor || 'OEM_SYNC'}
                                                        </div>
                                                        <div className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest border
                                                        ${asset.status === 'In Use' ? 'bg-success/5 text-success border-success/20' :
                                                                asset.status === 'Repair' ? 'bg-rose-500/5 text-rose-400 border-rose-500/20' :
                                                                    asset.status === 'Discovered' ? 'bg-primary/5 text-primary border-primary/20' :
                                                                        'bg-white/5 text-app-text-muted/60 border-white/10'}`}>
                                                            {asset.status}
                                                        </div>
                                                    </div>

                                                    <h4 className="text-sm font-bold text-app-text uppercase tracking-tight mb-0.5 group-hover:text-primary transition-colors">
                                                        {asset.name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="w-1 h-1 bg-white/20"></div>
                                                        <p className="text-[9px] font-mono text-app-text-muted/60 tracking-wider">SN: {asset.serial_number?.toUpperCase() || 'UNKNOWN_ID'}</p>
                                                    </div>

                                                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <span className="text-[7px] font-bold text-app-text-muted/40 uppercase tracking-widest mb-0.5">Specifications</span>
                                                            <span className="text-[10px] font-bold text-app-text/80 uppercase">{asset.model}</span>
                                                        </div>
                                                        <div className="w-6 h-6 border border-white/10 flex items-center justify-center text-app-text-muted/40 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300">
                                                            <ChevronRight size={14} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel p-10 border border-slate-300 border-app-border shadow-[0_40px_80px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-6 duration-700 relative overflow-hidden">
                            <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full"></div>

                            {/* Neural Registry Tab Selector - Tactical Modernization */}
                            <div className="flex flex-wrap items-center gap-[1px] bg-white/5 p-[1px] border border-white/5 backdrop-blur-md w-fit relative z-10 mb-12">
                                {[
                                    { id: 'asset', label: 'Inventory_Sync', icon: Package, count: (incomingRequests || []).length, color: 'indigo' },
                                    { id: 'access', label: 'Identity_Matrix', icon: Activity, count: pendingUsers.length, color: 'blue' },
                                    { id: 'exit', label: 'Protocol_Exit', icon: LogOut, count: exitRequests.length, color: 'rose' },
                                    { id: 'users', label: 'Active_Registry', icon: Users, count: activeUsers.length, color: 'emerald' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveRequestsTab(tab.id)}
                                        className={`relative group px-6 py-2 text-[9px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-3 border ${activeRequestsTab === tab.id
                                            ? `bg-${tab.color}-500/10 text-${tab.color}-500 border-${tab.color}-500/50 shadow-[0_0_15px_rgba(var(--${tab.color === 'indigo' ? '99,102,241' : tab.color === 'blue' ? '59,130,246' : tab.color === 'rose' ? '244,63,94' : '16,185,129'}),0.2)]`
                                            : 'text-app-text-muted/60 border-transparent hover:text-app-text-muted hover:bg-white/5'
                                            }`}
                                    >
                                        <tab.icon size={12} className={`${activeRequestsTab === tab.id ? 'scale-110' : 'group-hover:scale-105'} transition-transform duration-300`} />
                                        {tab.label}
                                        {tab.count > 0 && (
                                            <span className={`px-1.5 py-0.5 font-mono text-[8px] ${activeRequestsTab === tab.id ? `bg-${tab.color}-500/20 text-${tab.color}-400` : 'bg-white/5 text-app-text-muted/40'}`}>
                                                {tab.count.toString().padStart(2, '0')}
                                            </span>
                                        )}
                                        {activeRequestsTab === tab.id && (
                                            <div className={`absolute top-0 left-0 w-[2px] h-full bg-${tab.color}-500 shadow-[0_0_10px_rgba(var(--${tab.color === 'indigo' ? '99,102,241' : tab.color === 'blue' ? '59,130,246' : tab.color === 'rose' ? '244,63,94' : '16,185,129'}),0.5)]`}></div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* ---- PENDING ASSET REQUESTS SECTION ---- */}
                            {activeRequestsTab === 'asset' && (
                                <div className="mb-6">
                                    <div className="flex justify-between items-end mb-8 relative z-10 border-b border-indigo-500/10 pb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 shadow-[0_0_8px_rgba(var(--color-indigo),0.5)]"></div>
                                                <h3 className="text-lg font-bold text-app-text tracking-widest uppercase">Pending_Asset_Allocation</h3>
                                            </div>
                                            <p className="text-[9px] font-mono text-app-text-muted/60 uppercase tracking-tighter">Dossier review required for hardware/software dissemination.</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="font-mono text-[8px] text-indigo-400/50 uppercase tracking-widest">Global_Sync_Queue</div>
                                            <div className="flex items-center gap-3 px-4 py-1.5 bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(var(--color-indigo),0.1)]">
                                                <div className="w-2 h-2 border border-indigo-500 animate-spin mr-1"></div>
                                                {(incomingRequests || []).length.toString().padStart(2, '0')} Objects_Pending
                                            </div>
                                        </div>
                                    </div>

                                    {incomingRequests.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-32 text-center glass-panel bg-white dark:bg-white/[0.01] border-dashed">
                                            <div className="p-10 bg-indigo-500/5 rounded-full mb-8 border border-indigo-500/10 shadow-2xl animate-float">
                                                <ShieldCheck size={56} className="text-indigo-400 opacity-50" />
                                            </div>
                                            <h4 className="text-2xl font-['Outfit'] font-black text-app-text tracking-widest uppercase">Registry Synchronized</h4>
                                            <p className="text-app-text-muted text-[10px] font-black uppercase tracking-[0.4em] max-w-xs mt-3 leading-relaxed">No pending asset allocations detected in current cycle.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto border border-white/5 bg-white/[0.01] relative z-10 transition-all">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/10 bg-white/5">
                                                        <th className="px-8 py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">Object_Identifier</th>
                                                        <th className="py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">Requester_Dossier</th>
                                                        <th className="py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">Tactical_Impact</th>
                                                        <th className="px-8 py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest text-right">Operational_Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {incomingRequests.map((req) => (
                                                        <tr key={req.id} className="group hover:bg-white/5 transition-all duration-300 border-b border-white/5 last:border-0">
                                                            <td className="px-8 py-5">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-9 h-9 border border-blue-500/20 bg-blue-500/5 flex items-center justify-center text-blue-500/70">
                                                                        <Monitor size={16} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[11px] font-bold text-app-text uppercase tracking-tight group-hover:text-blue-500 transition-colors">{req.assetType}</div>
                                                                        <div className="text-[8px] text-app-text-muted/60 font-mono mt-0.5 tracking-tighter">ID_{req.id?.substring(0, 12).toUpperCase()}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-5">
                                                                <div className="text-[11px] font-bold text-app-text/90 uppercase">{req.requestedBy?.name}</div>
                                                                <div className="text-[8px] text-app-text-muted/50 font-mono uppercase tracking-tighter">{req.requestedBy?.dept_obj?.name || 'REGISTRY_VOID'}</div>
                                                            </td>
                                                            <td className="py-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`px-2 py-0.5 border text-[7px] font-bold uppercase tracking-widest ${req.urgency === 'High' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-white/5 text-app-text-muted/40 border-white/10'}`}>
                                                                        {req.urgency || 'STANDARD'}
                                                                    </div>
                                                                    <div className="text-[8px] font-mono text-app-text-muted/40 uppercase tracking-tighter">[{req.status}]</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                <button
                                                                    onClick={() => { setSelectedItem(req); setActiveModal('REQUEST_DETAILS'); }}
                                                                    className="ml-auto px-4 py-1.5 border border-blue-500/20 bg-blue-500/5 text-blue-500 text-[9px] font-bold uppercase tracking-widest hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-white transition-all flex items-center gap-2"
                                                                >
                                                                    <Eye size={10} />
                                                                    TACTICAL_INTEL
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ---- IDENTITY SYNC (ACCESS REQUESTS) ---- */}
                            {activeRequestsTab === 'access' && (
                                <div className="animate-in fade-in duration-500">
                                    <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 border border-blue-500/20 bg-blue-500/5 flex items-center justify-center">
                                                <Activity size={20} className="text-blue-500/70" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-app-text tracking-widest uppercase">Identity_Sync</h3>
                                                <p className="text-[9px] font-mono text-app-text-muted/60 uppercase tracking-tighter mt-0.5">Authentication_Registration_Queue_V1.9</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 px-4 py-1.5 bg-blue-500/5 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                                            {pendingUsers.length.toString().padStart(2, '0')} Pending_Actions
                                        </div>
                                    </div>

                                    {pendingUsers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 text-center glass-panel">
                                            <div className="p-8 bg-app-surface-soft rounded-full mb-6 border border-slate-300 border-app-border">
                                                <CheckCircle size={48} className="text-slate-700" />
                                            </div>
                                            <h4 className="text-xl font-['Outfit'] font-black text-app-text tracking-tight">Directory Synchronized</h4>
                                            <p className="text-app-text-muted text-sm max-w-xs mt-2">No pending account activations in the identity registry.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto border border-white/5 bg-white/[0.01] shadow-2xl">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/10 bg-white/5">
                                                        <th className="px-8 py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">User_Identity</th>
                                                        <th className="py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">Target_Role</th>
                                                        <th className="py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">Operational_Metadata</th>
                                                        <th className="px-8 py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                    {pendingUsers.map((user) => (
                                                        <tr key={user.id} className="group hover:bg-white/5 transition-all duration-300 border-b border-white/5 last:border-0">
                                                            <td className="px-8 py-5">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 border border-indigo-500/20 bg-gradient-to-br from-indigo-500/20 to-blue-600/20 flex items-center justify-center text-[10px] font-bold text-app-text shadow-lg group-hover:scale-105 transition-transform">
                                                                        {user.full_name?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[11px] font-bold text-app-text uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{user.full_name}</p>
                                                                        <p className="text-[8px] font-mono text-app-text-muted/60 mt-0.5 tracking-tighter">{user.email?.toLowerCase()}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-5">
                                                                <div className="px-2 py-0.5 border border-indigo-500/30 bg-indigo-500/5 text-[8px] font-bold text-indigo-400 uppercase tracking-widest w-fit">
                                                                    {ROLES ? (ROLES.find(r => r.slug === user.role)?.label || user.role) : user.role}
                                                                </div>
                                                            </td>
                                                            <td className="py-5">
                                                                <div className="text-[10px] font-bold text-app-text/80 uppercase">{user.location || 'SITE_UNKNOWN'}</div>
                                                                <div className="text-[8px] text-app-text-muted/50 font-mono uppercase tracking-tighter mt-0.5">{user.dept_obj?.name || 'REGISTRY_VOID'}</div>
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleDenyUser(user.id)}
                                                                        className="w-8 h-8 border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                                                        title="DENY_IDENTITY"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleActivateUser(user.id)}
                                                                        className="px-4 py-1.5 border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all font-bold uppercase tracking-widest text-[8px]"
                                                                    >
                                                                        ACTIVATE_IDENTITY
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }

                {/* ---- EXIT SYNC (EXIT WORKFLOWS) ---- */}
                {
                    activeRequestsTab === 'exit' && (
                        <div className="animate-in slide-in-from-right-4 duration-500">
                            <div className="flex justify-between items-end mb-8 border-b border-rose-500/10 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 border border-rose-500/20 bg-rose-500/5 flex items-center justify-center">
                                        <LogOut size={20} className="text-rose-500/70" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-app-text tracking-widest uppercase">Exit_Sync</h3>
                                        <p className="text-[9px] font-mono text-app-text-muted/60 uppercase tracking-tighter mt-0.5">Offboarding_Asset_Reclamation_Cycle</p>
                                    </div>
                                </div>
                                {exitRequests.filter(req => req.status === 'ASSETS_PROCESSED' || req.status === 'BYOD_PROCESSED').length > 0 && (
                                    <div className="px-4 py-1.5 bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                        {exitRequests.filter(req => req.status === 'ASSETS_PROCESSED' || req.status === 'BYOD_PROCESSED').length.toString().padStart(2, '0')} Ready_For_Protocol_Finalization
                                    </div>
                                )}
                            </div>

                            {exitRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-center glass-panel">
                                    <div className="p-8 bg-app-surface-soft rounded-full mb-6 border border-slate-300 border-app-border">
                                        <LogOut size={48} className="text-slate-700" />
                                    </div>
                                    <h4 className="text-xl font-['Outfit'] font-black text-app-text tracking-tight">Registry Clean</h4>
                                    <p className="text-app-text-muted text-sm max-w-xs mt-2">No active offboarding workflows detected.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-white/5 bg-white/[0.01] shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/10 bg-white/5">
                                                <th className="px-8 py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">User_Identifier_ID</th>
                                                <th className="py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">Lifecycle_Status</th>
                                                <th className="py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">Reclamation_Telemetry</th>
                                                <th className="px-8 py-4 text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest text-right">Operational_Trigger</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                                    {exitRequests.map((req) => {
                                                        const hasPendingAssets = (req.assets_snapshot?.length > 0) && (req.status === 'OPEN' || req.status === 'BYOD_PROCESSED');
                                                        const hasPendingByod = (req.byod_snapshot?.length > 0) && (req.status === 'OPEN' || req.status === 'ASSETS_PROCESSED');
                                                        const isReady = req.status === 'READY_FOR_COMPLETION' ||
                                                            (req.status === 'ASSETS_PROCESSED' && (req.byod_snapshot?.length || 0) === 0) ||
                                                            (req.status === 'BYOD_PROCESSED' && (req.assets_snapshot?.length || 0) === 0) ||
                                                            (req.status === 'OPEN' && (req.assets_snapshot?.length || 0) === 0 && (req.byod_snapshot?.length || 0) === 0);

                                                        return (
                                                            <tr key={req.id} className="group hover:bg-white/5 transition-all duration-300 border-b border-white/5 last:border-0">
                                                                <td className="px-8 py-5">
                                                                    <div className="text-[10px] font-bold font-mono text-app-text/90 group-hover:text-rose-500 transition-colors uppercase tracking-widest">USR_{req.user_id?.substring(0, 10).toUpperCase() || 'VOID_ID'}</div>
                                                                </td>
                                                                <td className="py-5">
                                                                    <div className={`px-2 py-0.5 border text-[7px] font-bold uppercase tracking-widest w-fit ${req.status === 'COMPLETED' ? 'bg-success/10 text-success border-success/30' :
                                                                        req.status === 'READY_FOR_COMPLETION' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                                                                            req.status === 'ASSETS_PROCESSED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                                                                req.status === 'BYOD_PROCESSED' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' :
                                                                                    'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                                                        }`}>
                                                                        {req.status.replace(/_/g, '_')}
                                                                    </div>
                                                                </td>
                                                                <td className="py-5">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className={`flex items-center gap-2 text-[8px] font-bold uppercase tracking-tighter ${hasPendingAssets ? 'text-rose-500' : 'text-app-text-muted/40'}`}>
                                                                            <div className={`w-1.5 h-1.5 ${hasPendingAssets ? 'bg-rose-500 animate-pulse' : 'bg-success/50'}`}></div>
                                                                            {req.assets_snapshot?.length || 0} ASSETS {hasPendingAssets ? '[PENDING]' : '[CLEAN]'}
                                                                        </div>
                                                                        <div className={`flex items-center gap-2 text-[8px] font-bold uppercase tracking-tighter ${hasPendingByod ? 'text-rose-500' : 'text-app-text-muted/40'}`}>
                                                                            <div className={`w-1.5 h-1.5 ${hasPendingByod ? 'bg-rose-500 animate-pulse' : 'bg-success/50'}`}></div>
                                                                            {req.byod_snapshot?.length || 0} BYOD {hasPendingByod ? '[PENDING]' : '[CLEAN]'}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-5 text-right">
                                                                    <button
                                                                        onClick={() => handleCompleteExit(req.id)}
                                                                        disabled={req.status === 'COMPLETED' || (!isReady && req.status !== 'COMPLETED')}
                                                                        className={`px-4 py-1.5 border text-[9px] font-bold uppercase tracking-widest transition-all ${req.status === 'COMPLETED'
                                                                            ? 'bg-success/5 text-success/40 border-success/10 cursor-not-allowed'
                                                                            : isReady
                                                                                ? 'bg-rose-600 border-rose-500 text-white hover:bg-rose-500 shadow-lg shadow-rose-900/20'
                                                                                : 'bg-white/5 text-app-text-muted/40 border-white/10 cursor-not-allowed'
                                                                            }`}
                                                                    >
                                                                        {req.status === 'COMPLETED' ? 'FINALIZED' : (isReady ? 'FINAL_DEACTIVATION' : 'IN_PROGRESS')}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* ---- REGISTRY (ACTIVE PLATFORM USERS) ---- */}
                {
                    activeRequestsTab === 'users' && (
                        <div className="animate-in slide-in-from-left-4 duration-500">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-['Outfit'] font-black text-app-text tracking-tight">Registry</h3>
                                        <p className="text-app-text-muted text-xs font-black uppercase tracking-widest mt-0.5">Active Platform Operators</p>
                                    </div>
                                </div>
                                <div className="px-5 py-2 glass-panel border border-emerald-500/20 rounded-none text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    {activeUsers.length} Operators Online
                                </div>
                            </div>

                            {activeUsers.length === 0 ? (
                                <div className="p-12 glass-panel border border-app-border text-center">
                                    <p className="text-app-text-muted text-sm italic">Registry is currently empty (excluding system accounts).</p>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {Object.entries(
                                        activeUsers.reduce((groups, user) => {
                                            const dept = user.dept_obj?.name || 'UNMAPPED_ENTITIES';
                                            if (!groups[dept]) groups[dept] = [];
                                            groups[dept].push(user);
                                            return groups;
                                        }, {})
                                    )
                                    .sort(([deptA], [deptB]) => deptA.localeCompare(deptB))
                                    .map(([department, users]) => {
                                        // Role priority map
                                        const rolePriority = {
                                            'ADMIN': 1,
                                            'SYSTEM_ADMIN': 1,
                                            'SUPPORT': 2,
                                            'IT_SUPPORT': 2,
                                            'MANAGER': 3,
                                            'DEPT_MANAGER': 3,
                                            'FINANCE': 4,
                                            'PROCUREMENT': 5,
                                            'END_USER': 6,
                                            'TEAM_MEMBER': 6
                                        };

                                        const sortedUsers = [...users].sort((a, b) => {
                                            const priorityA = rolePriority[a.role] || 99;
                                            const priorityB = rolePriority[b.role] || 99;
                                            if (priorityA !== priorityB) return priorityA - priorityB;
                                            return (a.full_name || '').localeCompare(b.full_name || '');
                                        });

                                        return (
                                            <div key={department} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                                                    <h4 className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.5em] px-4 py-1 border border-emerald-500/10 bg-emerald-500/5">
                                                        {department}
                                                    </h4>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                                                </div>

                                                <div className="overflow-x-auto glass-panel border border-app-border shadow-2xl">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-app-border bg-white/[0.01]">
                                                                <th className="px-8 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Operator Identity</th>
                                                                <th className="py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Platform Role</th>
                                                                <th className="py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">Operational Hub</th>
                                                                <th className="px-8 py-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest text-right">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {sortedUsers.map((user) => (
                                                                <tr key={user.id} className="group hover:bg-white/5 transition-all duration-300 border-b border-white/5 last:border-0">
                                                                    <td className="px-8 py-5">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-10 h-10 border border-success/20 bg-success/5 flex items-center justify-center text-[10px] font-bold text-success/70 shadow-lg group-hover:scale-105 transition-transform">
                                                                                {user.full_name?.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] font-bold text-app-text uppercase tracking-tight group-hover:text-success transition-colors">{user.full_name}</p>
                                                                                <p className="text-[8px] font-mono text-app-text-muted/60 mt-0.5 tracking-tighter">{user.email?.toLowerCase()}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-5">
                                                                        <div className={`px-2 py-0.5 border text-[8px] font-bold uppercase tracking-widest w-fit ${
                                                                            user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                                                                            user.role === 'MANAGER' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                                                            'bg-success/5 text-success border-success/20'
                                                                        }`}>
                                                                            {ROLES ? (ROLES.find(r => r.slug === user.role)?.label || user.role) : user.role}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-5">
                                                                        <div className="text-[10px] font-bold text-app-text/80 uppercase">{user.location || 'HUB_CENTRAL'}</div>
                                                                        <div className="text-[8px] text-app-text-muted/40 font-mono uppercase tracking-tighter mt-0.5">LATENCY_SYNC_OK</div>
                                                                    </td>
                                                                    <td className="px-8 py-5 text-right">
                                                                        <div className="flex justify-end gap-2">
                                                                            <button
                                                                                onClick={() => handleInitiateExit(user.id)}
                                                                                className="px-4 py-1.5 border border-orange-500/20 bg-orange-500/5 text-orange-400 text-[9px] font-bold uppercase tracking-widest hover:bg-orange-500/20 hover:text-white transition-all"
                                                                            >
                                                                                INITIATE_EXIT
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeactivateUser(user.id)}
                                                                                className="px-4 py-1.5 border border-white/10 bg-white/5 text-app-text-muted/60 text-[9px] font-bold uppercase tracking-widest hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/40 transition-all"
                                                                            >
                                                                                DEACTIVATE
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )
                }

                {/* ===================================================================================== */}
                {/* MODALS */}
                {/* ===================================================================================== */}

                {
                    activeModal === 'REQUEST_DETAILS' && (
                        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500`}>
                            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-xl" onClick={() => setActiveModal(null)} />
                            <div className={`relative w-full max-w-4xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 transform scale-100 translate-y-0`}>
                                {/* Modal Header - Tactical Modernization */}
                                <div className="px-8 py-6 border-b border-white/10 bg-white/5 flex justify-between items-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 border border-blue-500/20 bg-blue-500/5 flex items-center justify-center text-blue-500/70">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-app-text tracking-widest uppercase">Tactical_Briefing_Dossier</h2>
                                            <p className="text-[9px] font-mono text-app-text-muted/60 uppercase tracking-tighter mt-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-blue-500 animate-pulse"></span>
                                                System_Request_ID: {selectedItem?.id?.toUpperCase() || 'REGISTER_ALPHA_001'}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveModal(null)} className="w-10 h-10 border border-white/5 bg-white/5 flex items-center justify-center text-app-text-muted hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 transition-all">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar relative">
                                    <div className="grid grid-cols-12 gap-8">
                                        {/* Left Column: Primary Data */}
                                        <div className="col-span-7 space-y-8">
                                            <section>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-1 h-3 bg-blue-500"></div>
                                                    <h4 className="text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">Asset_Configuration_Matrix</h4>
                                                </div>
                                                <div className="p-6 border border-white/10 bg-white/[0.02] space-y-4">
                                                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                                        <span className="text-app-text-muted/60 text-[10px] font-bold uppercase">Request_Protocol</span>
                                                        <span className="text-app-text text-sm font-bold uppercase tracking-tight">{selectedItem?.assetType || 'System_Sync'}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-app-text-muted/40 text-[8px] font-bold uppercase tracking-widest leading-none">Subject_Context_Telemetry</span>
                                                        <p className="text-app-text/90 text-sm font-medium leading-relaxed mt-2">{selectedItem?.title || selectedItem?.reason || 'Standard platform operational request detected in grid.'}</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-1 h-3 bg-indigo-500"></div>
                                                    <h4 className="text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">Operator_Intelligence_Profile</h4>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 border border-white/10 bg-white/[0.02]">
                                                        <div className="text-app-text-muted/40 text-[8px] font-bold uppercase tracking-widest mb-1">Identity_Token</div>
                                                        <div className="text-app-text font-bold text-sm uppercase">{selectedItem?.requestedBy?.name || 'Authorized_Admin'}</div>
                                                    </div>
                                                    <div className="p-4 border border-white/10 bg-white/[0.02]">
                                                        <div className="text-app-text-muted/40 text-[8px] font-bold uppercase tracking-widest mb-1">Department_Grid</div>
                                                        <div className="text-app-text font-bold text-sm uppercase">{selectedItem?.requestedBy?.dept_obj?.name || 'Registry_Central'}</div>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        {/* Right Column: Status & Logistics */}
                                        <div className="col-span-5 space-y-8">
                                            <section>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-1 h-3 bg-rose-500"></div>
                                                    <h4 className="text-[9px] font-bold text-app-text-muted/60 uppercase tracking-widest">Operational_Status_Cycle</h4>
                                                </div>
                                                <div className="p-6 border border-white/10 bg-white/[0.02] space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-app-text-muted/60 text-[10px] font-bold uppercase">Priority_Level</div>
                                                        <span className={`px-2 py-0.5 border text-[8px] font-bold uppercase tracking-widest ${selectedItem?.urgency === 'High' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-white/5 text-app-text-muted/40 border-white/10'}`}>`
                                                            {selectedItem?.urgency || 'STANDARD'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-app-text-muted/60 text-[10px] font-bold uppercase">Lifecycle_State</div>
                                                        <span className="px-2 py-0.5 border border-blue-500/20 bg-blue-500/5 text-[8px] font-bold text-blue-400 uppercase tracking-widest">
                                                            {selectedItem?.status || 'PENDING_HUB'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </section>

                                            <div className="p-6 border border-blue-500/20 bg-blue-500/5 flex flex-col items-center text-center">
                                                <div className="w-10 h-10 border border-blue-500/30 flex items-center justify-center mb-4">
                                                    <Clock size={20} className="text-blue-400 animate-pulse" />
                                                </div>
                                                <h5 className="text-[11px] font-bold text-app-text uppercase mb-1 tracking-widest">Awaiting_Sync_Authorization</h5>
                                                <p className="text-app-text-muted/60 text-[9px] font-mono leading-relaxed uppercase tracking-tighter">Executive clearance required for grid redistribution.</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Scanline Effect */}
                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-blue-500/[0.01] to-transparent h-10 animate-scan mix-blend-overlay"></div>
                                </div>

                                {/* Modal Footer - Tactical Actions */}
                                <div className="px-8 py-6 bg-white/5 border-t border-white/10 flex justify-between gap-4">
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="px-6 py-2 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-app-text-muted hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        ABORT_MISSION
                                    </button>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { message.success('Tactical rejection issued'); setActiveModal(null); }}
                                            className="px-6 py-2 border border-rose-500/20 bg-rose-500/5 text-rose-500 text-[9px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                        >
                                            REJECT_ACCESS
                                        </button>
                                        <button
                                            onClick={() => { message.success('Registry updated successfully'); setActiveModal(null); }}
                                            className="px-8 py-2 bg-blue-600 border border-blue-500 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                                        >
                                            AUTHORIZE_SYNC
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
}
