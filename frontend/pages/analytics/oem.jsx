import { useState, useEffect } from 'react';
import { 
    RefreshCw, 
    Activity, 
    Shield, 
    Info, 
    AlertTriangle, 
    Search, 
    ArrowRight, 
    ChevronRight,
    Award,
    Zap,
    Sparkles,
    ShieldCheck,
    TrendingUp,
    BarChart3,
    LayoutGrid,
    Cpu,
    ArrowUpRight,
    Trash2,
    DollarSign,
    Target
} from 'lucide-react';
import apiClient from '@/lib/apiClient';

// ─── Scylla Metric Card ──────────────────────────────────────────────────────
function MetricCard({ label, value, subtext, icon: Icon, color = 'indigo', trend = null }) {
    return (
        <div className="relative glass-panel p-6 overflow-hidden group border border-slate-300 dark:border-white/10 hover:border-indigo-500/50 transition-all duration-500">
            <div className={`absolute -right-8 -top-8 w-24 h-24 opacity-0 group-hover:opacity-10 blur-[40px] transition-opacity bg-${color}-500`} />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-xl bg-${color}-500/10 border border-${color}-500/20 text-${color}-400`}>
                        <Icon size={20} />
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border
                            ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {trend > 0 ? '+' : ''}{trend}%
                        </div>
                    )}
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white font-['Outfit'] tracking-tighter">{value}</h3>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-1">{label}</p>
                {subtext && <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 font-medium">{subtext}</p>}
            </div>
        </div>
    );
}

// ─── Scylla Reliability Badge ────────────────────────────────────────────────
function ReliabilityBadge({ rating }) {
    const configs = {
        'Invest': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Shield },
        'Watch': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Info },
        'Avoid': { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertTriangle }
    };
    const cfg = configs[rating] || configs['Watch'];
    const Icon = cfg.icon;

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cfg.bg} ${cfg.border} ${cfg.color} text-[10px] font-black uppercase tracking-widest`}>
            <Icon size={12} />
            {rating}
        </div>
    );
}

