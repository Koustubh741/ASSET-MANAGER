import { useState, useEffect } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/apiClient';

function DeliveryStatusBadge({ status, expectedDate }) {
    const today = new Date();
    const exp = expectedDate ? new Date(expectedDate) : null;
    const isOverdue = exp && exp < today && status !== 'RECEIVED';

    if (status === 'RECEIVED') return <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>✅ Received</span>;
    if (isOverdue) return <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>⚠ Overdue</span>;
    return <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>⏳ Pending</span>;
}

export default function DeliveriesPage() {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        apiClient.get('/financials/deliveries')
            .then(r => setDeliveries(Array.isArray(r) ? r : []))
            .catch(() => setDeliveries([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const markReceived = async (id) => {
        try {
            await apiClient.patch(`/financials/deliveries/${id}/receive`, {});
            load();
        } catch (e) { console.error(e); }
    };

    const today = new Date();
    const overdue = deliveries.filter(d => d.expected_delivery_date && new Date(d.expected_delivery_date) < today && d.status !== 'RECEIVED');
    const pending = deliveries.filter(d => d.status !== 'RECEIVED' && !(d.expected_delivery_date && new Date(d.expected_delivery_date) < today));
    const received = deliveries.filter(d => d.status === 'RECEIVED');

    return (
        <>
            <Head><title>Deliveries – Asset Manager Pro</title></Head>
            <div className="space-y-6">
                <header>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">🚚 Deliveries Tracking</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor incoming asset deliveries and confirm receipts</p>
                </header>

                {/* Summary pills */}
                <div className="flex gap-4 flex-wrap">
                    {[
                        { label: 'Overdue', count: overdue.length, color: '#f87171' },
                        { label: 'Pending', count: pending.length, color: '#fbbf24' },
                        { label: 'Received', count: received.length, color: '#34d399' },
                    ].map(s => (
                        <div key={s.label} className="glass-card px-5 py-3 flex items-center gap-3">
                            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-sm">{s.label}</span>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="glass-card p-8 text-center text-slate-500 dark:text-slate-400">Loading deliveries…</div>
                ) : deliveries.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-xl mb-4">📦</div>
                        <p className="text-slate-500 dark:text-slate-400">No deliveries to track yet.</p>
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-left">
                                    <th className="px-4 py-3 font-semibold">Vendor</th>
                                    <th className="px-4 py-3 font-semibold">Total Cost</th>
                                    <th className="px-4 py-3 font-semibold">Expected On</th>
                                    <th className="px-4 py-3 font-semibold">Delivery Status</th>
                                    <th className="px-4 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliveries.map(d => (
                                    <tr key={d.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-white/3 transition-colors">
                                        <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{d.vendor_name || '—'}</td>
                                        <td className="px-4 py-3 text-emerald-400 font-semibold">
                                            {d.total_cost != null ? `₹${Number(d.total_cost).toLocaleString()}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                            {d.expected_delivery_date
                                                ? new Date(d.expected_delivery_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <DeliveryStatusBadge status={d.status} expectedDate={d.expected_delivery_date} />
                                        </td>
                                        <td className="px-4 py-3">
                                            {d.status !== 'RECEIVED' && (
                                                <button
                                                    onClick={() => markReceived(d.id)}
                                                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all font-semibold"
                                                >✓ Mark Received</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
