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
        : [
            { name: 'Jan', value: 2, amount: 180000 },
            { name: 'Feb', value: 4, amount: 320000 },
            { name: 'Mar', value: 3, amount: 275000 },
            { name: 'Apr', value: 5, amount: 410000 },
            { name: 'May', value: 4, amount: 380000 },
            { name: 'Jun', value: 6, amount: 520000 },
        ];

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
                            <p className="text-2xl font-bold text-emerald-400">—</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-none bg-blue-500/20 text-blue-400">
                                <ShoppingCart size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-app-text">{awaitingPO.length}</h3>
                                <p className="text-xs text-app-text-muted">Awaiting PO</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-none bg-amber-500/20 text-amber-400">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-app-text">{awaitingDelivery.length}</h3>
                                <p className="text-xs text-app-text-muted">Awaiting Delivery</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-none bg-emerald-500/20 text-emerald-400">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-app-text">
                                    {totalPendingPOValue > 0 ? `₹${(totalPendingPOValue / 100000).toFixed(1)}L` : '₹0'}
                                </h3>
                                <p className="text-xs text-app-text-muted">Total Pending PO Value</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-none bg-purple-500/20 text-purple-400">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-app-text">{awaitingDelivery.length}</h3>
                                <p className="text-xs text-app-text-muted">Expected Deliveries</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-none bg-rose-500/20 text-rose-400">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-app-text">0</h3>
                                <p className="text-xs text-app-text-muted">Invoice Discrepancies</p>
                            </div>
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
                            <div className="p-8 text-center bg-app-surface-soft rounded-none border border-dashed border-app-border">
                                <p className="text-app-text-muted font-medium">No requests awaiting PO creation</p>
                                <p className="text-sm text-app-text-muted mt-1">Approved requests will appear here for purchase order creation.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-2 md:mx-0">
                                <table className="w-full text-sm text-left min-w-[640px] md:min-w-0">
                                    <thead className="text-app-text-muted text-app-text-muted border-b border-app-border text-xs uppercase font-bold">
                                        <tr>
                                            <th className="pb-3">Request Details</th>
                                            <th className="pb-3">Requested By</th>
                                            <th className="pb-3">Justification</th>
                                            <th className="pb-3">Status</th>
                                            <th className="pb-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-app-text-muted divide-y divide-white/5 divide-slate-200">
                                        {awaitingPO.map(req => (
                                            <tr key={req.id} className="hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft hover:bg-slate-50 transition-colors">
                                                <td className="py-3">
                                                    <div className="font-medium text-app-text">{req.assetType}</div>
                                                    <div className="text-xs text-app-text-muted font-mono mt-0.5">{req.id}</div>
                                                </td>
                                                <td className="py-3">
                                                    <div>{req.requestedBy?.name ?? '—'}</div>
                                                    <div className="text-xs text-app-text-muted">{req.requestedBy?.role ?? req.requestedBy?.position ?? ''}</div>
                                                </td>
                                                <td className="py-3">
                                                    <div className="text-xs text-app-text-muted text-app-text-muted max-w-xs truncate">{req.justification}</div>
                                                </td>
                                                <td className="py-3">
                                                    <span className="px-2 py-1 text-xs rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        PROCUREMENT REQUIRED
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt("Enter rejection reason:");
                                                                if (reason && reason.trim()) procurementReject(req.id, reason.trim());
                                                            }}
                                                            className="bg-rose-600 hover:bg-rose-500 text-app-text text-xs px-3 py-2 rounded-none font-medium shadow-lg shadow-rose-500/10 transition-all flex items-center gap-2"
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedRequest(req)}
                                                            className="bg-blue-600 hover:bg-blue-500 text-app-text text-xs px-4 py-2 rounded-none font-medium shadow-lg shadow-blue-500/10 transition-all flex items-center gap-2"
                                                        >
                                                            <Eye size={14} /> Review & Approve
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
                </>
            )}

            {/* SECTION 2: Confirm Deliveries - deliveries view only */}
            {showDeliveries && (
                <>
                    <header className="flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold text-app-text flex items-center gap-2">
                                <Truck className="text-emerald-400" />
                                Deliveries
                            </h1>
                            <p className="text-app-text-muted text-app-text-muted text-sm mt-1">Confirm delivery and send to inventory</p>
                        </div>
                    </header>
                    {awaitingDelivery.length > 0 && (
                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-bold text-app-text mb-4 flex items-center gap-2">
                                <Truck className="text-emerald-400" />
                                Confirm Deliveries (Finance Approved)
                                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20">{awaitingDelivery.length}</span>
                            </h3>

                            <div className="overflow-x-auto -mx-2 md:mx-0">
                                <table className="w-full text-sm text-left min-w-[560px] md:min-w-0">
                                    <thead className="text-app-text-muted text-app-text-muted border-b border-app-border text-xs uppercase font-bold">
                                        <tr>
                                            <th className="pb-3">Asset Type</th>
                                            <th className="pb-3">For User</th>
                                            <th className="pb-3">PO Stage</th>
                                            <th className="pb-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-app-text-muted divide-y divide-white/5 divide-slate-200">
                                        {awaitingDelivery.map(req => (
                                            <tr key={req.id} className="hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft hover:bg-slate-50 transition-colors">
                                                <td className="py-3">
                                                    <div className="font-medium text-app-text">{req.assetType}</div>
                                                    <div className="text-xs text-app-text-muted font-mono">{req.id}</div>
                                                </td>
                                                <td className="py-3">{req.requestedBy?.name ?? '—'}</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-1 text-xs rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        FINANCE APPROVED
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setSelectedRequest(req)}
                                                            className="p-2 text-app-text-muted text-app-text-muted hover:text-app-text hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-none transition-all"
                                                            title="View Details"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedRequest(req)}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-app-text text-xs px-4 py-2 rounded-none font-medium shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2"
                                                        >
                                                            <CheckCircle size={14} /> Confirm Delivery → Inventory
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {/* Deliveries view empty state */}
                    {awaitingDelivery.length === 0 && (
                        <div className="glass-panel p-8 text-center">
                            <Truck className="w-12 h-12 text-app-text-muted mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-app-text mb-1">Confirm Deliveries</h3>
                            <p className="text-app-text-muted text-app-text-muted">No requests awaiting delivery confirmation. Finance-approved requests will appear here.</p>
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
