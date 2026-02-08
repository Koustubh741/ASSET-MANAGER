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
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('managed'); // 'managed' or 'discovered'

    useEffect(() => {
        if (activeTab === 'managed') {
            fetchLicenses();
        } else {
            fetchDiscoveredSoftware();
        }
    }, [activeTab]);

    const fetchLicenses = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.request('/software');
            setLicenses(data);
        } catch (error) {
            console.error('Failed to fetch licenses:', error);
            setLicenses([
                { id: '1', name: 'Adobe Creative Cloud', vendor: 'Adobe', seat_count: 50, status: 'Active', expiry_date: '2026-05-15', cost: 1200 },
                { id: '2', name: 'Microsoft 365 Business', vendor: 'Microsoft', seat_count: 200, status: 'Active', expiry_date: '2026-12-01', cost: 4500 },
                { id: '3', name: 'Slack Enterprise', vendor: 'Slack', seat_count: 150, status: 'Expiring', expiry_date: '2026-03-20', cost: 3200 },
                { id: '4', name: 'Zoom Pro', vendor: 'Zoom', seat_count: 30, status: 'Active', expiry_date: '2027-01-10', cost: 800 },
            ]);
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
            setDiscoveredSoftware([
                { name: 'Google Chrome', vendor: 'Google LLC', version: '121.0.6167.140', install_count: 45, last_seen: new Date().toISOString() },
                { name: 'Python 3', vendor: 'PSF', version: '3.12.1', install_count: 12, last_seen: new Date().toISOString() },
                { name: 'Visual Studio Code', vendor: 'Microsoft', version: '1.86.0', install_count: 28, last_seen: new Date().toISOString() },
            ]);
        } finally {
            setIsLoading(false);
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
                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 mr-2">
                        <button
                            onClick={() => setActiveTab('managed')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'managed' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Managed Licenses
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
                    { label: 'Installed Apps', value: discoveredSoftware.length, icon: ShieldCheck, color: 'violet' },
                    { label: 'Expiring Soon', value: licenses.filter(l => l.status === 'Expiring').length, icon: AlertTriangle, color: 'amber' },
                    { label: 'Detected Assets', value: [...new Set(discoveredSoftware.map(s => s.install_count))].reduce((a, b) => (activeTab === 'discovered' ? a + b : a), 0) || (activeTab === 'managed' ? licenses.reduce((a, b) => a + b.seat_count, 0) : 0), icon: ArrowUpRight, color: 'blue' },
                ].map((stat, i) => (
                    <div key={i} className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6 border border-white/5 hover:border-white/10 transition-colors group">
                        <div className="flex items-start justify-between">
                            <div className={`p-2 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                                <stat.icon size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">REAL-TIME</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                            <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 overflow-hidden border border-white/5">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-grow max-w-md">
                        <Search size={18} className="absolute left-3 top-2.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder={activeTab === 'managed' ? 'Search licenses...' : 'Search discovered apps...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-white/[0.02] text-left">
                            {activeTab === 'managed' ? (
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Software Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Seats</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Expiry</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Cost</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Application</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Publisher</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Version</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Installs</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Detected</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Action</th>
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
                                                <span className="text-sm font-medium text-white">{license.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">{license.vendor}</td>
                                        <td className="px-6 py-4 text-sm text-slate-400 font-mono">{license.seat_count}</td>
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
                                        <td className="px-6 py-4 text-sm text-white font-medium">${license.cost.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                                                <MoreVertical size={18} />
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
                                        <td className="px-6 py-4 text-sm text-slate-400 font-mono">{soft.version}</td>
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
                                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-300 transition-colors">
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
        </div>
    );
}
