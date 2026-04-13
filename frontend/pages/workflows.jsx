import { useState, useEffect } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/apiClient';
import WorkflowGuideModal from '@/components/WorkflowGuideModal';
import { HelpCircle, RefreshCw } from 'lucide-react';

const TABS = [
    { id: 'approvals', label: '✅ Approvals', statusField: 'status', filterNonNull: true },
    { id: 'renewals', label: '🔄 Renewals', statusField: 'status', filterNonNull: true },
    { id: 'procurement', label: '📦 Procurement', statusField: 'status', filterNonNull: true },
    { id: 'disposal', label: '🗑 Disposal', statusField: 'status', filterNonNull: true },
];

function StatusBadge({ status }) {
    const colors = {
        Requested: { bg: 'bg-app-gold/15', color: 'text-app-gold', border: 'border-app-gold/20' },
        IT_Approved: { bg: 'bg-app-primary/15', color: 'text-app-primary', border: 'border-app-primary/20' },
        Finance_Approved: { bg: 'bg-app-secondary/15', color: 'text-app-secondary', border: 'border-app-secondary/20' },
        Commercial_Approved: { bg: 'bg-app-secondary/15', color: 'text-app-secondary', border: 'border-app-secondary/20' },
        Rejected: { bg: 'bg-app-rose/15', color: 'text-app-rose', border: 'border-app-rose/20' },
        Approved: { bg: 'bg-app-secondary/15', color: 'text-app-secondary', border: 'border-app-secondary/20' },
        Active: { bg: 'bg-app-secondary/15', color: 'text-app-secondary', border: 'border-app-secondary/20' },
        VALIDATED: { bg: 'bg-app-secondary/15', color: 'text-app-secondary', border: 'border-app-secondary/20' },
        Ordered: { bg: 'bg-app-primary/15', color: 'text-app-primary', border: 'border-app-primary/20' },
        Received: { bg: 'bg-app-secondary/15', color: 'text-app-secondary', border: 'border-app-secondary/20' },
        Ready_For_Wipe: { bg: 'bg-app-gold/15', color: 'text-app-gold', border: 'border-app-gold/20' },
        Wiped: { bg: 'bg-app-rose/15', color: 'text-app-rose', border: 'border-app-rose/20' },
        Disposed: { bg: 'bg-app-void', color: 'text-app-text-muted', border: 'border-app-border' },
        REJECTED: { bg: 'bg-app-rose/15', color: 'text-app-rose', border: 'border-app-rose/20' },
    };
    const sc = colors[status] || { bg: 'bg-app-void', color: 'text-app-text-muted', border: 'border-app-border' };
    return (
        <span className={`${sc.bg} ${sc.color} ${sc.border} px-3 py-1 border rounded-none text-[10px] font-black uppercase tracking-widest shadow-sm shadow-black/20`}>
            {status.replace('_', ' ')}
        </span>
    );
}

function UrgencyBadge({ urgency }) {
    const uc = {
        Immediate: { bg: 'bg-app-rose/20', color: 'text-app-rose', border: 'border-app-rose/40' },
        High: { bg: 'bg-app-gold/20', color: 'text-app-gold', border: 'border-app-gold/40' },
        Medium: { bg: 'bg-app-primary/20', color: 'text-app-primary', border: 'border-app-primary/40' },
        Low: { bg: 'bg-app-secondary/20', color: 'text-app-secondary', border: 'border-app-secondary/40' },
    };
    const c = uc[urgency] || { bg: 'bg-app-void', color: 'text-app-text-muted', border: 'border-app-border' };
    return (
        <span className={`${c.bg} ${c.color} ${c.border} px-4 py-1.5 border rounded-none text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-black/40 italic`}>
            {urgency}
        </span>
    );
}

export default function WorkflowsPage() {
    const [tab, setTab] = useState('approvals');
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
            <Head><title>Workflows – Cache Serve</title></Head>
            <div className="space-y-6">
                <header className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-app-text flex items-center gap-4 uppercase italic tracking-tighter leading-none">
                            <RefreshCw size={28} className="text-app-primary" /> Workflows <span className="text-app-primary">Engine</span>
                        </h1>
                        <p className="text-app-text-muted mt-3 text-xs font-black uppercase tracking-[0.3em] opacity-40">Personnel Displacement & Lifecycle Regulation Subsystem</p>
                    </div>
                    <button 
                        onClick={() => setIsGuideOpen(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-app-void text-app-primary hover:bg-app-primary hover:text-app-void border border-app-primary/20 hover:border-transparent rounded-none text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 group"
                    >
                        <HelpCircle size={16} className="group-hover:rotate-[360deg] transition-transform duration-700" />
                        Operation Manual
                    </button>
                </header>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-app-border pb-0 overflow-x-auto">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-8 py-4 rounded-none text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-4 italic ${tab === t.id
                                ? 'border-app-primary text-app-primary bg-app-primary/5'
                                : 'border-transparent text-app-text-muted hover:text-app-primary hover:bg-app-primary/5'
                                }`}
                        >{t.label.toUpperCase()}</button>
                    ))}
                </div>

                {loading ? (
                    <div className="glass-card p-8 text-center text-app-text-muted">Loading assets…</div>
                ) : filtered.length === 0 ? (
                    <div className="glass-panel p-12 text-center border-l-2 border-app-secondary">
                        <div className="text-4xl mb-6 animate-pulse">✓</div>
                        <p className="text-app-text-muted font-black uppercase tracking-widest">No assets currently in the <strong className="text-app-primary italic">{currentTab.label.replace(/^.+?\s/, '').toUpperCase()}</strong> workflow matrix.</p>
                    </div>
                ) : (
                    <div className="glass-panel p-0 overflow-hidden bg-app-obsidian shadow-2xl border-l-2 border-app-border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-app-border text-app-text-muted text-left">
                                    <th className="px-5 py-4 font-black uppercase tracking-widest text-[10px]">Asset Identity</th>
                                    {tab === 'approvals' && <th className="px-5 py-4 font-black uppercase tracking-widest text-[10px]">Requester</th>}
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
                                            {tab === 'approvals' && (
                                                <td className="px-5 py-4 text-app-primary font-black uppercase tracking-[0.1em] text-[11px]">
                                                    {a.requester_name || 'N/A'}
                                                </td>
                                            )}
                                            <td className="px-5 py-4">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-app-text-muted bg-app-void py-1.5 px-3 rounded-none border border-app-border">
                                                    {a.type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4"><StatusBadge status={status} /></td>
                                            {tab === 'renewals' && (
                                                <td className="px-5 py-4 font-black text-app-secondary tracking-widest font-mono italic">
                                                    {a.renewal_cost ? `₹${Number(a.renewal_cost).toLocaleString()}` : <span className="opacity-20 italic">VOID</span>}
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
                                                            className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-none bg-app-secondary/15 text-app-secondary hover:bg-app-secondary hover:text-app-void border border-app-secondary/20 transition-all shadow-xl shadow-app-secondary/5"
                                                        >{actioning[`${aid}-approve`] ? '…' : 'Approve'}</button>
                                                    )}
                                                    {status !== 'Rejected' && status !== 'Disposed' && (
                                                        <button
                                                            onClick={() => action(aid, tab, 'reject')}
                                                            disabled={actioning[`${aid}-reject`]}
                                                            className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-none bg-app-rose/15 text-app-rose hover:bg-app-rose hover:text-app-void border border-app-rose/20 transition-all shadow-xl shadow-app-rose/5"
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
