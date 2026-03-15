import { DollarSign, TrendingDown, PieChart, Download, CheckCircle, XCircle, User, Calendar, Hash, Package, ShieldCheck, Activity, Eye, LifeBuoy } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAssetContext } from '@/contexts/AssetContext';
import { useToast } from '@/components/common/Toast';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';

const TrendSparkline = ({ data, color = "#10b981" }) => {
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d / Math.max(...data)) * 100}`).join(' ');
    return (
        <svg viewBox="0 0 100 100" className="w-16 h-8 opacity-50" preserveAspectRatio="none">
            <polyline fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
    );
};

const RenderStructuredData = ({ data, onValueChange, editing = false }) => {
    if (!data || typeof data !== 'object') return <span className="text-slate-500 dark:text-slate-400 italic">No extraction data available</span>;

    const getIcon = (key) => {
        const k = key.toLowerCase();
        if (k.includes('cost') || k.includes('price') || k.includes('total')) return <DollarSign size={14} className="text-emerald-400" />;
        if (k.includes('vendor') || k.includes('name')) return <User size={14} className="text-blue-400" />;
        if (k.includes('date')) return <Calendar size={14} className="text-purple-400" />;
        if (k.includes('quantity') || k.includes('unit')) return <Package size={14} className="text-amber-400" />;
        if (k.includes('confidence')) return <ShieldCheck size={14} className="text-cyan-400" />;
        if (k.includes('id') || k.includes('number')) return <Hash size={14} className="text-slate-500 dark:text-slate-400" />;
        return <Activity size={14} className="text-indigo-400" />;
    };

    const getConfidenceColor = (value) => {
        const val = parseFloat(value);
        if (isNaN(val)) return 'text-slate-500 dark:text-slate-400';
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
                    <div key={key} className={`${isLongText ? 'col-span-full' : ''} group relative px-4 py-3 rounded-xl bg-white dark:bg-white/[0.01] dark:bg-white/[0.01] border border-slate-200 dark:border-white/20 hover:bg-slate-50 dark:hover:bg-slate-50 dark:bg-white/[0.03] transition-all duration-300 shadow-sm hover:shadow-md`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                                {getIcon(key)}
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{displayKey}</span>
                            </div>
                            {editing && isConfidence && <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">READ ONLY</span>}
                        </div>

                        {editing && !isConfidence ? (
                            isLongText ? (
                                <textarea
                                    className="mt-2 w-full text-sm text-slate-900 dark:text-slate-200 leading-relaxed font-sans bg-slate-50 dark:bg-black/60 p-4 rounded-xl border border-slate-200 dark:border-white/30 focus:border-indigo-500 outline-none transition-all resize-none shadow-sm dark:shadow-inner"
                                    rows={4}
                                    value={value || ''}
                                    onChange={(e) => onValueChange(key, e.target.value)}
                                />
                            ) : (
                                <input
                                    type={typeof value === 'number' ? 'number' : 'text'}
                                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/30 rounded-xl px-3 py-2 text-base font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all shadow-sm dark:shadow-inner"
                                    value={value || ''}
                                    onChange={(e) => onValueChange(key, typeof value === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                />
                            )
                        ) : (
                            isLongText ? (
                                <div className="mt-2 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans bg-slate-50/50 dark:bg-black/40 p-4 rounded-xl border border-slate-100 dark:border-white/15 whitespace-pre-wrap shadow-sm dark:shadow-inner italic">
                                    {value}
                                </div>
                            ) : (
                                <div className={`text-lg font-black tracking-tight ${isConfidence ? getConfidenceColor(value) : 'text-slate-900 dark:text-white'}`}>
                                    {typeof value === 'number' && key.toLowerCase().includes('cost')
                                        ? `₹ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                        : (isConfidence ? `${(value * 100).toFixed(1)}% Match` : String(value))}
                                </div>
                            )
                        )}
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-indigo-500/5 to-transparent transition-opacity pointer-events-none" />
                    </div>
                );
            })}
        </div>
    );
};

