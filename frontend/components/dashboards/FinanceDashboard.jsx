import { DollarSign, TrendingDown, PieChart, Download, CheckCircle, XCircle, User, Calendar, Hash, Package, ShieldCheck, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAssetContext } from '@/contexts/AssetContext';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

const TrendSparkline = ({ data, color = "#10b981" }) => {
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d / Math.max(...data)) * 100}`).join(' ');
    return (
        <svg viewBox="0 0 100 100" className="w-16 h-8 opacity-50" preserveAspectRatio="none">
            <polyline fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
    );
};

const RenderStructuredData = ({ data }) => {
    if (!data || typeof data !== 'object') return <span className="text-slate-500 italic">No extraction data available</span>;

    const getIcon = (key) => {
        const k = key.toLowerCase();
        if (k.includes('cost') || k.includes('price') || k.includes('total')) return <DollarSign size={14} className="text-emerald-400" />;
        if (k.includes('vendor') || k.includes('name')) return <User size={14} className="text-blue-400" />;
        if (k.includes('date')) return <Calendar size={14} className="text-purple-400" />;
        if (k.includes('quantity') || k.includes('unit')) return <Package size={14} className="text-amber-400" />;
        if (k.includes('confidence')) return <ShieldCheck size={14} className="text-cyan-400" />;
        if (k.includes('id') || k.includes('number')) return <Hash size={14} className="text-slate-400" />;
        return <Activity size={14} className="text-indigo-400" />;
    };

    const getConfidenceColor = (value) => {
        const val = parseFloat(value);
        if (isNaN(val)) return 'text-slate-400';
        if (val >= 0.85) return 'text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]';
        if (val >= 0.6) return 'text-amber-400';
        return 'text-rose-400';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(data).map(([key, value]) => {
                const isLongText = typeof value === 'string' && (value.includes('\n') || value.length > 50);
                const isConfidence = key.toLowerCase().includes('confidence');
                const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                return (
                    <div key={key} className={`${isLongText ? 'col-span-full' : ''} group relative px-4 py-3 rounded-xl bg-white/[0.01] border border-white/20 hover:bg-white/[0.03] transition-all duration-300 ring-1 ring-white/10 hover:ring-indigo-500/40 shadow-lg`}>
                        {/* Shimmer Border */}
                        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="flex items-center gap-2 mb-1.5">
                            {getIcon(key)}
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{displayKey}</span>
                        </div>

                        {isLongText ? (
                            <div className="mt-2 text-sm text-slate-200 leading-relaxed font-sans bg-black/40 p-4 rounded-lg border border-white/15 whitespace-pre-wrap selection:bg-indigo-500/40">
                                {value}
                            </div>
                        ) : (
                            <div className={`text-base font-bold tracking-tight ${isConfidence ? getConfidenceColor(value) : 'text-white'}`}>
                                {typeof value === 'number' && key.toLowerCase().includes('cost')
                                    ? `₹ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                    : (isConfidence ? `${(value * 100).toFixed(1)}% Match` : String(value))}
                            </div>
                        )}

                        {/* Subtle glow effect on hover */}
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-indigo-500/5 to-transparent transition-opacity pointer-events-none" />
                    </div>
                );
            })}
        </div>
    );
};

