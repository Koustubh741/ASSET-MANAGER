import { useState, useEffect } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/apiClient';
import WorkflowGuideModal from '@/components/WorkflowGuideModal';
import { HelpCircle } from 'lucide-react';

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

function UrgencyBadge({ urgency }) {
    const uc = {
        Immediate: { bg: 'rgba(239,68,68,0.2)', color: '#f87171', shadow: '0 0 10px rgba(239,68,68,0.3)' },
        High: { bg: 'rgba(245,158,11,0.2)', color: '#fbbf24', shadow: 'none' },
        Medium: { bg: 'rgba(99,102,241,0.2)', color: '#818cf8', shadow: 'none' },
        Low: { bg: 'rgba(16,185,129,0.2)', color: '#34d399', shadow: 'none' },
    };
    const c = uc[urgency] || { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', shadow: 'none' };
    return (
        <span style={{ 
            background: c.bg, 
            color: c.color, 
            boxShadow: c.shadow,
            padding: '4px 12px', 
            borderRadius: '10px', 
            fontSize: '10px', 
            fontWeight: 800, 
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
        }}>
            {urgency}
        </span>
    );
}

export default function WorkflowsPage() {
    const [tab, setTab] = useState('renewals');
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState({});
    const [isGuideOpen, setIsGuideOpen] = useState(false);

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
                <header className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-app-text flex items-center gap-2">⚙️ Workflows Engine</h1>
                        <p className="text-app-text-muted mt-1">Manage renewal, procurement, and disposal approval workflows</p>
                    </div>
                    <button 
                        onClick={() => setIsGuideOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/5 group"
                    >
                        <HelpCircle size={16} className="group-hover:rotate-12 transition-transform" />
                        How it Works
                    </button>
                </header>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-app-border pb-0">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-all border-b-2 ${tab === t.id
                                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                                : 'border-transparent text-app-text-muted hover:text-app-text hover:bg-white/4'
                                }`}
                        >{t.label}</button>
                    ))}
                </div>

                {loading ? (
                    <div className="glass-card p-8 text-center text-app-text-muted">Loading assets…</div>
                ) : filtered.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-xl mb-4">✅</div>
                        <p className="text-app-text-muted">No assets currently in the <strong className="text-app-text">{currentTab.label.replace(/^.+?\s/, '')}</strong> workflow.</p>
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-app-border text-app-text-muted text-left">
                                    <th className="px-5 py-4 font-black uppercase tracking-widest text-[10px]">Asset Identity</th>
                                    <th className="px-5 py-4 font-black uppercase tracking-widest text-[10px]">Type</th>
                                    <th className="px-5 py-4 font-black uppercase tracking-widest text-[10px]">Workflow Status</th>
                                    {tab === 'renewals' && <th className="px-5 py-4 font-black uppercase tracking-widest text-[10px]">Mkt Est. Cost</th>}
                                    {tab === 'renewals' && <th className="px-5 py-4 font-black uppercase tracking-widest text-[10px]">Urgency</th>}
                                    <th className="px-5 py-4 font-black uppercase tracking-widest text-[10px]">Approval Gate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(a => {
                                    const status = a[currentTab.statusField];
                                    const aid = a.id;
                                    return (
                                        <tr key={aid} className="border-b border-app-border hover:bg-white/3 transition-colors">
                                            <td className="px-5 py-4 text-app-text font-bold">{a.name}</td>
                                            <td className="px-5 py-4">
                                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-500 bg-app-surface-soft py-1 px-2 rounded-md border border-app-border">
                                                    {a.type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4"><StatusBadge status={status} /></td>
                                            {tab === 'renewals' && (
                                                <td className="px-5 py-4 font-medium text-emerald-400">
                                                    {a.renewal_cost ? `₹${Number(a.renewal_cost).toLocaleString()}` : <span className="opacity-30 italic">Calculating...</span>}
                                                </td>
                                            )}
                                            {tab === 'renewals' && (
                                                <td className="px-5 py-4">
                                                    <UrgencyBadge urgency={a.renewal_urgency} />
                                                </td>
                                            )}
                                            <td className="px-5 py-4">
                                                <div className="flex gap-2">
                                                    {status !== 'Rejected' && status !== 'Disposed' && status !== 'Commercial_Approved' && status !== 'Received' && (
                                                        <button
                                                            onClick={() => action(aid, tab, 'approve')}
                                                            disabled={actioning[`${aid}-approve`]}
                                                            className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all shadow-lg shadow-emerald-500/5"
                                                        >{actioning[`${aid}-approve`] ? '…' : 'Approve'}</button>
                                                    )}
                                                    {status !== 'Rejected' && status !== 'Disposed' && (
                                                        <button
                                                            onClick={() => action(aid, tab, 'reject')}
                                                            disabled={actioning[`${aid}-reject`]}
                                                            className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 transition-all shadow-lg shadow-rose-500/5"
                                                        >{actioning[`${aid}-reject`] ? '…' : 'Reject'}</button>
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
            <WorkflowGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </>
    );
}
