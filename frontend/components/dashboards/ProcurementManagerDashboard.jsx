import { ShoppingCart, FileText, Calendar, CreditCard, CheckCircle, Truck, XCircle, Upload, Eye, DollarSign, Download, Activity, LifeBuoy } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAssetContext } from '@/contexts/AssetContext';
import ProcurementActionModal from '../ProcurementActionModal';
import { useState, useEffect } from 'react';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/components/common/Toast';

/** @param {{ activeView?: 'dashboard' | 'purchase-orders' | 'deliveries' }} props */
export default function ProcurementManagerDashboard({ activeView = 'dashboard' }) {
    const { requests, procurementCreatePO, procurementConfirmDelivery, procurementApprove, procurementReject, procurementUploadPO } = useAssetContext();
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [poDetails, setPoDetails] = useState({});
    const [showPoAudit, setShowPoAudit] = useState(false);
    const [editingPoId, setEditingPoId] = useState(null);
    const [editPoData, setEditPoData] = useState({});
    const [procurementSummary, setProcurementSummary] = useState(null);
    const toast = useToast();

    useEffect(() => {
        apiClient.getProcurementSummary(6)
            .then(res => setProcurementSummary(res))
            .catch(() => setProcurementSummary(null));
    }, []);

    // ENTERPRISE: Requests needing PO creation (routed from Inventory)
    const awaitingPO = requests.filter(r =>
        r.currentOwnerRole === 'PROCUREMENT' &&
        r.status === 'PROCUREMENT_REQUIRED' &&
        (!r.procurementStage || r.procurementStage === 'AWAITING_DECISION')
    );

    // ENTERPRISE: Requests with finance approval awaiting delivery confirmation
    const awaitingDelivery = requests.filter(r => r.currentOwnerRole === 'PROCUREMENT' && r.procurementStage === 'FINANCE_APPROVED');

    const deliveryIds = awaitingDelivery.map(r => r.id).join(',');
    useEffect(() => {
        const fetch = async () => {
            const details = {};
            for (const req of awaitingDelivery) {
                try {
                    const po = await apiClient.getPO(req.id);
                    if (po) details[req.id] = po;
                } catch (e) {
                    console.warn('PO fetch failed for', req.id, e);
                }
            }
            setPoDetails(details);
        };
        if (awaitingDelivery.length > 0) fetch();
    }, [awaitingDelivery.length, deliveryIds]);

    const totalPendingPOValue = procurementSummary?.pending_po_total_value != null
        ? procurementSummary.pending_po_total_value
        : awaitingDelivery.reduce((sum, req) => {
            const po = poDetails[req.id];
            const cost = po?.total_cost != null ? Number(po.total_cost) : 0;
            return sum + cost;
        }, 0);

    const handleSavePO = async (requestId, poId) => {
        try {
            const data = editPoData[requestId];
            if (!data) return;
            const updated = await apiClient.updatePODetails(poId, data);
            setPoDetails(prev => ({ ...prev, [requestId]: updated }));
            setEditingPoId(null);
            toast.success('PO details updated.');
        } catch (e) {
            toast.error('Failed to save PO changes.');
        }
    };

    const exportProcurementSummary = () => {
        const rows = [
            ['Type', 'Request ID', 'Asset Type', 'Requested By', 'Justification', 'Status'],
            ...awaitingPO.map(r => ['Awaiting PO', r.id, r.assetType, r.requestedBy?.name || '', (r.justification || '').slice(0, 100), 'PROCUREMENT_REQUIRED']),
            ...awaitingDelivery.map(r => ['Awaiting Delivery', r.id, r.assetType, r.requestedBy?.name || '', (r.justification || '').slice(0, 100), 'FINANCE_APPROVED']),
        ];
        const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `procurement-summary-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export downloaded.');
    };

    const trendData = procurementSummary?.monthly_po_value?.length
        ? procurementSummary.monthly_po_value.map(d => ({
            name: d.month.length >= 7 ? d.month.slice(5, 7) + '/' + d.month.slice(2, 4) : d.month,
            value: d.po_count,
            amount: d.total_spend || 0
        }))
        : [];

    const showDashboard = activeView === 'dashboard';
    const showPurchaseOrders = activeView === 'purchase-orders';
    const showDeliveries = activeView === 'deliveries';

    return (
        <div className="space-y-6 neural-compact">
            {showDashboard && (
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-xl font-bold text-app-text">Procurement Hub</h1>
                        <p className="text-app-text-muted text-app-text-muted">Manage purchasing, vendors, and budgets</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.location.href = '/tickets/new'}
                            className="flex items-center gap-2 px-4 py-2 rounded-none bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-sm font-medium transition-all active:scale-95"
                        >
                            <LifeBuoy size={18} /> Get Support
                        </button>
                        <button
                            onClick={exportProcurementSummary}
                            className="flex items-center gap-2 px-4 py-2 rounded-none bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface border border-slate-200 dark:border-white/20 text-app-text text-sm font-medium"
                        >
                            <Download size={18} /> Export PO & Delivery Summary
                        </button>
                        <div className="text-right">
                            <p className="text-xs text-app-text-muted">Quarterly Budget Remaining</p>
                            <p className={`text-2xl font-bold ${procurementSummary?.remaining_budget < 100000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {procurementSummary?.remaining_budget != null ? `₹${(procurementSummary.remaining_budget / 100000).toFixed(1)}L` : '--'}
                            </p>
                        </div>
                    </div>
                </header>
            )}

            {showDashboard && (
                <ActionsNeededBanner
                    title="Actions needed"
                    items={[
                        ...(awaitingPO.length > 0 ? [{ label: 'Awaiting PO', count: awaitingPO.length, icon: ShoppingCart, variant: 'primary' }] : []),
                        ...(awaitingDelivery.length > 0 ? [{ label: 'Awaiting delivery', count: awaitingDelivery.length, icon: Truck, variant: 'warning' }] : []),
                    ]}
                />
            )}

            {showDashboard && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="fui-status-card p-6 relative group overflow-hidden border-primary/20">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-primary transition-all" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-primary/10 text-primary border border-primary/20">
                                <ShoppingCart size={24} className="glow-text-primary" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white italic tracking-tighter">{awaitingPO.length}</h3>
                                <p className="text-[9px] font-mono text-primary/60 uppercase tracking-[0.2em]">Awaiting_PO_Signal</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[8px] font-mono text-white/20">
                            <span>SIG_ID: 0x42F</span>
                            <span>LATENCY: 12ms</span>
                        </div>
                    </div>

                    <div className="fui-status-card p-6 relative group overflow-hidden border-amber-500/20">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/40 group-hover:bg-amber-500 transition-all" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <Truck size={24} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white italic tracking-tighter">{awaitingDelivery.length}</h3>
                                <p className="text-[9px] font-mono text-amber-500/60 uppercase tracking-[0.2em]">In_Transit_Nodes</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[8px] font-mono text-white/20">
                            <span>VEC: LOG_ROUTE_01</span>
                            <span>STATUS: SYNCED</span>
                        </div>
                    </div>

                    <div className="fui-status-card p-6 relative group overflow-hidden border-emerald-500/20 lg:col-span-2">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/40 group-hover:bg-emerald-500 transition-all" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-emerald-400 italic tracking-tighter">
                                        {totalPendingPOValue > 0 ? `₹${(totalPendingPOValue / 100000).toFixed(1)}L` : '₹0'}
                                    </h3>
                                    <p className="text-[9px] font-mono text-emerald-500/60 uppercase tracking-[0.2em]">Fiscal_Exposure_Metric</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[8px] font-mono text-emerald-500/40 uppercase mb-1">Budget_Handshake</div>
                                <div className="w-24 h-1 bg-white/5 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full bg-emerald-500/40 animate-scanning-fast" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="fui-status-card p-6 relative group overflow-hidden border-rose-500/20">
                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/40 group-hover:bg-rose-500 transition-all" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                <XCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white italic tracking-tighter">0</h3>
                                <p className="text-[9px] font-mono text-rose-500/60 uppercase tracking-[0.2em]">Discrepancy_Log</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[8px] font-mono text-white/20">
                            <span>ERR_CODE: 0x0</span>
                            <span>LEVEL: STABLE</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Trend chart - dashboard only */}
            {showDashboard && (
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-app-text mb-4">PO / Request trend (6 months)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="procurementValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                                <YAxis stroke="#64748b" tickLine={false} tickFormatter={v => `₹${(v / 1000)}k`} />
                                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'PO value']} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#procurementValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* PO Intelligence / Extraction audit - deliveries view only */}
            {showDeliveries && awaitingDelivery.length > 0 && (
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-app-text flex items-center gap-2">
                            <Activity className="text-indigo-400" />
                            PO Intelligence
                            <span className="text-xs font-normal text-app-text-muted">Vendor, cost, extraction data</span>
                        </h3>
                        <button
                            onClick={() => setShowPoAudit(!showPoAudit)}
                            className="text-xs px-3 py-1.5 rounded-none bg-app-surface-soft border border-app-border-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface"
                        >
                            {showPoAudit ? 'Hide' : 'Show'} audit table
                        </button>
                    </div>
                    {showPoAudit && (
                        <div className="overflow-x-auto rounded-none border border-app-border">
                            <table className="w-full text-sm text-left">
                                <thead className="text-app-text-muted text-app-text-muted border-b border-app-border text-xs uppercase font-bold">
                                    <tr>
                                        <th className="p-3">Request ID</th>
                                        <th className="p-3">Asset Type</th>
                                        <th className="p-3">Vendor</th>
                                        <th className="p-3 text-right">Total Cost</th>
                                        <th className="p-3 text-center">Qty</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-app-text-muted divide-y divide-white/5 divide-slate-200">
                                    {awaitingDelivery.map(req => {
                                        const po = poDetails[req.id];
                                        const isEditing = editingPoId === req.id;
                                        return (
                                            <tr key={req.id} className="hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft hover:bg-slate-50">
                                                <td className="p-3 font-mono text-xs">{req.id}</td>
                                                <td className="p-3">{req.assetType}</td>
                                                <td className="p-3">
                                                    {isEditing ? (
                                                        <input
                                                            className="w-full max-w-[140px] bg-slate-50 dark:bg-slate-800 border border-app-border-soft rounded px-2 py-1 text-sm text-app-text"
                                                            value={editPoData[req.id]?.vendor_name ?? po?.vendor_name ?? ''}
                                                            onChange={(e) => {
                                                                const v = e.target.value;
                                                                setEditPoData(prev => ({ ...prev, [req.id]: { ...(prev[req.id] || {}), vendor_name: v } }));
                                                            }}
                                                        />
                                                    ) : (
                                                        <span>{po?.vendor_name ?? '—'}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            className="w-24 bg-slate-50 dark:bg-slate-800 border border-app-border-soft rounded px-2 py-1 text-sm text-app-text text-right"
                                                            value={editPoData[req.id]?.total_cost ?? po?.total_cost ?? ''}
                                                            onChange={(e) => {
                                                                const v = parseFloat(e.target.value) || 0;
                                                                setEditPoData(prev => ({ ...prev, [req.id]: { ...(prev[req.id] || {}), total_cost: v } }));
                                                            }}
                                                        />
                                                    ) : (
                                                        po?.total_cost != null ? `₹${Number(po.total_cost).toLocaleString()}` : '—'
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">{po?.quantity ?? '—'}</td>
                                                <td className="p-3">
                                                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{po?.status || 'OK'}</span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    {isEditing ? (
                                                        <button
                                                            onClick={() => po?.id && handleSavePO(req.id, po.id)}
                                                            className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-app-text hover:bg-emerald-500"
                                                        >
                                                            Save
                                                        </button>
                                                    ) : (
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => window.open(apiClient.getPOViewUrl(req.id), '_blank')}
                                                                className="text-xs px-2 py-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                                                                title="View PO PDF"
                                                            >
                                                                View PO
                                                            </button>
                                                            <button
                                                                onClick={() => { setEditingPoId(req.id); setEditPoData(prev => ({ ...prev, [req.id]: { vendor_name: po?.vendor_name, total_cost: po?.total_cost } })); }}
                                                                className="text-xs px-3 py-1.5 rounded bg-app-surface hover:bg-white/20"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* SECTION 1: Create Purchase Orders - purchase-orders view only */}
            {showPurchaseOrders && (
                <>
                    <header className="flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold text-app-text flex items-center gap-2">
                                <FileText className="text-blue-400" />
                                Purchase orders
                            </h1>
                            <p className="text-app-text-muted text-app-text-muted text-sm mt-1">Create and manage purchase orders for approved requests</p>
                        </div>
                    </header>
                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
                            <ShoppingCart className="text-blue-400" />
                            Create Purchase Orders
                            <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/20">{awaitingPO.length}</span>
                        </h3>

                        {awaitingPO.length === 0 ? (
                            <div className="p-8 text-center bg-white/5 border border-dashed border-white/10 relative overflow-hidden">
                                <div className="absolute inset-0 pixel-grid-overlay opacity-10" />
                                <p className="text-app-text-muted font-medium relative z-10 uppercase tracking-widest text-[10px]">No_Active_Signals</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {awaitingPO.map(req => (
                                    <div key={req.id} className="fui-status-card group relative overflow-hidden p-6 hover:border-primary/40 transition-all border-white/5">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-all" />
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-primary/5 border border-primary/20">
                                                    <FileText size={20} className="text-primary/60" />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-white tracking-tight">{req.assetType}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-mono text-primary/40 uppercase tracking-wider">{req.id}</span>
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        <span className="text-[10px] font-mono text-white/40">{req.requestedBy?.name ?? 'ANONYMOUS_ACTOR'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 max-w-md hidden lg:block">
                                                <div className="text-[9px] font-mono text-white/20 uppercase mb-1 tracking-widest">Justification_Protocol</div>
                                                <p className="text-xs text-app-text-muted line-clamp-1 italic">"{req.justification}"</p>
                                            </div>

                                            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt("Enter rejection reason:");
                                                        if (reason && reason.trim()) procurementReject(req.id, reason.trim());
                                                    }}
                                                    className="px-4 py-2 border border-rose-500/20 bg-rose-500/5 text-rose-500 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500/20 active:scale-95 transition-all"
                                                >
                                                    Reject_Node
                                                </button>
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="px-6 py-2 bg-primary/10 border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 hover:border-primary active:scale-95 transition-all shadow-[0_0_15px_rgba(var(--color-primary),0.1)]"
                                                >
                                                    Review_&_Authorize
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Entry Telemetry */}
                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-white/10 uppercase tracking-[0.2em]">
                                            <div className="flex gap-4">
                                                <span>VEC_ORIGIN: {req.requestedBy?.dept || 'ROOT'}</span>
                                                <span>SIG_AUTH: AES_ENCRYPTED</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
                                                LIVE_SIGNAL
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* SECTION 2: Confirm Deliveries - deliveries view only */}
            {showDeliveries && (
                <>
                    <header className="flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                                <Truck className="text-emerald-400 glow-text-emerald" />
                                Delivery_Network
                            </h1>
                            <p className="text-emerald-500/40 text-[10px] font-mono uppercase tracking-[0.3em] mt-1">Confirm active transit nodes to inventory</p>
                        </div>
                    </header>
                    {awaitingDelivery.length > 0 && (
                        <div className="glass-panel p-6 border-emerald-500/10">
                            <div className="space-y-4">
                                {awaitingDelivery.map(req => (
                                    <div key={req.id} className="fui-status-card group relative overflow-hidden p-6 hover:border-emerald-500/40 transition-all border-white/5">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-all" />
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-500">
                                                    <ShoppingCart size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-white tracking-tight">{req.assetType}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-mono text-emerald-500/40 uppercase tracking-wider">{req.id}</span>
                                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                                        <span className="text-[10px] font-mono text-white/40">Target: {req.requestedBy?.name ?? 'ROOT'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="p-3 text-white/20 hover:text-white hover:bg-white/5 transition-all"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="px-6 py-2 bg-emerald-600/10 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600/20 hover:border-emerald-500 transition-all"
                                                >
                                                    Execute_Receipt → Inventory
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-white/10 uppercase tracking-[0.2em]">
                                            <div className="flex gap-4">
                                                <span>TRANSIT_ID: TXN_{req.id.slice(0, 6)}</span>
                                                <span>BUDGET_CODE: FIN_SEC_01</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-emerald-500/60">
                                                <div className="flex gap-0.5">
                                                    <div className="w-1 h-1 bg-emerald-500 animate-pulse" />
                                                    <div className="w-1 h-1 bg-emerald-500/40" />
                                                    <div className="w-1 h-1 bg-emerald-500/20" />
                                                </div>
                                                IN_TRANSIT
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Deliveries view empty state */}
                    {awaitingDelivery.length === 0 && (
                        <div className="glass-panel p-12 text-center border-white/5">
                            <Truck className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <h3 className="text-white/40 font-black italic tracking-tighter uppercase">Transit_Grid_Empty</h3>
                            <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-2">No active delivery signals detected in the sectors</p>
                        </div>
                    )}
                </>
            )}

            {/* Procurement Details Modal - shared when a request is selected */}
            <ProcurementActionModal
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
                request={selectedRequest}
                onUploadPO={procurementUploadPO}
                onReject={procurementReject}
                onConfirmDelivery={procurementConfirmDelivery}
            />
        </div>
    )
}
