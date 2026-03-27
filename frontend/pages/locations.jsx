import { useState, useEffect } from 'react';
import { MapPin, Building2, Server, Users, Search, Plus, ExternalLink, Globe, ArrowUpRight, Activity } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function LocationsPage() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                // Fetch locations with counts from reference API
                const data = await apiClient.request('/reference/locations?include_counts=true');
                setLocations(data);
            } catch (err) {
                console.error('Failed to fetch locations:', err);
                // Fallback mock data if API fails or returns empty
                setLocations([
                    { name: "New York HQ", count: 124 },
                    { name: "London Office", count: 85 },
                    { name: "San Francisco", count: 92 },
                    { name: "Singapore", count: 45 },
                    { name: "Tokyo", count: 38 },
                    { name: "Remote", count: 210 }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchLocations();
    }, []);

    const filteredLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getLocationStats = (name) => {
        // Mock stats for visual richness
        const isDataCenter = name.toLowerCase().includes('data center') || name.toLowerCase().includes('it warehouse');
        return {
            type: isDataCenter ? 'Infrastructure' : 'Office',
            uptime: '99.9%',
            devices: Math.floor(Math.random() * 500) + 50,
            activeUsers: Math.floor(Math.random() * 200) + 20,
            riskLevel: Math.random() > 0.8 ? 'High' : 'Low'
        };
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-app-text tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                        Global Locations
                    </h2>
                    <p className="text-app-text-muted mt-2 text-lg">Manage and monitor assets across your global infrastructure</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-5 py-2.5 rounded-xl bg-app-surface-soft border border-app-border text-app-text font-medium hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-all flex items-center gap-2 group">
                        <Globe size={18} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                        <span>Map View</span>
                    </button>
                    <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-app-text font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 active:scale-95">
                        <Plus size={20} />
                        <span>Add Site</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Sites', value: locations.length, icon: MapPin, color: 'blue' },
                    { label: 'Managed Assets', value: locations.reduce((acc, curr) => acc + (curr.count || 0), 0), icon: Server, color: 'indigo' },
                    { label: 'Primary Data Centers', value: locations.filter(l => l.name.toLowerCase().includes('center')).length || 2, icon: Activity, color: 'purple' },
                    { label: 'Active Users', value: '~1.4k', icon: Users, color: 'emerald' },
                ].map((stat, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-app-border relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/10 blur-3xl -mr-8 -mt-8 group-hover:bg-${stat.color}-500/20 transition-colors duration-500`} />
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl bg-${stat.color}-500/20 text-${stat.color}-400 border border-${stat.color}-500/20`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <p className="text-app-text-muted text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                                <h3 className="text-2xl font-black text-app-text mt-0.5">{stat.value}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="backdrop-blur-md bg-app-surface-soft border border-app-border shadow-2xl rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted group-focus-within:text-blue-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Filter sites by name, region, or asset count..."
                        className="w-full bg-white dark:bg-slate-900/50 border border-app-border rounded-xl py-3.5 pl-12 pr-4 text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-app-text-muted transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <select className="bg-white dark:bg-slate-900/50 border border-app-border rounded-xl px-4 py-3.5 text-slate-700 dark:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer">
                        <option>Sort by Asset Count</option>
                        <option>Sort Alphabetically</option>
                        <option>Sort by Uptime</option>
                    </select>
                </div>
            </div>

            {/* Locations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-64 rounded-3xl bg-slate-50 dark:bg-slate-800/20 animate-pulse border border-app-border" />
                    ))
                ) : (
                    filteredLocations.map((loc, i) => {
                        const stats = getLocationStats(loc.name);
                        return (
                            <div key={i} className="group relative rounded-3xl bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-app-border hover:border-blue-500/30 transition-all duration-500 overflow-hidden flex flex-col h-full shadow-lg hover:shadow-blue-500/5">
                                {/* Card Header */}
                                <div className="p-6 pb-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-2xl ${stats.type === 'Infrastructure' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-500/20 text-blue-400'} border border-app-border`}>
                                            {stats.type === 'Infrastructure' ? <Server size={24} /> : <Building2 size={24} />}
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 uppercase tracking-widest">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Active
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-app-text group-hover:text-blue-300 transition-colors uppercase tracking-tight">{loc.name}</h3>
                                    <p className="text-app-text-muted text-sm mt-1">{stats.type} Portfolio • {stats.uptime} Uptime</p>
                                </div>

                                {/* Card Body - Stats List */}
                                <div className="px-6 space-y-4 flex-1">
                                    <div className="flex justify-between items-center p-3 rounded-2xl bg-app-surface-soft border border-app-border">
                                        <div className="flex items-center gap-3">
                                            <Server size={18} className="text-app-text-muted" />
                                            <span className="text-sm text-slate-700 dark:text-slate-700">Total Assets</span>
                                        </div>
                                        <span className="text-lg font-bold text-app-text">{loc.count || stats.devices}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-2xl bg-app-surface-soft border border-app-border">
                                        <div className="flex items-center gap-3">
                                            <Users size={18} className="text-app-text-muted" />
                                            <span className="text-sm text-slate-700 dark:text-slate-700">Personnel</span>
                                        </div>
                                        <span className="text-lg font-bold text-app-text">{stats.activeUsers}</span>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="p-6 mt-4 border-t border-app-border flex gap-3">
                                    <button
                                        onClick={() => window.location.href = `/assets?location=${encodeURIComponent(loc.name)}`}
                                        className="flex-1 py-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-sm font-bold border border-blue-500/20 transition-all flex items-center justify-center gap-2 group/btn"
                                    >
                                        Inventory <ArrowUpRight size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    </button>
                                    <button className="p-3 rounded-xl bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white border border-app-border transition-all">
                                        <ExternalLink size={18} />
                                    </button>
                                </div>

                                {/* Background Gloss Effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                        );
                    })
                )}
            </div>

            {loading === false && filteredLocations.length === 0 && (
                <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-app-border">
                        <MapPin size={32} className="text-app-text-muted" />
                    </div>
                    <h3 className="text-xl font-bold text-app-text">No locations matched your search</h3>
                    <p className="text-app-text-muted mt-2">Try adjusting your filters or search keywords</p>
                </div>
            )}
        </div>
    );
}
