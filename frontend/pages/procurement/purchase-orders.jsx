import { useState, useEffect } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/apiClient';

const STATUS_STYLES = {
    UPLOADED: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', label: 'Uploaded' },
    VALIDATED: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: 'Validated' },
    REJECTED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: 'Rejected' },
    RECEIVED: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: 'Received' },
    PENDING: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'Pending' },
};

function StatusBadge({ status }) {
    const s = STATUS_STYLES[status?.toUpperCase?.()] || { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', label: status || '—' };
    return (
        <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
            {s.label}
        </span>
    );
}

function AuditPOModal({ po, onClose, onSave }) {
    const [data, setData] = useState({
        total_cost: po.total_cost || 0,
        tax_amount: po.tax_amount || 0,
        shipping_handling: po.shipping_handling || 0
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiClient.patch(`/financials/purchase-orders/${po.id}/audit`, data);
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Audit failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <div className="bg-white dark:bg-slate-900 border border-app-border rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-app-border flex items-center justify-between">
                    <h3 className="text-xl font-bold text-app-text">Audit PO Financials</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 transition-colors">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Base Cost (Total)</label>
                        <input
                            type="number"
                            value={data.total_cost}
                            onChange={e => setData({ ...data, total_cost: parseFloat(e.target.value) })}
                            className="w-full bg-app-surface-soft border border-app-border rounded-xl py-2 px-4 text-sm"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tax Amount</label>
                            <input
                                type="number"
                                value={data.tax_amount}
                                onChange={e => setData({ ...data, tax_amount: parseFloat(e.target.value) })}
                                className="w-full bg-app-surface-soft border border-app-border rounded-xl py-2 px-4 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Shipping</label>
                            <input
                                type="number"
                                value={data.shipping_handling}
                                onChange={e => setData({ ...data, shipping_handling: parseFloat(e.target.value) })}
                                className="w-full bg-app-surface-soft border border-app-border rounded-xl py-2 px-4 text-sm"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-app-text font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                    >
                        {saving ? 'Saving...' : 'Confirm Audit'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAudit, setSelectedAudit] = useState(null);

    const load = () => {
        setLoading(true);
        apiClient.get('/financials/purchase-orders')
            .then(r => setOrders(Array.isArray(r) ? r : []))
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const updateStatus = async (id, newStatus) => {
        try {
            await apiClient.patch(`/financials/purchase-orders/${id}/status`, { new_status: newStatus });
            load();
        } catch (e) { console.error(e); }
    };

    return (
        <>
            <Head><title>Purchase Orders – Asset Manager Pro</title></Head>
            <div className="space-y-6">
                <header>
                    <h1 className="text-xl font-bold text-app-text flex items-center gap-2">
                        📋 Purchase Orders
                    </h1>
                    <p className="text-app-text-muted mt-1">Track and manage all purchase orders</p>
                </header>

                {loading ? (
                    <div className="glass-card p-8 text-center text-app-text-muted">Loading purchase orders…</div>
                ) : orders.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-xl mb-4">📋</div>
                        <p className="text-app-text-muted text-lg">No purchase orders yet.</p>
                        <p className="text-app-text-muted text-sm mt-2">POs are created when procurement approves an asset request.</p>
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-app-border text-app-text-muted text-left">
                                    <th className="px-4 py-3 font-semibold">Vendor</th>
                                    <th className="px-4 py-3 font-semibold">Total Cost</th>
                                    <th className="px-4 py-3 font-semibold">Qty</th>
                                    <th className="px-4 py-3 font-semibold">Expected Delivery</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Created</th>
                                    <th className="px-4 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(po => (
                                    <tr key={po.id} className="border-b border-app-border hover:bg-white/3 transition-colors">
                                        <td className="px-4 py-3 text-app-text font-medium">{po.vendor_name || '—'}</td>
                                        <td className="px-4 py-3 text-emerald-400 font-semibold">
                                            {po.total_cost != null ? `₹${Number(po.total_cost).toLocaleString()}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-app-text-muted">{po.quantity ?? '—'}</td>
                                        <td className="px-4 py-3 text-app-text-muted">
                                            {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                                        <td className="px-4 py-3 text-app-text-muted text-xs">
                                            {po.created_at ? new Date(po.created_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setSelectedAudit(po)}
                                                    className="text-xs px-3 py-1 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 transition-all font-bold"
                                                >
                                                    Audit
                                                </button>
                                                {po.status !== 'VALIDATED' && po.status !== 'RECEIVED' && (
                                                    <button
                                                        onClick={() => updateStatus(po.id, 'VALIDATED')}
                                                        className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all"
                                                    >Validate</button>
                                                )}
                                                {po.status !== 'REJECTED' && po.status !== 'RECEIVED' && (
                                                    <button
                                                        onClick={() => updateStatus(po.id, 'REJECTED')}
                                                        className="text-xs px-3 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-all"
                                                    >Reject</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedAudit && (
                <AuditPOModal
                    po={selectedAudit}
                    onClose={() => setSelectedAudit(null)}
                    onSave={load}
                />
            )}
        </>
    );
}