export default function FinanceDashboard() {
    const { requests, financeApprove, financeReject } = useAssetContext();

    // ENTERPRISE: Requests awaiting budget approval
    // ENTERPRISE: Requests awaiting budget approval
    const budgetApprovals = requests.filter(r => r.currentOwnerRole === 'FINANCE' && (r.procurementStage === 'PO_CREATED' || r.procurementStage === 'PO_UPLOADED'));

    const [editingPos, setEditingPos] = useState({});
    const [editData, setEditData] = useState({});
    const [showPoTable, setShowPoTable] = useState(false);
    const [poDetails, setPoDetails] = useState({});
    const [expandedPoLogs, setExpandedPoLogs] = useState({});

    const handleEditToggle = (requestId, po) => {
        if (editingPos[requestId]) {
            setEditingPos(prev => ({ ...prev, [requestId]: false }));
        } else {
            setEditingPos(prev => ({ ...prev, [requestId]: true }));
            setEditData(prev => ({
                ...prev,
                [requestId]: {
                    vendor_name: po.vendor_name,
                    total_cost: po.total_cost
                }
            }));
        }
    };

    const handleSavePO = async (requestId, poId) => {
        try {
            const data = editData[requestId];
            const updatedPo = await apiClient.updatePODetails(poId, data);

            setPoDetails(prev => ({
                ...prev,
                [requestId]: updatedPo
            }));
            setEditingPos(prev => ({ ...prev, [requestId]: false }));
        } catch (e) {
            console.error("Failed to update PO", e);
            alert("Failed to save PO changes.");
        }
    };

    useEffect(() => {
        const fetchPODetails = async () => {
            const details = {};
            for (const req of budgetApprovals) {
                if (req.procurementStage !== 'PO_UPLOADED') continue;
                try {
                    const po = await apiClient.getPO(req.id);
                    if (po) details[req.id] = po;
                } catch (e) {
                    console.warn(`Failed to load PO for ${req.id}`, e);
                }
            }
            setPoDetails(details);
        };

        if (budgetApprovals.length > 0) fetchPODetails();
    }, [budgetApprovals.length]); // Re-run if list changes

    const data = [
        { name: 'Jan', value: 4000000 },
        { name: 'Feb', value: 3950000 },
        { name: 'Mar', value: 3880000 },
        { name: 'Apr', value: 4200000 }, // Purchase spike
        { name: 'May', value: 4100000 },
        { name: 'Jun', value: 4020000 },
    ];

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[24px] border border-white/20 ring-1 ring-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none"></div>
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:via-white/50 transition-all duration-1000"></div>

                <div className="relative z-10">
                    <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-2 h-10 bg-indigo-500 rounded-full"></div>
                        Financial <span className="text-indigo-400">Governance</span>
                    </h2>
                    <p className="text-slate-400 text-[12px] font-bold uppercase tracking-[0.4em] mt-2 ml-5 italic">Asset valuation & capital intelligence</p>
                </div>
                <button className="relative z-10 flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl border border-white/20 transition-all active:scale-95 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl">
                    <Download size={20} className="text-indigo-400" /> Export Financial Intel
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group relative glass-card p-6 overflow-hidden ring-1 ring-white/20 hover:ring-emerald-500/50 transition-all duration-500 border border-white/20 shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-60"></div>
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-inherit -z-10"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform duration-500">
                                <DollarSign size={24} />
                            </div>
                            <h3 className="text-slate-300 text-sm font-black uppercase tracking-[0.2em]">Total Book Value</h3>
                        </div>
                        <TrendSparkline data={[30, 45, 35, 60, 55, 80]} color="#10b981" />
                    </div>
                    <p className="text-4xl font-black text-white tracking-tighter">₹40.2<span className="text-xl text-slate-500 ml-1">Lacs</span></p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-sm font-black text-rose-400">-5.2%</span>
                        <span className="text-[11px] text-slate-400 uppercase font-bold italic tracking-widest">YoY Depreciation</span>
                    </div>
                </div>

                <div className="group relative glass-card p-6 overflow-hidden ring-1 ring-white/20 hover:ring-purple-500/50 transition-all duration-500 border border-white/20 shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-400 opacity-60"></div>
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-inherit -z-10"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform duration-500">
                                <TrendingDown size={24} />
                            </div>
                            <h3 className="text-slate-300 text-sm font-black uppercase tracking-[0.2em]">YTD Depreciation</h3>
                        </div>
                        <TrendSparkline data={[20, 30, 45, 50, 65, 70]} color="#a855f7" />
                    </div>
                    <p className="text-4xl font-black text-white tracking-tighter">₹3.8<span className="text-xl text-slate-500 ml-1">Lacs</span></p>
                    <p className="text-[11px] text-slate-400 mt-2 uppercase font-bold italic tracking-widest">Straight-line projection</p>
                </div>

                <div className="group relative glass-card p-6 overflow-hidden bg-white/[0.03] ring-1 ring-white/20 hover:ring-amber-500/50 transition-all duration-500 border border-white/20 shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-400 opacity-60"></div>
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-inherit -z-10"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform duration-500">
                                <PieChart size={24} />
                            </div>
                            <h3 className="text-slate-300 text-sm font-black uppercase tracking-[0.2em]">Budget Queue</h3>
                        </div>
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] text-slate-400">
                                    <User size={10} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="text-4xl font-black text-white tracking-tighter">{budgetApprovals.length}<span className="text-xl text-slate-500 ml-1">Pending</span></p>

                    <button
                        onClick={() => setShowPoTable(v => !v)}
                        className="mt-4 w-full text-[11px] font-black uppercase tracking-[0.2em] px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                    >
                        {showPoTable ? <CheckCircle size={16} className="text-emerald-400" /> : <Activity size={16} className="text-indigo-400" />}
                        {showPoTable ? 'Close Analytics Table' : 'Open Extraction Audit'}
                    </button>
                </div>
            </div>

            {showPoTable && (
                <div className="glass-panel p-8 border border-white/20 ring-1 ring-white/10 shadow-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h3 className="text-3xl font-black text-white tracking-tight">Purchase Intelligence Audit</h3>
                            <p className="text-[12px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2 italic shadow-sm">Cross-referencing extracted telemetry with budget requests</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="px-5 py-2.5 bg-white/5 rounded-xl border border-white/20 text-[11px] font-black text-slate-300 uppercase tracking-widest shadow-xl ring-1 ring-white/10">
                                {budgetApprovals.length} Audit Nodes
                            </div>
                        </div>
                    </div>

                    <div className="overflow-auto rounded-[20px] border border-white/20 bg-black/40 ring-1 ring-white/10 shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.03] border-b border-white/20">
                                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Telemetry ID</th>
                                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Matched Vendor</th>
                                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Extracted Value</th>
                                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Batch Vol</th>
                                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Audit Status</th>
                                    <th className="p-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Structured Payload</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {budgetApprovals.map(req => {
                                    const po = poDetails[req.id];
                                    return (
                                        <tr key={req.id} className="group hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0">
                                            <td className="p-5 text-xs text-indigo-400 font-mono font-bold tracking-tighter truncate max-w-[120px]">{req.id}</td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                                                        <User size={14} />
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-200">{po?.vendor_name || 'PENDING'}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-sm font-black text-white text-right font-mono">
                                                {po?.total_cost != null ? `₹${Number(po.total_cost).toLocaleString()}` : '--'}
                                            </td>
                                            <td className="p-5 text-sm text-slate-400 text-center font-mono">{po?.quantity ?? '0'}</td>
                                            <td className="p-5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${po?.status === 'extracted'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                                    }`}>
                                                    {po?.status || 'AWAITING LOGS'}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                {po?.extracted_data ? (
                                                    <details className="group/details">
                                                        <summary className="cursor-pointer text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors list-none flex items-center gap-2 uppercase tracking-widest">
                                                            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center group-open/details:rotate-90 transition-transform">
                                                                <Activity size={12} />
                                                            </div>
                                                            Inspect Trace
                                                        </summary>
                                                        <div className="mt-6 bg-slate-950/90 backdrop-blur-3xl border border-white/10 ring-2 ring-indigo-500/10 rounded-[20px] p-8 shadow-3xl relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
                                                            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Deep Extraction Telemetry</h4>
                                                                <span className="text-[9px] font-mono text-slate-600 uppercase">{req.id}</span>
                                                            </div>
                                                            <RenderStructuredData data={po.extracted_data} />
                                                        </div>
                                                    </details>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest italic">No Data Nodes</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* BUDGET APPROVAL QUEUE */}
            {budgetApprovals.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-black text-white flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 shadow-lg">
                                <DollarSign size={26} className="text-emerald-400" />
                            </div>
                            Finance Review Queue
                            <span className="text-[11px] font-black bg-white/10 px-3 py-1.5 rounded-lg text-slate-300 border border-white/20 tracking-widest uppercase shadow-md">
                                {budgetApprovals.length} pending
                            </span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {budgetApprovals.map(req => {
                            const po = poDetails[req.id];
                            return (
                                <div key={req.id} className="relative group/req-card">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 rounded-[26px] blur-md opacity-0 group-hover/req-card:opacity-100 transition duration-700"></div>

                                    <div className="relative glass-card rounded-[22px] p-8 border border-white/20 ring-1 ring-white/10 shadow-3xl hover:border-white/30 hover:ring-white/20 transition-all duration-300">
                                        <div className="flex flex-col lg:flex-row gap-12">
                                            {/* LEFT: Request Details */}
                                            <div className="flex-1 space-y-8">
                                                <div className="flex items-start gap-6">
                                                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/15 flex items-center justify-center text-indigo-400 shadow-inner group-hover/req-card:scale-110 transition-transform duration-500 ring-1 ring-white/10">
                                                        <Activity size={32} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-3xl font-black text-white tracking-tight leading-none mb-3">{req.assetType}</h4>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-[12px] font-mono text-slate-400 px-2 py-1 bg-white/5 rounded border border-white/15 font-bold">{req.id}</span>
                                                            <div className="flex items-center gap-2 text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                                {req.procurementStage}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-8 py-6 border-y border-white/10">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                            <User size={14} className="text-slate-500" /> Requester
                                                        </div>
                                                        <p className="text-base font-black text-slate-100">{req.requestedBy.name}</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                            <PieChart size={14} className="text-slate-500" /> Business Unit
                                                        </div>
                                                        <p className="text-base font-black text-slate-100">{req.requestedBy.role}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest opacity-80">Strategic Justification</div>
                                                    <p className="text-base text-slate-300 leading-relaxed italic border-l-4 border-indigo-500/40 pl-5 py-2 bg-white/[0.01] rounded-r-xl">
                                                        "{req.justification}"
                                                    </p>
                                                </div>
                                            </div>

                                            {/* RIGHT: PO Intelligence & Actions */}
                                            <div className="lg:w-[480px] flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/15 pt-10 lg:pt-0 lg:pl-12">
                                                {po ? (
                                                    <div className="space-y-8">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                <Activity size={14} className="text-emerald-400" />
                                                                Extraction Engine Result
                                                            </div>
                                                            <button
                                                                onClick={() => handleEditToggle(req.id, po)}
                                                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all shadow-lg ${editingPos[req.id] ? 'bg-rose-500 text-white border-rose-600' : 'bg-white/5 text-slate-300 border-white/20 hover:bg-white/10'}`}
                                                            >
                                                                {editingPos[req.id] ? 'Cancel Edit' : 'Manual entry Req.'}
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/15 hover:bg-white/[0.04] transition-all group/field ring-1 ring-white/5 hover:ring-white/10 shadow-xl">
                                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                    <User size={12} className="text-indigo-400" /> Vendor Identification
                                                                </div>
                                                                {editingPos[req.id] ? (
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-slate-950 border border-white/30 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                                                        value={editData[req.id]?.vendor_name || ''}
                                                                        onChange={(e) => setEditData(prev => ({
                                                                            ...prev,
                                                                            [req.id]: { ...(prev[req.id] || {}), vendor_name: e.target.value }
                                                                        }))}
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <div className="text-lg font-black text-white tracking-tight truncate">{po.vendor_name || 'NOT FOUND'}</div>
                                                                )}
                                                            </div>

                                                            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/15 hover:bg-white/[0.04] transition-all ring-1 ring-white/5 hover:ring-white/10 shadow-xl">
                                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                    <DollarSign size={12} className="text-emerald-400" /> Financial Commitment
                                                                </div>
                                                                {editingPos[req.id] ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-bold text-slate-500">₹</span>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full bg-slate-950 border border-white/30 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                                                            value={editData[req.id]?.total_cost || ''}
                                                                            onChange={(e) => setEditData(prev => ({
                                                                                ...prev,
                                                                                [req.id]: { ...(prev[req.id] || {}), total_cost: parseFloat(e.target.value) }
                                                                            }))}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className={`text-lg font-black ${po.total_cost > 0 ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                                                                        {po.total_cost > 0 ? `₹${po.total_cost.toLocaleString()}` : '⚠️ ACTION REQ'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => setExpandedPoLogs(prev => ({ ...prev, [req.id]: !prev[req.id] }))}
                                                            className="w-full py-3 bg-gradient-to-r from-transparent via-white/5 to-transparent border-y border-white/15 text-[10px] font-black text-slate-300 hover:text-white uppercase tracking-[0.4em] transition-all hover:bg-white/5"
                                                        >
                                                            {expandedPoLogs[req.id] ? 'CONSOLIDATE AUDIT LOGS' : 'VERIFY DEEP TELEMETRY'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-40">
                                                        <XCircle size={40} className="mb-4 text-slate-600" />
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Awaiting PO Attachment</p>
                                                    </div>
                                                )}

                                                <div className="flex gap-4 pt-8">
                                                    {editingPos[req.id] ? (
                                                        <button
                                                            onClick={() => handleSavePO(req.id, po.id)}
                                                            className="w-full py-4 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95"
                                                        >
                                                            Commit Extraction Changes
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    const reason = prompt("State reason for budgetary rejection:");
                                                                    if (reason) financeReject(req.id, reason, "Finance Manager");
                                                                }}
                                                                className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-rose-500/10 text-rose-400 border border-white/10 hover:border-rose-500/20 transition-all font-black text-[10px] uppercase tracking-[0.2em] active:scale-95"
                                                            >
                                                                Escalate/Reject
                                                            </button>
                                                            <button
                                                                onClick={() => financeApprove(req.id, "Finance Manager")}
                                                                className="flex-[2] py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/20 transition-all font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 flex items-center justify-center gap-3"
                                                            >
                                                                Release Funds <CheckCircle size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {expandedPoLogs[req.id] && (
                                            <div className="mt-10 pt-10 border-t border-white/10 animate-in fade-in zoom-in-95 duration-500">
                                                <RenderStructuredData data={po.extracted_data} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-white mb-6">Asset Value Trend (6 Months)</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
