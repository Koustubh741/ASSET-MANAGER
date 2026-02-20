import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
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
    ArrowUpRight
} from 'lucide-react';

export default function SoftwareManagement() {
    const [licenses, setLicenses] = useState([]);
    const [discoveredSoftware, setDiscoveredSoftware] = useState([]);
    const [reconciliation, setReconciliation] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('managed'); // 'managed' or 'reconciliation' or 'discovered'
    const [matchModal, setMatchModal] = useState({ isOpen: false, softwareName: null });
    const [isMatching, setIsMatching] = useState(false);

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

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'active': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'expiring': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'expired': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Software Inventory</h1>
                    <p className="text-slate-400 text-sm">Track enterprise licenses and real-time application discovery.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 light:border-slate-200 mr-2">
                        <button
                            onClick={() => setActiveTab('managed')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'managed' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Managed Licenses
                        </button>
                        <button
                            onClick={() => setActiveTab('reconciliation')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'reconciliation' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Compliance & Risk
                        </button>
                        <button
                            onClick={() => setActiveTab('discovered')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'discovered' ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Discovered Inventory
                        </button>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-white font-semibold transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]">
                        <Plus size={18} />
                        <span>Add License</span>
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Licenses', value: licenses.length, icon: Package, color: 'emerald' },
                    {
                        label: 'Financial Risk',
                        value: `$${reconciliation.filter(r => r.compliance_status === 'RISK').reduce((a, b) => a + b.financial_impact, 0).toLocaleString()}`,
                        icon: AlertTriangle,
                        color: 'rose'
                    },
                    {
                        label: 'Potential Savings',
                        value: `$${Math.abs(reconciliation.filter(r => r.compliance_status === 'SAFE' && r.financial_impact < 0).reduce((a, b) => a + b.financial_impact, 0)).toLocaleString()}`,
                        icon: DollarSign,
                        color: 'emerald'
                    },
                    { label: 'Detected Installs', value: discoveredSoftware.reduce((a, b) => a + b.install_count, 0), icon: ArrowUpRight, color: 'blue' },
                ].map((stat, i) => (
                    <div key={i} className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6 border border-white/5 light:border-slate-200 hover:border-white/10 transition-colors group">
                        <div className="flex items-start justify-between">
                            <div className={`p-2 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                                <stat.icon size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">REAL-TIME</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                            <p className="text-xs text-slate-400 light:text-slate-600 mt-1">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 overflow-hidden border border-white/5 light:border-slate-200">
                <div className="p-6 border-b border-white/5 light:border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-grow max-w-md">
                        <Search size={18} className="absolute left-3 top-2.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder={activeTab === 'managed' ? 'Search licenses...' : 'Search discovered apps...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 light:border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-white/[0.02] text-left">
                            {activeTab === 'managed' ? (
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Software Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Seats</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Expiry</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            ) : activeTab === 'reconciliation' ? (
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Software</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Usage (Seats vs Installs)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Utilization</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Compliance</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Impact</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider text-right">Resolve</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Application</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Publisher</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Version</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Installs</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider">Last Detected</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 light:text-slate-600 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">Loading inventory...</td>
                                </tr>
                            ) : activeTab === 'managed' ? (
                                licenses.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-slate-500">No licenses found.</td>
                                    </tr>
                                ) : licenses.map((license) => (
                                    <tr key={license.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                                    {license.name[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-white">{license.name}</span>
                                                    {license.is_discovered && (
                                                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-tighter flex items-center gap-1">
                                                            <ArrowUpRight size={10} />
                                                            Discovered
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">{license.vendor}</td>
                                        <td className="px-6 py-4 text-sm text-slate-400 light:text-slate-600 font-mono">{license.seat_count}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(license.status)}`}>
                                                {license.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Calendar size={14} />
                                                {license.expiry_date}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white light:hover:text-slate-900 transition-colors">
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === 'reconciliation' ? (
                                reconciliation.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No reconciliation data available.</td>
                                    </tr>
                                ) : reconciliation.map((item) => (
                                    <tr key={item.license_id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white">{item.software_name}</span>
                                                <span className="text-xs text-slate-500">{item.vendor}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-white font-bold">{item.install_count}</span>
                                                <span className="text-xs text-slate-500">/ {item.seat_count} Seats</span>
                                            </div>
                                            <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${item.compliance_status === 'RISK' ? 'bg-rose-500' : item.compliance_status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min(item.utilization_rate, 100)}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-bold ${item.compliance_status === 'RISK' ? 'text-rose-400' : 'text-slate-300'}`}>
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
                                            <span className={item.financial_impact > 0 ? 'text-rose-400' : item.financial_impact < 0 ? 'text-emerald-400' : 'text-slate-500'}>
                                                {item.financial_impact > 0 ? `+$${item.financial_impact.toLocaleString()}` : item.financial_impact < 0 ? `-$${Math.abs(item.financial_impact).toLocaleString()}` : '$0'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-emerald-400 transition-colors">
                                                {item.compliance_status === 'RISK' ? 'Buy Seats' : 'Optimize'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                discoveredSoftware.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No discovered applications found.</td>
                                    </tr>
                                ) : discoveredSoftware.map((soft, i) => (
                                    <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs">
                                                    {soft.name[0]}
                                                </div>
                                                <span className="text-sm font-medium text-white">{soft.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">{soft.vendor}</td>
                                        <td className="px-6 py-4 text-sm text-slate-400 light:text-slate-600 font-mono">{soft.version}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-violet-400">{soft.install_count}</span>
                                                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Assets</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {new Date(soft.last_seen).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setMatchModal({ isOpen: true, softwareName: soft.name })}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-300 light:text-slate-700 transition-colors"
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
            <div className={`p-4 rounded-2xl flex items-start gap-3 ${activeTab === 'managed' ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-violet-500/5 border border-violet-500/10'}`}>
                {activeTab === 'managed' ? (
                    <ShieldCheck className="text-emerald-400 mt-0.5" size={20} />
                ) : (
                    <Package className="text-violet-400 mt-0.5" size={20} />
                )}
                <div>
                    <p className={`text-sm font-semibold ${activeTab === 'managed' ? 'text-emerald-400' : 'text-violet-400'}`}>
                        {activeTab === 'managed' ? 'License Optimization Active' : 'Autonomous Inventory Management'}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                        {activeTab === 'managed'
                            ? 'The system has identified 12 underutilized seats in Slack Enterprise. Consider optimizing your subscriptions to save costs.'
                            : 'The inventory list below is automatically compiled by the Discovery Agents. Use the "Verify" action to map discovered items to managed licenses.'}
                    </p>
                </div>
            </div>

            {/* Match to License Modal */}
            {matchModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
                    <div className="bg-slate-900 border border-white/10 light:border-slate-200 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 light:border-slate-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <ShieldCheck className="text-violet-400" />
                                Match to License
                            </h3>
                            <button
                                onClick={() => setMatchModal({ isOpen: false, softwareName: null })}
                                className="p-2 hover:bg-white/5 rounded-xl text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-400">
                                Match <span className="text-white font-bold">{matchModal.softwareName}</span> to an existing managed license for compliance tracking.
                            </p>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {licenses.length === 0 ? (
                                    <p className="text-center py-8 text-slate-500 text-sm">No managed licenses found.</p>
                                ) : licenses.map(license => (
                                    <button
                                        key={license.id}
                                        onClick={() => handleMatch(license.id)}
                                        disabled={isMatching}
                                        className="w-full p-4 rounded-xl bg-white/5 border border-white/5 light:border-slate-200 hover:border-violet-500/50 hover:bg-white/[0.08] text-left transition-all group"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-bold text-white">{license.name}</p>
                                                <p className="text-xs text-slate-500">{license.vendor}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-mono text-slate-400">{license.seat_count} Seats</p>
                                                <span className={`text-[10px] uppercase font-bold ${getStatusColor(license.status)} px-1.5 rounded-md border`}>
                                                    {license.status}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 pt-0 text-center">
                            <p className="text-[10px] text-slate-500">
                                Matching will aggregate discovery counts into the chosen license's compliance score.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