const DEFAULT_CHART_DATA = [];

/** @param {{ activeView?: 'dashboard' | 'budget-queue' }} props */
export default function FinanceDashboard({ activeView = 'dashboard' }) {
    const toast = useToast();
    const { requests, financeApprove, financeReject } = useAssetContext();

    // Items arrive at Finance when Procurement has validated the PO (procurementStage === 'PO_VALIDATED')
    const budgetApprovals = requests.filter(r => r.currentOwnerRole === 'FINANCE' && r.procurementStage === 'PO_VALIDATED');

    const [editingPos, setEditingPos] = useState({});
    const [editData, setEditData] = useState({});
    const [showPoTable, setShowPoTable] = useState(false);
    const [poDetails, setPoDetails] = useState({});
    const [expandedPoLogs, setExpandedPoLogs] = useState({});
    const [financialSummary, setFinancialSummary] = useState(null);
    const [depreciationData, setDepreciationData] = useState(null);
    const [chartData, setChartData] = useState(DEFAULT_CHART_DATA);

    const handleEditToggle = (requestId, po) => {
        if (editingPos[requestId]) {
            setEditingPos(prev => ({ ...prev, [requestId]: false }));
        } else {
            setEditingPos(prev => ({ ...prev, [requestId]: true }));
            setEditData(prev => ({
                ...prev,
                [requestId]: {
                    vendor_name: po.vendor_name,
                    total_cost: po.total_cost,
                    capex_opex: po.capex_opex || 'OPEX',
                    tax_amount: po.tax_amount || 0,
                    shipping_handling: po.shipping_handling || 0,
                    extracted_data: { ...(po.extracted_data || {}) }
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
            toast.success("PO details and telemetry updated successfully.");
        } catch (e) {
            console.error("Failed to update PO", e);
            toast.error("Failed to save PO changes.");
        }
    };

    const handleTelemetryChange = (requestId, key, value) => {
        setEditData(prev => ({
            ...prev,
            [requestId]: {
                ...prev[requestId],
                extracted_data: {
                    ...(prev[requestId]?.extracted_data || {}),
                    [key]: value
                }
            }
        }));
    };

    useEffect(() => {
        const fetchPODetails = async () => {
            const details = {};
            for (const req of budgetApprovals) {
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
    }, [budgetApprovals.length]);

    useEffect(() => {
        apiClient.getFinancialSummary()
            .then(res => setFinancialSummary(res))
            .catch(() => setFinancialSummary(null));
        apiClient.getMonthlySpend(6)
            .then(list => {
                const mapped = list.map(d => ({
                    name: d.month.length >= 7 ? d.month.slice(5, 7) + '/' + d.month.slice(2, 4) : d.month,
                    value: d.total_spend || 0
                }));
                if (mapped.length) setChartData(mapped);
            })
            .catch(() => { });
        apiClient.getDepreciation('straight-line', 5)
            .then(res => setDepreciationData(res))
            .catch(() => setDepreciationData(null));
    }, []);

    const totalBookValue = financialSummary?.total_asset_value ?? 0;
    const ytdDepreciation = depreciationData?.total_depreciation ?? 0;

    const exportFinanceIntel = () => {
        const headers = ['Request ID', 'Asset Type', 'Requester', 'Justification', 'Vendor', 'Total Cost', 'Status'];
        const rows = budgetApprovals.map(req => {
            const po = poDetails[req.id];
            return [
                req.id,
                req.assetType,
                req.requestedBy?.name || '',
                (req.justification || '').slice(0, 200),
                po?.vendor_name ?? '',
                po?.total_cost ?? '',
                req.procurementStage || 'PENDING'
            ];
        });
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-budget-queue-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export downloaded.');
    };

    const showDashboard = activeView === 'dashboard';
    const showBudgetQueue = activeView === 'budget-queue';

    return (
        <div className="space-y-6">
            {showDashboard && (
                <header className="flex flex-col lg:flex-row lg:items-center justify-between bg-white dark:bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[32px] border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent pointer-events-none"></div>
                    <div className="relative z-10 mb-6 lg:mb-0 text-center lg:text-left">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter flex flex-col lg:flex-row lg:items-center gap-3">
                            <span className="bg-indigo-600 w-2 lg:h-12 rounded-full hidden lg:block shadow-lg shadow-indigo-500/50"></span>
                            Financial <span className="text-indigo-600 dark:text-indigo-400">Governance</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3 lg:ml-5 flex items-center justify-center lg:justify-start gap-2">
                            Asset Valuation & Audit Engine
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 relative z-10">
                        <button
                            onClick={() => window.location.href = '/tickets/new'}
                            className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/5"
                        >
                            <LifeBuoy size={18} /> Support
                        </button>
                        <button
                            onClick={exportFinanceIntel}
                            className="flex items-center gap-3 bg-white dark:bg-slate-900 dark:bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-100 text-slate-900 dark:text-white dark:text-slate-900 px-8 py-3 rounded-2xl border border-slate-700 dark:border-white transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-500/10"
                        >
                            <Download size={18} /> Export Intel
                        </button>
                    </div>
                </header>
            )}

            {showBudgetQueue && (
                <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 px-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4">
                            <span className="w-2 h-10 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></span>
                            Budget <span className="text-emerald-600 dark:text-emerald-400">Registry</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3 ml-6 flex items-center gap-2">
                            Review & Fund Release Authorization
                        </p>
                    </div>
                    <button
                        onClick={exportFinanceIntel}
                        className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
                    >
                        <Download size={18} className="text-emerald-500" /> Export Archive
                    </button>
                </header>
            )}

            <ActionsNeededBanner
                title="Actions needed"
                items={[
                    ...(budgetApprovals.length > 0 ? [{ label: 'Budget approvals', count: budgetApprovals.length, icon: DollarSign, variant: 'primary' }] : []),
                ]}
            />

            {showDashboard && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="group relative glass-panel p-8 overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-[32px]">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-500 shadow-sm dark:shadow-inner">
                                    <DollarSign size={24} />
                                </div>
                                <h3 className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Asset Book Value</h3>
                            </div>
                            <TrendSparkline data={[30, 45, 35, 60, 55, 80]} color="#10b981" />
                        </div>
                        <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">₹{(totalBookValue / 100000).toFixed(1)}<span className="text-xl text-slate-500 dark:text-slate-400 ml-1 font-bold">Lacs</span></p>
                        {financialSummary && (
                            <div className="flex items-center gap-2 mt-4 bg-emerald-500/5 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/10 w-fit">
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Growth +12.4%</span>
                            </div>
                        )}
                    </div>

                    <div className="group relative glass-panel p-8 overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-[32px]">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-400"></div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-500 shadow-sm dark:shadow-inner">
                                    <TrendingDown size={24} />
                                </div>
                                <h3 className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">YTD Depreciation</h3>
                            </div>
                            <TrendSparkline data={[20, 30, 45, 50, 65, 70]} color="#a855f7" />
                        </div>
                        <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">₹{(ytdDepreciation / 100000).toFixed(1)}<span className="text-xl text-slate-500 dark:text-slate-400 ml-1 font-bold">Lacs</span></p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-4 uppercase font-black italic tracking-widest">Straight-line projection ACTIVE</p>
                    </div>

                    <div className="group relative glass-panel p-8 overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-[32px]">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-orange-400"></div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-500 shadow-sm dark:shadow-inner">
                                    <PieChart size={24} />
                                </div>
                                <h3 className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Budget Queue</h3>
                            </div>
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] text-slate-500 dark:text-slate-400 font-black shadow-sm">
                                        JD
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{budgetApprovals.length}<span className="text-xl text-slate-500 dark:text-slate-400 ml-1 font-bold">Files</span></p>

                        <button
                            onClick={() => setShowPoTable(v => !v)}
                            className="mt-6 w-full text-[10px] font-black uppercase tracking-widest px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 dark:bg-white text-slate-900 dark:text-white dark:text-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/10"
                        >
                            {showPoTable ? <CheckCircle size={18} className="text-emerald-400" /> : <Activity size={18} className="text-indigo-400" />}
                            {showPoTable ? 'Close Extraction Audit' : 'Open System Audit'}
                        </button>
                    </div>
                </div>
            )}

            {showDashboard && showPoTable && (
                <div className="glass-panel p-8 border border-slate-200 dark:border-white/10 shadow-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 relative overflow-hidden rounded-[32px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none"></div>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 dark:border-white/5 pb-8 mb-8 relative z-10 gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                <Activity className="text-indigo-500" size={28} />
                                Extraction Audit
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.3em] mt-2 italic">PO Telemetry vs Budgetary Requests Integrity Check</p>
                        </div>
                        <div className="px-5 py-2.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest shadow-sm dark:shadow-inner">
                            {budgetApprovals.length} System Nodes
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/40 shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
                                        <th className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Node ID</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Vendor Context</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Extracted Fiscal</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Batch</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Auth Status</th>
                                        <th className="p-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Tracing</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-900 dark:text-white">
                                    {budgetApprovals.map(req => {
                                        const po = poDetails[req.id];
                                        return (
                                            <tr key={req.id} className="group hover:bg-slate-50 dark:hover:bg-slate-50 dark:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 font-medium">
                                                <td className="p-6 text-xs text-indigo-500 dark:text-indigo-400 font-black font-mono tracking-tighter uppercase px-6">{req.id}</td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all shadow-sm dark:shadow-inner">
                                                            <User size={16} />
                                                        </div>
                                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{po?.vendor_name || 'PENDING'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-sm font-black text-slate-900 dark:text-white text-right font-mono">
                                                    {po?.total_cost != null ? `₹${Number(po.total_cost).toLocaleString()}` : '--'}
                                                </td>
                                                <td className="p-6 text-sm text-slate-500 dark:text-slate-400 text-center font-black">{po?.quantity ?? '0'}</td>
                                                <td className="p-6">
                                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm transition-all ${po?.status === 'extracted'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                                                        }`}>
                                                        {po?.status || 'AWAITING LOGS'}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    {po?.extracted_data ? (
                                                        <details className="group/details">
                                                            <summary className="cursor-pointer text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-all list-none flex items-center justify-end gap-3 uppercase tracking-widest">
                                                                Data Stack
                                                                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center group-open/details:rotate-90 transition-transform shadow-sm dark:shadow-inner">
                                                                    <Activity size={14} />
                                                                </div>
                                                            </summary>
                                                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 pointer-events-none">
                                                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[32px] p-8 shadow-4xl max-w-4xl w-full pointer-events-auto max-h-[80vh] overflow-auto animate-in zoom-in-95 duration-300">
                                                                    <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-white/5 pb-4">
                                                                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Diagnostic Telemetry: {req.id}</h4>
                                                                        <button className="text-[10px] font-black uppercase tracking-widest text-rose-500" onClick={(e) => { e.currentTarget.closest('details').open = false; }}>Close Tracer</button>
                                                                    </div>
                                                                    <RenderStructuredData data={po.extracted_data} />
                                                                </div>
                                                            </div>
                                                        </details>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest italic">Silent Node</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* BUDGET APPROVAL QUEUE */}
            {showBudgetQueue && budgetApprovals.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 shadow-lg">
                                <DollarSign size={26} className="text-emerald-400" />
                            </div>
                            Finance Review Queue
                            <span className="text-[11px] font-black bg-slate-200 dark:bg-white/10 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-700 border border-slate-300 dark:border-white/20 tracking-widest uppercase shadow-md">
                                {budgetApprovals.length} pending
                            </span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {budgetApprovals.map(req => {
                            const po = poDetails[req.id];
                            return (
                                <div key={req.id} className="relative group/req-card">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 rounded-[40px] blur-2xl opacity-0 group-hover/req-card:opacity-100 transition duration-700"></div>

                                    <div className="relative glass-panel rounded-[36px] p-10 border border-slate-200 dark:border-white/10 shadow-3xl overflow-hidden hover:shadow-emerald-500/10 transition-all duration-500">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] rounded-full blur-[100px] -mr-32 -mt-32"></div>

                                        <div className="flex flex-col lg:flex-row gap-16 relative z-10">
                                            {/* LEFT: Request Context */}
                                            <div className="flex-1 space-y-10">
                                                <div className="flex items-start gap-8">
                                                    <div className="w-20 h-20 rounded-[24px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-indigo-500 shadow-sm dark:shadow-inner group-hover/req-card:scale-110 transition-transform duration-700">
                                                        <Activity size={36} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3 uppercase">{req.assetType}</h4>
                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <span className="text-[11px] font-black font-mono text-slate-500 dark:text-slate-400 px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-lg border border-slate-200 dark:border-white/5 uppercase tracking-widest shadow-sm">ID: {req.id}</span>
                                                            <div className="flex items-center gap-2.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] bg-emerald-500/5 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></div>
                                                                {req.procurementStage}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-12 py-8 border-y border-slate-100 dark:border-white/5">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                                            <User size={14} className="text-indigo-500" /> Originator
                                                        </div>
                                                        <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{req.requestedBy.name}</p>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                                            <PieChart size={14} className="text-emerald-500" /> Dept / Unit
                                                        </div>
                                                        <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{req.requestedBy.role}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">Capital Justification</div>
                                                    <div className="relative">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-full opacity-30 shadow-lg"></div>
                                                        <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium italic pl-8 py-2 bg-slate-50/50 dark:bg-white/[0.02] rounded-r-3xl border-r border-slate-100 dark:border-white/5">
                                                            "{req.justification}"
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT: PO Intelligence & Auth */}
                                            <div className="lg:w-[520px] bg-slate-50 dark:bg-black/20 rounded-[32px] p-8 border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-inner flex flex-col justify-between">
                                                {po ? (
                                                    <div className="space-y-10">
                                                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6">
                                                            <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-indigo-500 text-slate-900 dark:text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                                                    <Activity size={16} />
                                                                </div>
                                                                Extraction Telemetry
                                                            </div>
                                                            <div className="flex gap-3">
                                                                <button
                                                                    onClick={() => window.open(apiClient.getPOViewUrl(req.id), '_blank')}
                                                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 transition-all shadow-sm"
                                                                >
                                                                    <Eye size={14} /> View
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditToggle(req.id, po)}
                                                                    className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all shadow-md ${editingPos[req.id] ? 'bg-rose-500 text-slate-900 dark:text-white border-rose-600' : 'bg-white dark:bg-slate-900 dark:bg-white text-slate-900 dark:text-white dark:text-slate-900 border-transparent'}`}
                                                                >
                                                                    {editingPos[req.id] ? 'Cancel Edit' : 'Modify'}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div className="bg-white dark:bg-white/[0.03] p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                                                                <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Primary Vendor</div>
                                                                {editingPos[req.id] ? (
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black text-slate-900 dark:text-white outline-none"
                                                                        value={editData[req.id]?.vendor_name || ''}
                                                                        onChange={(e) => setEditData(prev => ({
                                                                            ...prev,
                                                                            [req.id]: { ...(prev[req.id] || {}), vendor_name: e.target.value }
                                                                        }))}
                                                                    />
                                                                ) : (
                                                                    <div className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{po.vendor_name || 'NOT FOUND'}</div>
                                                                )}
                                                            </div>

                                                            <div className="bg-white dark:bg-white/[0.03] p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                                                                <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Final Valuation</div>
                                                                {editingPos[req.id] ? (
                                                                    <input
                                                                        type="number"
                                                                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black text-slate-900 dark:text-white outline-none"
                                                                        value={editData[req.id]?.total_cost || ''}
                                                                        onChange={(e) => setEditData(prev => ({
                                                                            ...prev,
                                                                            [req.id]: { ...(prev[req.id] || {}), total_cost: parseFloat(e.target.value) }
                                                                        }))}
                                                                    />
                                                                ) : (
                                                                    <div className={`text-xl font-black ${po.total_cost > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 animate-pulse uppercase tracking-widest'}`}>
                                                                        {po.total_cost > 0 ? `₹${po.total_cost.toLocaleString()}` : 'Audit Required'}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="bg-white dark:bg-white/[0.03] p-6 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm col-span-2 space-y-4">
                                                                <div className="flex items-center justify-between text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                                                    <span>Fiscal Classification</span>
                                                                    <span>Matched PO: {po.id.slice(-8).toUpperCase()}</span>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-6">
                                                                    <div>
                                                                        <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-2">Category</label>
                                                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{po.capex_opex || 'OPEX'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Tax Accrual</label>
                                                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase">₹{(po.tax_amount || 0).toLocaleString()}</span>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-2">Logistics</label>
                                                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase">₹{(po.shipping_handling || 0).toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                const isOpening = !expandedPoLogs[req.id];
                                                                setExpandedPoLogs(prev => ({ ...prev, [req.id]: isOpening }));
                                                                if (isOpening && !editingPos[req.id]) handleEditToggle(req.id, po);
                                                            }}
                                                            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 ${expandedPoLogs[req.id] ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:bg-slate-200'}`}
                                                        >
                                                            {expandedPoLogs[req.id] ? 'COLLAPSE DIAGNOSTICS' : 'OPEN TELEMETRY TRACE'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                                                        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-inner">
                                                            <XCircle size={32} className="text-slate-700 dark:text-slate-300" />
                                                        </div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-600">Purchase Document missing from stack</p>
                                                    </div>
                                                )}

                                                <div className="flex gap-4 pt-10">
                                                    {editingPos[req.id] ? (
                                                        <button
                                                            onClick={() => handleSavePO(req.id, po.id)}
                                                            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-500/30 transition-all active:scale-95"
                                                        >
                                                            Sync Audit Metadata
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    const reason = prompt("State reason for budgetary escalation:");
                                                                    if (reason) financeReject(req.id, reason, "Finance Manager");
                                                                }}
                                                                className="flex-1 py-4 rounded-2xl bg-white dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-white/10 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-sm"
                                                            >
                                                                Escalate
                                                            </button>
                                                            <button
                                                                onClick={() => financeApprove(req.id, "Finance Manager")}
                                                                className="flex-[2] py-4 rounded-2xl bg-white dark:bg-slate-900 dark:bg-white text-slate-900 dark:text-white dark:text-slate-900 shadow-2xl hover:bg-slate-100 dark:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-[0.3em] active:scale-95 flex items-center justify-center gap-3"
                                                            >
                                                                Release Funds <CheckCircle size={18} className="text-emerald-500" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {expandedPoLogs[req.id] && (
                                            <div className="mt-12 pt-12 border-t border-slate-100 dark:border-white/5 animate-in slide-in-from-top-12 duration-500">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                                                    <h5 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">Payload Structure Verification</h5>
                                                </div>
                                                <RenderStructuredData
                                                    data={editingPos[req.id] ? (editData[req.id]?.extracted_data || po.extracted_data) : po.extracted_data}
                                                    editing={editingPos[req.id]}
                                                    onValueChange={(key, val) => handleTelemetryChange(req.id, key, val)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showDashboard && (
                <div className="glass-panel p-8 border border-slate-200 dark:border-white/10 shadow-lg rounded-[32px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Fiscal Velocity Analysis</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.3em] mt-1 italic">Rolling 6-Month Expenditure Pattern</p>
                        </div>
                        <div className="flex items-center gap-2 text-indigo-500 bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10 text-[10px] font-black uppercase tracking-widest">
                            <Activity size={14} /> Systems Online
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 900 }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontWeight: 900 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#0f172a', fontWeight: '900', fontSize: '12px' }}
                                    itemStyle={{ color: '#6366f1' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
