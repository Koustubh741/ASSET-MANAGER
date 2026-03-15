import { useState, useEffect } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/apiClient';

const TABS = [
    { id: 'renewals', label: '🔄 Renewals', statusField: 'status', filterNonNull: true },
    { id: 'procurement', label: '📦 Procurement', statusField: 'status', filterNonNull: true },
    { id: 'disposal', label: '🗑 Disposal', statusField: 'status', filterNonNull: true },
];

function StatusBadge({ status }) {
    const colors = {
        Requested: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
        IT_Approved: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
        Finance_Approved: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
        Commercial_Approved: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
        Rejected: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
        Approved: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
        Active: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
        VALIDATED: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
        Ordered: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
        Received: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
        Ready_For_Wipe: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
        Wiped: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
        Disposed: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
        REJECTED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    };
    const sc = colors[status] || { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' };
    return <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{status}</span>;
}

export default function WorkflowsPage() {
    const [tab, setTab] = useState('renewals');
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState({});

    useEffect(() => {
        setLoading(true);
        // Fetch from the specialized workflow endpoint for the current tab
        apiClient.get(`/workflows/${tab}`)
            .then(r => setAssets(Array.isArray(r) ? r : []))
            .catch(() => setAssets([]))
            .finally(() => setLoading(false));
    }, [tab]);

    const action = async (assetId, type, actionName, notes = '') => {
        const actionKey = `${assetId}-${actionName}`;
        setActioning(p => ({ ...p, [actionKey]: true }));
        try {
            // Use the unified /action endpoint
            await apiClient.post('/workflows/action', {
                asset_id: assetId,
                action: actionName.toUpperCase(),
                notes: notes
            });

            // Refresh current tab
            const r = await apiClient.get(`/workflows/${tab}`);
            setAssets(Array.isArray(r) ? r : []);
        } catch (e) {
            console.error('Workflow action failed:', e);
            alert(e.response?.data?.detail || 'Action failed');
        } finally {
            setActioning(p => ({ ...p, [actionKey]: false }));
        }
    };

    const currentTab = TABS.find(t => t.id === tab);
    const filtered = assets; // Backend already filters for the specialized endpoints

    return (
        <>
            <Head><title>Workflows – Asset Manager Pro</title></Head>
            <div className="space-y-6">
                <header>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">⚙️ Workflows Engine</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage renewal, procurement, and disposal approval workflows</p>
                </header>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-0">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-all border-b-2 ${tab === t.id
                                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-white/4'
                                }`}
                        >{t.label}</button>
                    ))}
                </div>

                {loading ? (
                    <div className="glass-card p-8 text-center text-slate-500 dark:text-slate-400">Loading assets…</div>
                ) : filtered.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-xl mb-4">✅</div>
                        <p className="text-slate-500 dark:text-slate-400">No assets currently in the <strong className="text-slate-900 dark:text-white">{currentTab.label.replace(/^.+?\s/, '')}</strong> workflow.</p>
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-left">
                                    <th className="px-4 py-3 font-semibold">Asset</th>
                                    <th className="px-4 py-3 font-semibold">Type</th>
                                    <th className="px-4 py-3 font-semibold">Current Status</th>
                                    {tab === 'renewals' && <th className="px-4 py-3 font-semibold">Renewal Cost</th>}
                                    {tab === 'renewals' && <th className="px-4 py-3 font-semibold">Urgency</th>}
                                    <th className="px-4 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(a => {
                                    const status = a[currentTab.statusField];
                                    const aid = a.id;
                                    return (
                                        <tr key={aid} className="border-b border-slate-200 dark:border-white/5 hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{a.name}</td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{a.type}</td>
                                            <td className="px-4 py-3"><StatusBadge status={status} /></td>
                                            {tab === 'renewals' && (
                                                <td className="px-4 py-3 text-emerald-400">
                                                    {a.renewal_cost ? `₹${Number(a.renewal_cost).toLocaleString()}` : '—'}
                                                </td>
                                            )}
                                            {tab === 'renewals' && (
                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{a.renewal_urgency || '—'}</td>
                                            )}
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    {status !== 'Rejected' && status !== 'Disposed' && status !== 'Commercial_Approved' && status !== 'Received' && (
                                                        <button
                                                            onClick={() => action(aid, tab, 'approve')}
                                                            disabled={actioning[`${aid}-approve`]}
                                                            className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all"
                                                        >{actioning[`${aid}-approve`] ? '…' : '✓ Approve'}</button>
                                                    )}
                                                    {status !== 'Rejected' && status !== 'Disposed' && (
                                                        <button
                                                            onClick={() => action(aid, tab, 'reject')}
                                                            disabled={actioning[`${aid}-reject`]}
                                                            className="text-xs px-3 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-all"
                                                        >{actioning[`${aid}-reject`] ? '…' : '✗ Reject'}</button>
                                                    )}
                                                </div>
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
