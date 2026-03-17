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
    const { ROLES, user: currentUser, currentRole } = useRole()
    const isAdmin = currentRole?.slug === 'ADMIN'
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
                const [apiAssets, apiLicenses] = await Promise.all([
                    apiClient.getAssets(),
                    apiClient.getSoftwareLicenses()
                ]);

                setAllAssets(apiAssets.map(sanitizeAsset));

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
            const pending = await apiClient.getUsers({ status: 'PENDING' });
            setPendingUsers(pending);
            const active = await apiClient.getUsers({ status: 'ACTIVE' });
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
            const apiAssets = await apiClient.getAssets();
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
        if (allAssets.length === 0) return;
        const newStats = calculateDashboardStats(allAssets);
        if (newStats) setStats(newStats);
        setLoading(false);
    }, [allAssets]);

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
                <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading Dashboard...</p>
            </div>
        </div>
    )

    const StatCard = ({ title, value, subtext, icon: Icon, colorClass, gradient, trend }) => (
        <div className="glass-card p-8 relative overflow-hidden group hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 border border-slate-200 dark:border-white/10">
            {/* Intelligent Multi-layer Glow */}
            <div className={`absolute -right-16 -top-16 w-40 h-40 rounded-full ${gradient.replace('bg-', '')} opacity-5 blur-[80px] group-hover:opacity-15 transition-opacity duration-700`}></div>
            <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-slate-100 dark:bg-white/5 blur-[50px] rounded-full group-hover:bg-slate-200 dark:bg-white/10 transition-all duration-700"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient.replace('bg-', '')} flex items-center justify-center border border-slate-300 dark:border-white/10 shadow-lg shadow-black/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                        <Icon className="text-slate-900 dark:text-white drop-shadow-md" size={24} />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{trend}</span>
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    <h3 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white mb-1.5 drop-shadow-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-500">
                        {value}
                    </h3>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] group-hover:text-slate-700 dark:group-hover:text-slate-700 dark:text-slate-300 transition-colors">
                        {title}
                    </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate max-w-[140px] italic">{subtext}</span>
                        <ArrowUpRight size={12} className="text-slate-700 group-hover:text-slate-900 dark:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                        <div className={`h-full ${gradient.split(' ')[0]} w-2/3 shadow-[0_0_10px_rgba(255,255,255,0.2)]`}></div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <>
            <div className="space-y-6 pb-8">
                {/* Header Section with Toggles */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-12">
                    <div className="relative">
                        <div className="absolute -left-6 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-500 via-indigo-600 to-indigo-800 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)]"></div>
                        {timeRange === 'Requests' ? (
                            <>
                                <h2 className="text-xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1] uppercase">
                                    Operational <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-600 dark:from-blue-400 dark:via-emerald-400 dark:to-teal-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">Queue</span>
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 mt-3 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                    <Activity size={14} className="text-blue-500 animate-pulse" /> Asset Lifecycle & Permission Matrix
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1] uppercase">
                                    Executive <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">Control</span>
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 mt-3 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                                    <ShieldCheck size={14} className="text-emerald-500" /> Global Inventory & Threat Protocol Sync
                                </p>
                            </>
                        )}
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
                        <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-100/50 dark:bg-white/[0.03] p-3 rounded-[2rem] border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.4)] w-full xl:w-auto overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                            {/* View Toggles */}
                            <div className="flex bg-slate-200/50 dark:bg-black/20 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 w-full md:w-auto relative z-10">
                                {[
                                    { view: 'Overview', icon: LayoutGrid, href: `/dashboard/${roleSlug}` },
                                    { view: 'Analytics', icon: Activity, href: `/dashboard/${roleSlug}/analytics` },
                                    { view: 'Requests', icon: Clock, href: `/dashboard/${roleSlug}/requests`, badge: pendingUsers.length }
                                ].map((item) => (
                                    <Link
                                        key={item.view}
                                        href={item.href}
                                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-2.5 ${timeRange === item.view
                                            ? 'bg-indigo-600 text-slate-900 dark:text-white shadow-[0_10px_25px_rgba(79,70,229,0.4)] scale-105'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-white/5'
                                            }`}
                                    >
                                        <item.icon size={14} />
                                        {item.view}
                                        {item.badge > 0 && (
                                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-slate-900 dark:text-white animate-pulse">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>

                            <div className="hidden md:block w-px h-10 bg-slate-200 dark:bg-white/10 mx-2 relative z-10"></div>

                            {/* Executive Actions */}
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto relative z-10">
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={handleAdSync}
                                            disabled={adSyncing}
                                            className={`flex-1 md:flex-none group px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 border ${adSyncing ? 'bg-indigo-900/20 text-indigo-400/50 border-indigo-500/10' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]'}`}
                                        >
                                            <RefreshCw size={14} className={adSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
                                            <span>{adSyncing ? 'Syncing' : 'AD Sync'}</span>
                                        </button>
                                        <button
                                            onClick={handleNetworkScan}
                                            disabled={scanning}
                                            className={`flex-1 md:flex-none group px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 border ${scanning ? 'bg-emerald-900/20 text-emerald-400/50 border-emerald-500/10' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]'}`}
                                        >
                                            <Activity size={14} className={scanning ? 'animate-pulse' : 'group-hover:scale-125 transition-transform'} />
                                            <span>{scanning ? 'Scanning' : 'Net Scan'}</span>
                                        </button>
                                    </>
                                )}
                                <button onClick={handleExport} className="flex-1 md:flex-none group px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-white/10 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-300 dark:border-white/20 transition-all">
                                    <Download size={14} className="group-hover:-translate-y-1 transition-transform" />
                                    <span>Export</span>
                                </button>
                                <button
                                    onClick={() => setBarcodeScannerOpen(true)}
                                    className="flex-1 md:flex-none group px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all"
                                >
                                    <Scan size={14} className="group-hover:scale-110 transition-transform" />
                                    <span>Scan Barcode</span>
                                </button>
                                <Link href="/assets/add" className="flex-1 md:flex-none">
                                    <button className="w-full px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-600 to-blue-600 text-slate-900 dark:text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all border border-slate-300 dark:border-white/10">
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
                                    trend="+2"
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
                                            value={stats?.budget_queue_count || "0"}
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
                                {/* Alerts Feed */}
                                <div className="glass-panel p-8 border border-slate-300 dark:border-white/10 shadow-2xl shadow-black/20">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                            <AlertCircle size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight">System Alerts</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Real-time anomaly detection</p>
                                        </div>
                                    </div>
                                    <AlertsFeed />
                                </div>

                                {/* Recent Assets Mini Table */}
                                <div className="glass-panel p-10 border border-slate-300 dark:border-white/10 shadow-2xl relative overflow-hidden group/recent">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full group-hover/recent:bg-blue-500/10 transition-all duration-700"></div>

                                    <div className="flex justify-between items-center mb-10 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                                <Package size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight uppercase">Recent Arrivals</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                                    Global Ledger Feed
                                                </p>
                                            </div>
                                        </div>
                                        <Link href="/assets?sort=newest" className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:bg-white/10 hover:text-slate-900 dark:text-white hover:border-blue-500/50 transition-all shadow-lg">
                                            Open Registry
                                        </Link>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 relative z-10">
                                        {allAssets.slice(0, 4).map((asset) => (
                                            <div key={asset.id} className="relative group p-6 rounded-[2rem] bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-white/[0.05] hover:border-indigo-600 dark:hover:border-indigo-500/30 transition-all duration-500 cursor-pointer overflow-hidden shadow-xl">
                                                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div className="flex items-center justify-between mb-5">
                                                        <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                                            {asset.vendor || 'OEM-SYNC'}
                                                        </div>
                                                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm
                                                        ${asset.status === 'In Use' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                asset.status === 'Repair' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                    asset.status === 'Discovered' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                                        'bg-slate-200 dark:bg-slate-700/20 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/10'}`}>
                                                            {asset.status}
                                                        </div>
                                                    </div>

                                                    <h4 className="text-lg font-['Outfit'] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {asset.name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mb-6">
                                                        <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-wider">SN: {asset.serial_number?.toUpperCase()}</p>
                                                    </div>

                                                    <div className="mt-auto pt-5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Specifications</span>
                                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{asset.model}</span>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-indigo-500 group-hover:text-slate-900 dark:text-white transition-all transform group-hover:rotate-[360deg] duration-700">
                                                            <ChevronRight size={16} />
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
                        <div className="glass-panel p-10 border border-slate-300 dark:border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-6 duration-700 relative overflow-hidden">
                            <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full"></div>

                            {/* Neural Registry Tab Selector */}
                            <div className="flex flex-wrap items-center gap-4 mb-12 bg-slate-100/50 dark:bg-black/20 p-2 rounded-[2rem] border border-slate-200 dark:border-white/5 backdrop-blur-md w-fit relative z-10 transition-all">
                                {[
                                    { id: 'asset', label: 'Inventory Sync', icon: Package, count: incomingRequests.length, color: 'indigo' },
                                    { id: 'access', label: 'Identity Matrix', icon: Activity, count: pendingUsers.length, color: 'blue' },
                                    { id: 'exit', label: 'Protocol Exit', icon: LogOut, count: exitRequests.length, color: 'rose' },
                                    { id: 'users', label: 'Active Registry', icon: Users, count: activeUsers.length, color: 'emerald' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveRequestsTab(tab.id)}
                                        className={`relative group px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-700 flex items-center gap-3 border ${activeRequestsTab === tab.id
                                            ? `bg-${tab.color}-500/10 text-${tab.color}-600 dark:text-${tab.color}-400 border-${tab.color}-500/40 shadow-[0_0_25px_rgba(var(--${tab.color === 'indigo' ? '99,102,241' : tab.color === 'blue' ? '59,130,246' : tab.color === 'rose' ? '244,63,94' : '16,185,129'}),0.2)] scale-105`
                                            : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-white/5'
                                            }`}
                                    >
                                        <tab.icon size={14} className={`${activeRequestsTab === tab.id ? 'scale-125' : 'group-hover:scale-110'} transition-transform duration-500`} />
                                        {tab.label}
                                        {tab.count > 0 && (
                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black ${activeRequestsTab === tab.id ? `bg-${tab.color}-500 text-slate-900 dark:text-white shadow-[0_0_10px_rgba(255,255,255,0.3)]` : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                {tab.count}
                                            </span>
                                        )}
                                        {activeRequestsTab === tab.id && (
                                            <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-${tab.color}-500 rounded-full blur-[3px] shadow-[0_0_10px_rgba(255,255,255,0.5)]`}></div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* ---- PENDING ASSET REQUESTS SECTION ---- */}
                            {activeRequestsTab === 'asset' && (
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-8 relative z-10">
                                        <div>
                                            <h3 className="text-xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tighter uppercase mr-4">Pending Asset Allocation</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Dossier review required for hardware/software dissemination.</p>
                                        </div>
                                        <div className="flex items-center gap-3 px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/5">
                                            <Package size={14} />
                                            {(incomingRequests || []).length} Objects Pending
                                        </div>
                                    </div>

                                    {incomingRequests.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-32 text-center glass-panel bg-white dark:bg-white/[0.01] border-dashed">
                                            <div className="p-10 bg-indigo-500/5 rounded-full mb-8 border border-indigo-500/10 shadow-2xl animate-float">
                                                <ShieldCheck size={56} className="text-indigo-400 opacity-50" />
                                            </div>
                                            <h4 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-widest uppercase">Registry Synchronized</h4>
                                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] max-w-xs mt-3 leading-relaxed">No pending asset allocations detected in current cycle.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto glass-panel border border-slate-200 dark:border-white/10 shadow-2xl relative z-10">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                                                        <th className="px-10 py-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Object Identifier</th>
                                                        <th className="py-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Requester Dossier</th>
                                                        <th className="py-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Tactical Impact</th>
                                                        <th className="px-10 py-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] text-right">Operational Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {incomingRequests.map((req) => (
                                                        <tr key={req.id} className="group hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-white/5 transition-all duration-300">
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                                                        <Monitor size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{req.assetType}</div>
                                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{req.id}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-6">
                                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{req.requestedBy?.name}</div>
                                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-tighter">{req.requestedBy?.department || 'Registry N/A'}</div>
                                                            </td>
                                                            <td className="py-6">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${req.urgency === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/10'}`}>
                                                                        {req.urgency || 'STANDARD'}
                                                                    </span>
                                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium lowercase">/ {req.status}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <button
                                                                    onClick={() => { setSelectedItem(req); setActiveModal('REQUEST_DETAILS'); }}
                                                                    className="ml-auto group/btn px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-slate-900 dark:text-white transition-all flex items-center gap-2"
                                                                >
                                                                    <Eye size={12} className="group-hover/btn:scale-110 transition-transform" />
                                                                    Tactical Intel
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
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                                <Activity size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight">Identity Sync</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mt-0.5">Authentication & Registration Queue</p>
                                            </div>
                                        </div>
                                        <div className="px-5 py-2 glass-panel border border-indigo-500/20 rounded-xl text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                                            {pendingUsers.length} Pending Actions
                                        </div>
                                    </div>

                                    {pendingUsers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 text-center glass-panel">
                                            <div className="p-8 bg-slate-100 dark:bg-white/5 rounded-full mb-6 border border-slate-300 dark:border-white/10">
                                                <CheckCircle size={48} className="text-slate-700" />
                                            </div>
                                            <h4 className="text-xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight">Directory Synchronized</h4>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mt-2">No pending account activations in the identity registry.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto glass-panel border border-slate-300 dark:border-white/10 shadow-2xl">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-slate-200 dark:border-white/10">
                                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">User Identity</th>
                                                        <th className="py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Target Role</th>
                                                        <th className="py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Operational Metadata</th>
                                                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                    {pendingUsers.map((user) => (
                                                        <tr key={user.id} className="group hover:bg-slate-50 dark:hover:bg-slate-50 dark:bg-white/[0.03] transition-all duration-300">
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-black text-slate-900 dark:text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                                                        {user.full_name?.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-['Outfit'] font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{user.full_name}</p>
                                                                        <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-6">
                                                                <span className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest shadow-sm dark:shadow-inner">
                                                                    {ROLES ? (ROLES.find(r => r.slug === user.role)?.label || user.role) : user.role}
                                                                </span>
                                                            </td>
                                                            <td className="py-6">
                                                                <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase">{user.location || 'N/A'}</div>
                                                                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-tighter mt-0.5">{user.department || 'Registry N/A'}</div>
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleDenyUser(user.id)}
                                                                        className="p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-slate-900 dark:text-white transition-all shadow-lg"
                                                                        title="Deny Identity"
                                                                    >
                                                                        <X size={16} strokeWidth={3} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleActivateUser(user.id)}
                                                                        className="px-6 py-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-900 dark:text-white transition-all shadow-lg font-black uppercase tracking-widest text-[9px]"
                                                                    >
                                                                        Activate Identity
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
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                        <LogOut size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight">Exit Sync</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mt-0.5">Offboarding & Asset Reclamation</p>
                                    </div>
                                </div>
                                {exitRequests.filter(req => req.status === 'ASSETS_PROCESSED' || req.status === 'BYOD_PROCESSED').length > 0 && (
                                    <div className="px-5 py-2 glass-panel border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                        {exitRequests.filter(req => req.status === 'ASSETS_PROCESSED' || req.status === 'BYOD_PROCESSED').length} Ready for Completion
                                    </div>
                                )}
                            </div>

                            {exitRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-center glass-panel">
                                    <div className="p-8 bg-slate-100 dark:bg-white/5 rounded-full mb-6 border border-slate-300 dark:border-white/10">
                                        <LogOut size={48} className="text-slate-700" />
                                    </div>
                                    <h4 className="text-xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight">Registry Clean</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mt-2">No active offboarding workflows detected.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto glass-panel border border-slate-200 dark:border-white/10 shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-white/10">
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">User ID</th>
                                                <th className="py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Lifecycle Status</th>
                                                <th className="py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Reclamation Progress</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Action</th>
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
                                                    <tr key={req.id} className="group hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-white/5 transition-all duration-300">
                                                        <td className="px-8 py-6">
                                                            <div className="text-xs font-black font-mono text-slate-500 dark:text-slate-400 group-hover:text-orange-400 transition-colors">{req.user_id}</div>
                                                        </td>
                                                        <td className="py-6">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${req.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                req.status === 'READY_FOR_COMPLETION' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]' :
                                                                    req.status === 'ASSETS_PROCESSED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                        req.status === 'BYOD_PROCESSED' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                                                            'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                                }`}>
                                                                {req.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="py-6">
                                                            <div className="space-y-2">
                                                                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-tight ${hasPendingAssets ? 'text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${hasPendingAssets ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'}`}></div>
                                                                    {req.assets_snapshot?.length || 0} Assets {hasPendingAssets ? '(Pending)' : '(Clean)'}
                                                                </div>
                                                                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-tight ${hasPendingByod ? 'text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${hasPendingByod ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'}`}></div>
                                                                    {req.byod_snapshot?.length || 0} BYOD {hasPendingByod ? '(Pending)' : '(Clean)'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <button
                                                                onClick={() => handleCompleteExit(req.id)}
                                                                disabled={req.status === 'COMPLETED' || (!isReady && req.status !== 'COMPLETED')}
                                                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${req.status === 'COMPLETED'
                                                                    ? 'bg-emerald-500/10 text-emerald-500/40 cursor-not-allowed border border-emerald-500/10'
                                                                    : isReady
                                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white shadow-emerald-500/20 border border-slate-300 dark:border-white/10'
                                                                        : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-200 dark:border-white/5'
                                                                    }`}
                                                            >
                                                                {req.status === 'COMPLETED' ? 'Finalized' : (isReady ? 'Finalize Deactivation' : 'In Progress')}
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
                                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight">Registry</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mt-0.5">Active Platform Operators</p>
                                    </div>
                                </div>
                                <div className="px-5 py-2 glass-panel border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    {activeUsers.length} Operators Online
                                </div>
                            </div>

                            {activeUsers.length === 0 ? (
                                <div className="p-12 glass-panel border border-slate-200 dark:border-white/10 text-center">
                                    <p className="text-slate-500 dark:text-slate-400 text-sm italic">Registry is currently empty (excluding system accounts).</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto glass-panel border border-slate-200 dark:border-white/10 shadow-2xl">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-white/10">
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Operator Identity</th>
                                                <th className="py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Platform Role</th>
                                                <th className="py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Operational Hub</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {activeUsers.map((user) => (
                                                <tr key={user.id} className="group hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-white/5 transition-all duration-300">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400">
                                                                {user.full_name?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{user.full_name}</p>
                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-6">
                                                        <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest shadow-sm dark:shadow-inner">
                                                            {ROLES ? (ROLES.find(r => r.slug === user.role)?.label || user.role) : user.role}
                                                        </span>
                                                    </td>
                                                    <td className="py-6 text-sm font-medium text-slate-500 dark:text-slate-400">{user.location || 'N/A'}</td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex justify-end gap-3">
                                                            <button
                                                                onClick={() => handleInitiateExit(user.id)}
                                                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-orange-400 border border-orange-500/10 bg-orange-500/5 hover:bg-orange-500/20 hover:border-orange-500/30 transition-all"
                                                            >
                                                                Initiate Exit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeactivateUser(user.id)}
                                                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                                                            >
                                                                Deactivate
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
                    )
                }

                {/* ===================================================================================== */}
                {/* MODALS */}
                {/* ===================================================================================== */}

                {
                    activeModal === 'REQUEST_DETAILS' && (
                        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500`}>
                            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-xl" onClick={() => setActiveModal(null)} />
                            <div className={`relative w-full max-w-4xl glass-panel border border-slate-200 dark:border-white/20 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 transform scale-100 translate-y-0`}>
                                {/* Modal Header */}
                                <div className="px-10 py-8 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-sm dark:shadow-inner">
                                            <Shield size={28} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-['Outfit'] font-black text-slate-900 dark:text-white tracking-tight uppercase">Tactical Briefing</h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                                Operational Request ID: {selectedItem?.id || 'REGISTER-ALPHA'}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveModal(null)} className="p-3 rounded-xl hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-all border border-transparent hover:border-slate-300 dark:border-white/10">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-12 gap-8">
                                        {/* Left Column: Primary Data */}
                                        <div className="col-span-7 space-y-8">
                                            <section>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Asset Configuration</h4>
                                                </div>
                                                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
                                                    <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold">Request Type</span>
                                                        <span className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-tight">{selectedItem?.assetType || 'System Access'}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Subject Context</span>
                                                        <p className="text-slate-700 dark:text-slate-200 text-lg font-bold leading-relaxed">{selectedItem?.title || selectedItem?.reason || 'Standard platform operational request.'}</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Requester Intelligence</h4>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10">
                                                        <div className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Identity</div>
                                                        <div className="text-slate-900 dark:text-white font-bold">{selectedItem?.requestedBy?.name || 'Authorized Operator'}</div>
                                                    </div>
                                                    <div className="p-5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10">
                                                        <div className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Department</div>
                                                        <div className="text-slate-900 dark:text-white font-bold">{selectedItem?.requestedBy?.department || 'Central Registry'}</div>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        {/* Right Column: Status & Logistics */}
                                        <div className="col-span-5 space-y-8">
                                            <section>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-1 h-4 bg-rose-500 rounded-full"></div>
                                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Operational Status</h4>
                                                </div>
                                                <div className="p-6 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-slate-500 dark:text-slate-400 text-xs font-bold">Priority</div>
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${selectedItem?.urgency === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/10'}`}>
                                                            {selectedItem?.urgency || 'Standard'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-slate-500 dark:text-slate-400 text-xs font-bold">Lifecycle</div>
                                                        <span className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                                            {selectedItem?.status || 'PENDING_HUB'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </section>

                                            <div className="p-8 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex flex-col items-center text-center">
                                                <Clock size={32} className="text-blue-400 mb-4" />
                                                <h5 className="text-slate-900 dark:text-white font-bold mb-1">Awaiting Authorization</h5>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">This request requires executive clearance for inventory synchronization.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="px-10 py-8 bg-slate-100 dark:bg-white/5 border-t border-slate-300 dark:border-white/10 flex justify-between gap-4">
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5 transition-all"
                                    >
                                        Cancel Mission
                                    </button>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => { message.success('Tactical rejection issued'); setActiveModal(null); }}
                                            className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-400 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all"
                                        >
                                            Reject Access
                                        </button>
                                        <button
                                            onClick={() => { message.success('Registry updated successfully'); setActiveModal(null); }}
                                            className="px-10 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl shadow-blue-500/30 border border-slate-300 dark:border-white/10"
                                        >
                                            Authorize Synchronize
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </>
    );
}