// ─── Scylla Evidence Drawer ───────────────────────────────────────────────
function EvidenceDrawer({ oem, onClose }) {
    if (!oem) return null;

    return (
        <>
            <div 
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[60] transition-all duration-500"
                onClick={onClose}
            />
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-[70] border-l border-slate-200 dark:border-white/10 p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Search size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] uppercase tracking-tight">Analytical Evidence</h2>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Audit Trail: {oem.vendor}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Step 1: Base Identity */}
                    <div className="relative p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 group">
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-black">1</div>
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Base Fleet Identity</h4>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">{oem.asset_count}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Active Assets ($A$)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-900 dark:text-white">${oem.procurement_cost.toLocaleString()}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Entry Capital</p>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Incident Velocity & Type Breakdown */}
                    <div className="relative p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 group">
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-black">2</div>
                        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">Incident Velocity & Type Breakdown</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Tickets Triggered ($T$)</span>
                                <span className="text-slate-900 dark:text-white font-black">{oem.ticket_count}</span>
                            </div>
                            
                            {/* NEW: Type Breakdown Visualization */}
                            <div className="py-4 space-y-3">
                                {Object.entries(oem.ticket_breakdown).map(([cat, count]) => {
                                    const percentage = ((count / oem.ticket_count) * 100).toFixed(0);
                                    const colors = {
                                        'Hardware': 'bg-rose-500',
                                        'Software': 'bg-indigo-500',
                                        'Network': 'bg-amber-500',
                                        'Other': 'bg-slate-500',
                                        'Smart-Attributed': 'bg-emerald-500'
                                    };
                                    const color = colors[cat] || 'bg-slate-400';
                                    return (
                                        <div key={cat} className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    {cat}
                                                    {cat === 'Smart-Attributed' && <Sparkles size={8} className="text-emerald-500" />}
                                                </div>
                                                <span className="text-slate-900 dark:text-white">{count} ({percentage}%)</span>
                                            </div>
                                            <div className="h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-3 border-t border-slate-200 dark:border-white/5 space-y-3">
                                <h5 className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Severity-Weighted Impact</h5>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(oem.severity_breakdown).map(([sev, count]) => (
                                        <div key={sev} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-center">
                                            <p className="text-[10px] font-black text-slate-900 dark:text-white">{count}</p>
                                            <p className={`text-[8px] font-bold uppercase tracking-tighter ${
                                                sev === 'High' ? 'text-rose-400' :
                                                sev === 'Medium' ? 'text-amber-400' : 'text-slate-400'
                                            }`}>{sev}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex justify-between items-center text-rose-400 font-black">
                                <span className="text-[10px] uppercase tracking-wider">Applied Penalty</span>
                                <span className="text-lg font-['Outfit']">-{oem.freq_penalty}</span>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Resolution Efficiency Penalty */}
                    <div className="relative p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 group">
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-black">3</div>
                        <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Resolution Efficiency Penalty</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Avg MTTR (Hours)</span>
                                <span className="text-slate-900 dark:text-white font-black">{oem.avg_mttr_hours}h</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex justify-between items-center text-amber-400 font-black">
                                <span className="text-[10px] uppercase tracking-wider">Applied Penalty</span>
                                <span className="text-lg font-['Outfit']">-{oem.mttr_penalty}</span>
                            </div>
                        </div>
                    </div>

                    {/* Step 4: Audited TCO Derivation */}
                    <div className="relative p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 group">
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-black">4</div>
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Total Cost of Ownership (Audited)</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Procurement (POs/Audited)</span>
                                <span className="text-slate-900 dark:text-white font-black">${oem.procurement_cost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Accumulated Maintenance</span>
                                <span className="text-slate-900 dark:text-white font-black">${oem.maintenance_cost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Vendor Software Overhead</span>
                                <span className="text-slate-900 dark:text-white font-black">${oem.license_cost.toLocaleString()}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex justify-between items-center text-indigo-500 font-black">
                                <span className="text-[10px] uppercase tracking-wider">Final Audited TCO</span>
                                <span className="text-lg font-['Outfit']">${oem.total_cost.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Step 5: Final Derivation */}
                    <div className="p-8 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <Activity size={80} />
                        </div>
                        <h4 className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4">Final Intelligence Derivation</h4>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="text-4xl font-black font-['Outfit'] tracking-tighter">{oem.reliability_score}%</div>
                            <ReliabilityBadge rating={oem.investment_rating} />
                        </div>
                        <div className="space-y-3">
                            <div className="p-3 bg-white/10 border border-white/10 rounded-xl font-mono text-[9px] leading-relaxed">
                                <span className="block text-indigo-200 mb-1">// Phase 3: Severity-Weighted & Time-Normalized</span>
                                REL_SCORE = MAX(100 - (W_Penalty / (AssetDays/30) * 5) - (MTTR * 0.5), 0)
                            </div>
                            <div className="flex items-center gap-4 text-[9px] font-bold text-indigo-200 uppercase tracking-widest pl-1">
                                <span>Asset Days: {oem.asset_days}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-300/30" />
                                <span>Weighted Penalty: {Object.values(oem.severity_breakdown).reduce((a,b)=>a+b,0)} pts</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={onClose}
                    className="w-full mt-10 py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                    Close Audit Trail
                </button>
            </div>
        </>
    );
}

export default function OEMAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOEM, setSelectedOEM] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await apiClient.getOEMMetrics();
            setData(result);
        } catch (error) {
            console.error('Failed to fetch OEM metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredMetrics = data?.metrics.filter(m => 
        m.vendor.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className="min-h-screen p-6 lg:p-10 space-y-10">
            {/* ── Data Quality Layer (Phase 4) ────────────────────────────── */}
            {data && data.data_quality_score < 100 && (
                <div className={`relative overflow-hidden p-6 rounded-3xl border animate-in fade-in slide-in-from-top-4 duration-700 ${
                    data.data_quality_score < 70 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                    <div className="flex items-start gap-5">
                        <div className={`p-3 rounded-2xl ${
                            data.data_quality_score < 70 ? 'bg-rose-500' : 'bg-amber-500'
                        } text-white shadow-lg`}>
                            <AlertTriangle size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-black uppercase tracking-widest mb-1">Intelligence Visibility Alert</h3>
                            <p className="text-xs font-medium opacity-90 max-w-2xl leading-relaxed">
                                {data.unlinked_technical_count} technical tickets are currently "orphaned" (unlinked to assets). 
                                Your Intelligence Matrix accuracy is at <span className="font-black">{data.data_quality_score}%</span>. 
                                Reliability scores may be artificially inflated for specific vendors.
                            </p>
                            <div className="mt-4 flex items-center gap-4">
                                <div className="px-3 py-1 rounded-full bg-white/20 dark:bg-black/20 text-[10px] font-black uppercase tracking-tighter flex items-center gap-2">
                                    <Zap size={10} /> Smart Attribution: {data.smart_attributed_count} Linked
                                </div>
                                <button className="text-[10px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4 hover:opacity-70 transition-opacity">
                                    Launch Data Audit Tool
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Header Layer ─────────────────────────────────────────────── */}
            <header className="relative glass-panel p-8 overflow-hidden group border border-slate-300 dark:border-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-rose-500/5 pointer-events-none" />
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="absolute -inset-2 bg-indigo-500/20 blur-xl rounded-full group-hover:bg-indigo-500/30 transition-all" />
                            <div className="relative p-4 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/20 text-white">
                                <Award size={32} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">
                                <Activity size={10} /> Intelligence Matrix
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['Outfit'] tracking-tight">
                                OEM <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400">Intelligence</span>
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                Correlating procurement costs with multi-cycle reliability patterns.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                         <div className="relative group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-indigo-400 transition-colors" size={16} />
                            <input 
                                type="text"
                                placeholder="Search OEM Matrix..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white w-64 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                            />
                        </div>
                        <button 
                            onClick={fetchData}
                            className={`p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-indigo-400 transition-all active:scale-95 ${loading ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Key Metrics Strip ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    label="Fleet Health Index" 
                    value={data ? `${data.fleet_health_index}%` : '—'} 
                    icon={Shield} 
                    color="emerald"
                    subtext="Aggregated reliability across all vendors."
                />
                <MetricCard 
                    label="Top Performant OEM" 
                    value={data?.top_performer || '—'} 
                    icon={TrendingUp} 
                    color="indigo" 
                    subtext="Highest reliability-to-cost ratio."
                />
                <MetricCard 
                    label="Maintenance Overhead" 
                    value={data ? `$${Math.round(data.metrics.reduce((s, m) => s + m.maintenance_cost, 0) / 1000)}k` : '—'} 
                    icon={DollarSign} 
                    color="amber"
                    subtext="Total non-procurement asset costs."
                />
                <MetricCard 
                    label="Risk Identified" 
                    value={data?.under_performer || '—'} 
                    icon={AlertTriangle} 
                    color="rose"
                    subtext="OEM with highest failure frequency."
                />
            </div>

            {/* ── Main Analytical Grid ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Reliability vs Investment Matrix */}
                <div className="lg:col-span-2 glass-panel p-8 relative overflow-hidden flex flex-col border border-slate-300 dark:border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                <LayoutGrid size={22} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] uppercase tracking-tight">Performance Matrix</h2>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Reliability vs. Total Cost of Ownership</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-white/5">
                                    <th className="text-left pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">OEM / Vendor</th>
                                    <th className="text-right pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reliability</th>
                                    <th className="text-right pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">TCO</th>
                                    <th className="text-right pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Issue</th>
                                    <th className="text-right pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">MTTR (Hrs)</th>
                                    <th className="text-center pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Investment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="py-6"><div className="h-4 w-32 bg-slate-200 dark:bg-white/5 rounded mx-2" /></td>
                                            <td colSpan={4}><div className="h-4 w-full bg-slate-200 dark:bg-white/5 rounded" /></td>
                                        </tr>
                                    ))
                                ) : filteredMetrics.map((m) => (
                                    <tr 
                                        key={m.vendor} 
                                        className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                        onClick={() => setSelectedOEM(m)}
                                    >
                                        <td className="py-4 pl-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform" />
                                                <span className="text-sm font-black text-slate-900 dark:text-white font-['Outfit']">{m.vendor}</span>
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-bold ml-5 uppercase tracking-widest">{m.asset_count} Assets</p>
                                        </td>
                                        <td className="py-4 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-xs font-black text-slate-900 dark:text-white">{m.reliability_score}%</span>
                                                <div className="w-20 h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${m.reliability_score}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right">
                                            <span className="text-xs font-black text-slate-900 dark:text-white">${m.total_cost.toLocaleString()}</span>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">${Math.round(m.maintenance_cost).toLocaleString()} maint.</p>
                                        </td>
                                        <td className="py-4 text-right">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    m.primary_impact === 'Hardware' ? 'bg-rose-500' :
                                                    m.primary_impact === 'Software' ? 'bg-indigo-500' :
                                                    m.primary_impact === 'Network' ? 'bg-amber-500' : 'bg-slate-400'
                                                }`} />
                                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">{m.primary_impact}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right">
                                            <span className="text-xs font-black text-slate-900 dark:text-white">{m.avg_mttr_hours}h</span>
                                        </td>
                                        <td className="py-4 flex justify-center mt-2">
                                            <ReliabilityBadge rating={m.investment_rating} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Investment Insights Column */}
                <div className="space-y-8">
                    {/* Neural Command Panel */}
                    <div className="glass-panel p-8 relative overflow-hidden border border-rose-500/20 bg-rose-500/5">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                             <Zap size={64} className="text-rose-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="p-2.5 rounded-xl bg-rose-500 shadow-lg shadow-rose-500/20 text-white">
                                <Zap size={18} />
                            </div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white font-['Outfit'] uppercase tracking-widest">Intelligence Recommendation</h2>
                        </div>
                        
                        <div className="space-y-6 relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Priority Investment</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                    Increase allocation for <span className="text-indigo-400 underline decoration-indigo-500/30 underline-offset-4">{data?.top_performer}</span>
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                    Consistently demonstrating {data?.metrics[0]?.reliability_score}% reliability with optimal maintenance overhead.
                                </p>
                            </div>
                            
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                    <AlertTriangle size={12} /> Procument Warning
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                    High failure frequency detected for <span className="font-black text-slate-900 dark:text-white">{data?.under_performer}</span>. Suggest pausing new procurement cycles.
                                </p>
                            </div>
                            
                            <button className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                                <Activity size={14} /> Generate Detailed ROI Report
                            </button>
                        </div>
                    </div>

                    {/* Reliability Index Chart (SVG Visualization) */}
                    <div className="glass-panel p-8 relative overflow-hidden border border-slate-300 dark:border-white/10">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Fleet Reliability Spectrum</h3>
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                <Target size={14} />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {data?.metrics.slice(0, 3).map((m, i) => (
                                <div key={m.vendor} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-900 dark:text-white">{m.vendor}</span>
                                        <span className="text-indigo-400">{m.reliability_score}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-1000 bg-gradient-to-r ${i === 0 ? 'from-indigo-500 to-purple-500' : 'from-indigo-500/50 to-indigo-500'}`}
                                            style={{ width: `${m.reliability_score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <div className="flex -space-x-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                        {i+1}
                                    </div>
                                ))}
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data Audit Sync Active</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* ── Evidence Drawer ───────────────────────────────────────────── */}
            <EvidenceDrawer 
                oem={selectedOEM} 
                onClose={() => setSelectedOEM(null)} 
            />
        </div>
    );
}
