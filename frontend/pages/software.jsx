import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import {
    Package,
    ShieldCheck,
    AlertTriangle,
    Calendar,
    DollarSign,
    MoreVertical,
    Search,
    Plus,
    Filter,
    ArrowUpRight,
    X
} from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

export default function SoftwareManagement() {
    const { isAdmin } = useRole();
    const [licenses, setLicenses] = useState([]);
    const [discoveredSoftware, setDiscoveredSoftware] = useState([]);
    const [reconciliation, setReconciliation] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('managed'); // 'managed' or 'reconciliation' or 'discovered'
    const [matchModal, setMatchModal] = useState({ isOpen: false, softwareName: null });
    const [isMatching, setIsMatching] = useState(false);
    const [actionLoading, setActionLoading] = useState({}); // { licenseId: 'buying' | 'optimizing' }
    const [showAddLicense, setShowAddLicense] = useState(false);

function AddLicenseModal({ onClose, onSave }) {
    const [data, setData] = useState({
        name: '',
        vendor: '',
        license_key: '',
        seat_count: 1,
        cost: 0,
        expiry_date: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiClient.post('/software', data);
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to add license');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <div className="bg-white dark:bg-slate-900 border border-app-border rounded-none w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-app-border flex items-center justify-between">
                    <h3 className="text-xl font-bold text-app-text text-emerald-400">Add Managed License</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-none text-slate-500 transition-colors">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Software Name</label>
                            <input
                                value={data.name}
                                onChange={e => setData({ ...data, name: e.target.value })}
                                className="w-full bg-app-surface-soft border border-app-border rounded-none py-2 px-4 text-sm"
                                placeholder="e.g. Photoshop, Office 365"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vendor</label>
                            <input
                                value={data.vendor}
                                onChange={e => setData({ ...data, vendor: e.target.value })}
                                className="w-full bg-app-surface-soft border border-app-border rounded-none py-2 px-4 text-sm"
                                placeholder="e.g. Microsoft, Adobe"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Seats</label>
                            <input
                                type="number"
                                value={data.seat_count}
                                onChange={e => setData({ ...data, seat_count: parseInt(e.target.value) })}
                                className="w-full bg-app-surface-soft border border-app-border rounded-none py-2 px-4 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Purchase Cost ($)</label>
                            <input
                                type="number"
                                value={data.cost}
                                onChange={e => setData({ ...data, cost: parseFloat(e.target.value) })}
                                className="w-full bg-app-surface-soft border border-app-border rounded-none py-2 px-4 text-sm font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date</label>
                            <input
                                type="date"
                                value={data.expiry_date}
                                onChange={e => setData({ ...data, expiry_date: e.target.value })}
                                className="w-full bg-app-surface-soft border border-app-border rounded-none py-2 px-4 text-sm"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-app-text font-bold rounded-none transition-all shadow-lg shadow-emerald-500/20"
                    >
                        {saving ? 'Adding...' : 'Create Managed License'}
                    </button>
                </form>
            </div>
        </div>
    );
}

    useEffect(() => {
        refreshData();
    }, [activeTab]);

    const refreshData = () => {
        if (activeTab === 'managed') {
            fetchLicenses();
        } else if (activeTab === 'reconciliation') {
            fetchReconciliationReport();
        } else {
            fetchDiscoveredSoftware();
        }
    };

    const fetchLicenses = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.getLicenses();
            setLicenses(data);
        } catch (error) {
            console.error('Failed to fetch licenses:', error);
            setLicenses([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDiscoveredSoftware = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.getDiscoveredSoftware();
            setDiscoveredSoftware(data);
        } catch (error) {
            console.error('Failed to fetch discovered software:', error);
            setDiscoveredSoftware([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReconciliationReport = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.getSoftwareReconciliation();
            setReconciliation(data);
        } catch (error) {
            console.error('Failed to fetch reconciliation report:', error);
            setReconciliation([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMatch = async (licenseId) => {
        if (!matchModal.softwareName || !licenseId) return;

        setIsMatching(true);
        try {
            await apiClient.matchSoftware(matchModal.softwareName, licenseId);
            setMatchModal({ isOpen: false, softwareName: null });
            refreshData();
        } catch (error) {
            console.error('Failed to match software:', error);
            alert('Failed to match software. Please try again.');
        } finally {
            setIsMatching(false);
        }
    };

    const handleRequestSeats = async (licenseId) => {
        setActionLoading(prev => ({ ...prev, [licenseId]: 'buying' }));
        try {
            await apiClient.requestLicenseSeats(licenseId);
            alert('Seat request submitted successfully! It will now route through procurement.');
            refreshData();
        } catch (error) {
            console.error('Failed to request seats:', error);
            alert('Failed to request seats. Please check permissions.');
        } finally {
            setActionLoading(prev => ({ ...prev, [licenseId]: null }));
        }
    };

    const handleOptimize = async (licenseId) => {
        setActionLoading(prev => ({ ...prev, [licenseId]: 'optimizing' }));
        try {
            const data = await apiClient.optimizeLicense(licenseId);
            const assignee = data.assigned_to || 'IT Support';
            alert(`Optimization ticket created and assigned to ${assignee}.`);
            refreshData();
        } catch (error) {
            console.error('Failed to optimize license:', error);
            alert('Failed to create optimization ticket.');
        } finally {
            setActionLoading(prev => ({ ...prev, [licenseId]: null }));
        }
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'active': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'expiring': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'expired': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            default: return 'text-app-text-muted bg-slate-500/10 border-slate-500/20';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-app-text mb-1">Software Inventory</h1>
                    <p className="text-app-text-muted text-sm">Track enterprise licenses and real-time application discovery.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white dark:bg-slate-900/50 p-1 rounded-none border border-app-border mr-2">
                        <button
                            onClick={() => setActiveTab('managed')}
                            className={`px-4 py-1.5 rounded-none text-xs font-semibold transition-all ${activeTab === 'managed' ? 'bg-emerald-500 text-app-text shadow-lg' : 'text-app-text-muted hover:text-slate-900 dark:text-slate-200'}`}
                        >
                            Managed Licenses
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab('reconciliation')}
                                className={`px-4 py-1.5 rounded-none text-xs font-semibold transition-all ${activeTab === 'reconciliation' ? 'bg-amber-500 text-app-text shadow-lg' : 'text-app-text-muted hover:text-slate-900 dark:text-slate-200'}`}
                            >
                                Compliance & Risk
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('discovered')}
                            className={`px-4 py-1.5 rounded-none text-xs font-semibold transition-all ${activeTab === 'discovered' ? 'bg-violet-500 text-app-text shadow-lg' : 'text-app-text-muted hover:text-slate-900 dark:text-slate-200'}`}
                        >
                            Discovered Inventory
                        </button>
                    </div>
                    <button 
                        onClick={() => setShowAddLicense(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-none text-app-text font-semibold transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"
                    >
                        <Plus size={18} />
                        <span>Add License</span>
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Licenses', value: licenses.length, icon: Package, color: 'emerald', show: true },
                    {
                        label: 'Financial Risk',
                        value: `$${reconciliation.filter(r => r.compliance_status === 'RISK').reduce((a, b) => a + b.financial_impact, 0).toLocaleString()}`,
                        icon: AlertTriangle,
                        color: 'rose',
                        show: isAdmin
                    },
                    {
                        label: 'Potential Savings',
                        value: `$${Math.abs(reconciliation.filter(r => r.compliance_status === 'SAFE' && r.financial_impact < 0).reduce((a, b) => a + b.financial_impact, 0)).toLocaleString()}`,
                        icon: DollarSign,
                        color: 'emerald',
                        show: isAdmin
                    },
                    { label: 'Detected Installs', value: discoveredSoftware.reduce((a, b) => a + b.install_count, 0), icon: ArrowUpRight, color: 'blue', show: true },
                ].filter(s => s.show).map((stat, i) => (
                    <div key={i} className="backdrop-blur-md bg-app-surface-soft border border-app-border-soft border-app-border shadow-xl rounded-none transition-all duration-300 hover:border-blue-500/30 p-6 border border-app-border hover:border-app-border transition-colors group">
                        <div className="flex items-start justify-between">
                            <div className={`p-2 rounded-none bg-${stat.color}-500/10 text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                                <stat.icon size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider">REAL-TIME</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl font-bold text-app-text">{stat.value}</p>
                            <p className="text-xs text-app-text-muted text-app-text-muted mt-1">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="backdrop-blur-md bg-app-surface-soft border border-app-border-soft border-app-border shadow-xl rounded-none transition-all duration-300 hover:border-blue-500/30 overflow-hidden border border-app-border">
                <div className="p-6 border-b border-app-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-grow max-w-md">
                        <Search size={18} className="absolute left-3 top-2.5 text-app-text-muted" />
                        <input
                            type="text"
                            placeholder={activeTab === 'managed' ? 'Search licenses...' : 'Search discovered apps...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900/50 border border-app-border rounded-none py-2 pl-10 pr-4 text-sm text-app-text focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-slate-50 dark:bg-white/[0.02] text-left">
                            {activeTab === 'managed' ? (
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Software Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Seats</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Expiry</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider text-right">Action</th>
                                </tr>
                            ) : activeTab === 'reconciliation' ? (
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Software</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Usage (Seats vs Installs)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Utilization</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Compliance</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Impact</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider text-right">Resolve</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Application</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Publisher</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Version</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Installs</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider">Last Detected</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-app-text-muted text-app-text-muted uppercase tracking-wider text-right">Action</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-app-text-muted">Loading inventory...</td>
                                </tr>
                            ) : activeTab === 'managed' ? (
                                licenses.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-app-text-muted">No licenses found.</td>
                                    </tr>
                                ) : licenses.map((license) => (
                                    <tr key={license.id} className="hover:bg-white dark:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-none bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                                    {license.name[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-app-text">{license.name}</span>
                                                    {license.is_discovered && (
                                                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-tighter flex items-center gap-1">
                                                            <ArrowUpRight size={10} />
                                                            Discovered
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-app-text-muted">{license.vendor}</td>
                                        <td className="px-6 py-4 text-sm text-app-text-muted text-app-text-muted font-mono">{license.seat_count}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(license.status)}`}>
                                                {license.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-app-text-muted">
                                                <Calendar size={14} />
                                                {license.expiry_date}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft rounded-none text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === 'reconciliation' ? (
                                reconciliation.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-app-text-muted">No reconciliation data available.</td>
                                    </tr>
                                ) : reconciliation.map((item) => (
                                    <tr key={item.license_id} className="hover:bg-white dark:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-app-text">{item.software_name}</span>
                                                <span className="text-xs text-app-text-muted">{item.vendor}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-app-text font-bold">{item.install_count}</span>
                                                <span className="text-xs text-app-text-muted">/ {item.seat_count} Seats</span>
                                            </div>
                                            <div className="w-24 h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${item.compliance_status === 'RISK' ? 'bg-rose-500' : item.compliance_status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min(item.utilization_rate, 100)}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-bold ${item.compliance_status === 'RISK' ? 'text-rose-400' : 'text-app-text-muted'}`}>
                                                {Math.round(item.utilization_rate)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${item.compliance_status === 'RISK' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                                                item.compliance_status === 'WARNING' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                                                    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                }`}>
                                                {item.compliance_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold">
                                            <span className={item.financial_impact > 0 ? 'text-rose-400' : item.financial_impact < 0 ? 'text-emerald-400' : 'text-app-text-muted'}>
                                                {item.financial_impact > 0 ? `+$${item.financial_impact.toLocaleString()}` : item.financial_impact < 0 ? `-$${Math.abs(item.financial_impact).toLocaleString()}` : '$0'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => item.compliance_status === 'RISK' ? handleRequestSeats(item.license_id) : handleOptimize(item.license_id)}
                                                disabled={!!actionLoading[item.license_id]}
                                                className={`flex items-center gap-2 px-3 py-1.5 bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-none text-xs transition-colors ${item.compliance_status === 'RISK' ? 'text-rose-400' : 'text-emerald-400'}`}
                                            >
                                                {actionLoading[item.license_id] === 'buying' ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                                                        Processing...
                                                    </span>
                                                ) : actionLoading[item.license_id] === 'optimizing' ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                                        Analyzing...
                                                    </span>
                                                ) : (
                                                    item.compliance_status === 'RISK' ? 'Buy Seats' : 'Optimize'
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                discoveredSoftware.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-app-text-muted">No discovered applications found.</td>
                                    </tr>
                                ) : discoveredSoftware.map((soft, i) => (
                                    <tr key={i} className="hover:bg-white dark:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-none bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs">
                                                    {soft.name[0]}
                                                </div>
                                                <span className="text-sm font-medium text-app-text">{soft.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-app-text-muted">{soft.vendor}</td>
                                        <td className="px-6 py-4 text-sm text-app-text-muted text-app-text-muted font-mono">{soft.version}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-violet-400">{soft.install_count}</span>
                                                <span className="text-[10px] text-app-text-muted uppercase tracking-tighter">Assets</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-app-text-muted">
                                            {new Date(soft.last_seen).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setMatchModal({ isOpen: true, softwareName: soft.name })}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-none text-xs text-slate-700 dark:text-slate-700 transition-colors"
                                            >
                                                <ShieldCheck size={14} className="text-violet-400" />
                                                Verify
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Alert */}
            <div className={`p-4 rounded-none flex items-start gap-3 ${activeTab === 'managed' ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-violet-500/5 border border-violet-500/10'}`}>
                {activeTab === 'managed' ? (
                    <ShieldCheck className="text-emerald-400 mt-0.5" size={20} />
                ) : (
                    <Package className="text-violet-400 mt-0.5" size={20} />
                )}
                <div>
                    <p className={`text-sm font-semibold ${activeTab === 'managed' ? 'text-emerald-400' : 'text-violet-400'}`}>
                        {activeTab === 'managed' ? 'License Optimization Active' : 'Autonomous Inventory Management'}
                    </p>
                    <p className="text-app-text-muted text-xs mt-1">
                        {activeTab === 'managed'
                            ? 'The system has identified 12 underutilized seats in Slack Enterprise. Consider optimizing your subscriptions to save costs.'
                            : 'The inventory list below is automatically compiled by the Discovery Agents. Use the "Verify" action to map discovered items to managed licenses.'}
                    </p>
                </div>
            </div>

            {/* Match to License Modal */}
            {matchModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
                    <div className="bg-white dark:bg-slate-900 border border-app-border rounded-none w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-app-border flex items-center justify-between">
                            <h3 className="text-xl font-bold text-app-text flex items-center gap-2">
                                <ShieldCheck className="text-violet-400" />
                                Match to License
                            </h3>
                            <button
                                onClick={() => setMatchModal({ isOpen: false, softwareName: null })}
                                className="p-2 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft rounded-none text-app-text-muted transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-app-text-muted">
                                Match <span className="text-app-text font-bold">{matchModal.softwareName}</span> to an existing managed license for compliance tracking.
                            </p>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {licenses.length === 0 ? (
                                    <p className="text-center py-8 text-app-text-muted text-sm">No managed licenses found.</p>
                                ) : licenses.map(license => (
                                    <button
                                        key={license.id}
                                        onClick={() => handleMatch(license.id)}
                                        disabled={isMatching}
                                        className="w-full p-4 rounded-none bg-app-surface-soft border border-app-border hover:border-violet-500/50 hover:bg-white/[0.08] text-left transition-all group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-bold text-app-text">{license.name}</p>
                                                <p className="text-xs text-app-text-muted">{license.vendor}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-mono text-app-text-muted">{license.seat_count} Seats</p>
                                                <span className={`text-[10px] uppercase font-bold ${getStatusColor(license.status)} px-1.5 rounded-none border`}>
                                                    {license.status}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 pt-0 text-center">
                            <p className="text-[10px] text-app-text-muted">
                                Matching will aggregate discovery counts into the chosen license's compliance score.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showAddLicense && (
                <AddLicenseModal
                    onClose={() => setShowAddLicense(false)}
                    onSave={refreshData}
                />
            )}
        </div>
    );
}
