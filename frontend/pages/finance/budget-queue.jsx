import { useState, useEffect } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/apiClient';

const STATUS_COLOR = {
    FINANCE_REVIEW_PENDING: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'Pending Review' },
    APPROVED: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: 'Approved' },
    REJECTED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: 'Rejected' },
};

export default function BudgetQueuePage() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectModal, setRejModal] = useState(null);
    const [reason, setReason] = useState('');

    const load = () => {
        setLoading(true);
        apiClient.get('/financials/budget-queue')
            .then(r => setRecords(Array.isArray(r) ? r : []))
            .catch(() => setRecords([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const approve = async (id) => {
        await apiClient.post(`/financials/budget-queue/${id}/approve`, {});
        load();
    };

    const reject = async () => {
        await apiClient.post(`/financials/budget-queue/${rejectModal}/reject`, { reason });
        setRejModal(null);
        setReason('');
        load();
    };

    const pending = records.filter(r => r.finance_status === 'FINANCE_REVIEW_PENDING' || !r.finance_status);
    const resolved = records.filter(r => r.finance_status === 'APPROVED' || r.finance_status === 'REJECTED');

    return (
        <>
            <Head><title>Budget Queue – Asset Manager Pro</title></Head>
            {rejectModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="glass-card w-full max-w-md p-6 space-y-4">
                        <h2 className="text-lg font-bold text-app-text">Reject Finance Record</h2>
                        <textarea
                            className="w-full bg-app-surface-soft border border-white/15 rounded-lg p-3 text-sm text-app-text resize-none h-24"
                            placeholder="Reason for rejection (optional)"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setRejModal(null)} className="px-4 py-2 rounded-lg text-sm text-app-text-muted hover:text-app-text transition-colors">Cancel</button>
                            <button onClick={reject} className="px-4 py-2 rounded-lg text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30">Confirm Reject</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <header>
                    <h1 className="text-xl font-bold text-app-text flex items-center gap-2">💼 Budget Queue</h1>
                    <p className="text-app-text-muted mt-1">Finance approval queue for asset procurement requests</p>
                </header>

                <div className="flex gap-4 flex-wrap">
                    {[
                        { label: 'Pending Approval', count: pending.length, color: '#fbbf24' },
                        { label: 'Resolved', count: resolved.length, color: '#34d399' },
                    ].map(s => (
                        <div key={s.label} className="glass-card px-5 py-3 flex items-center gap-3">
                            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</span>
                            <span className="text-app-text-muted text-sm">{s.label}</span>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="glass-card p-8 text-center text-app-text-muted">Loading budget queue…</div>
                ) : records.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-xl mb-4">💼</div>
                        <p className="text-app-text-muted">No finance records in queue.</p>
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-app-border text-app-text-muted text-left">
                                    <th className="px-4 py-3 font-semibold">Record</th>
                                    <th className="px-4 py-3 font-semibold">Payment Ref</th>
                                    <th className="px-4 py-3 font-semibold">Approver</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Created</th>
                                    <th className="px-4 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(r => {
                                    const sc = STATUS_COLOR[r.finance_status] || STATUS_COLOR['FINANCE_REVIEW_PENDING'];
                                    const isPending = !r.finance_status || r.finance_status === 'FINANCE_REVIEW_PENDING';
                                    return (
                                        <tr key={r.id} className="border-b border-app-border hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 text-app-text-muted font-mono text-xs">{r.id?.slice(0, 8)}…</td>
                                            <td className="px-4 py-3 text-app-text-muted">{r.payment_reference || '—'}</td>
                                            <td className="px-4 py-3 text-app-text-muted">{r.finance_approver_name || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{sc.label}</span>
                                            </td>
                                            <td className="px-4 py-3 text-app-text-muted text-xs">
                                                {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isPending && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => approve(r.id)} className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all">Approve</button>
                                                        <button onClick={() => { setRejModal(r.id); setReason(''); }} className="text-xs px-3 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-all">Reject</button>
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
        </>
    );
}
