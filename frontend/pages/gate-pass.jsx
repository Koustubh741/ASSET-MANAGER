import { useState, useEffect } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';

const STATUS_STYLE = {
    PENDING: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'Pending' },
    APPROVED: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: 'Approved' },
    REVOKED: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: 'Revoked' },
    EXPIRED: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', label: 'Expired' },
};

const APPROVER_ROLES = ['ADMIN', 'IT_MANAGEMENT', 'ASSET_MANAGER'];

export default function GatePassPage() {
    const { currentRole } = useRole();
    const [passes, setPasses] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ asset_id: '', issued_to: '', reason: '', destination: '', valid_until: '' });
    const [saving, setSaving] = useState(false);

    const isApprover = APPROVER_ROLES.includes(currentRole?.value?.toUpperCase?.() || '');

    const load = () => {
        setLoading(true);
        Promise.all([
            apiClient.get('/gate-pass').catch(() => []),
            apiClient.get('/assets').catch(() => []),
        ]).then(([gps, assetList]) => {
            setPasses(Array.isArray(gps) ? gps : []);
            setAssets(Array.isArray(assetList) ? assetList : assetList?.assets || []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const createPass = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form };
            if (!payload.valid_until) delete payload.valid_until;
            await apiClient.post('/gate-pass', payload);
            setShowForm(false);
            setForm({ asset_id: '', issued_to: '', reason: '', destination: '', valid_until: '' });
            load();
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const updatePass = async (id, action) => {
        try {
            await apiClient.patch(`/gate-pass/${id}/${action}`, {});
            load();
        } catch (e) { console.error(e); }
    };

    return (
        <>
            <Head><title>Gate Pass – Asset Manager Pro</title></Head>
            <div className="space-y-6">
                <header className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-app-text flex items-center gap-2">🚪 Gate Pass</h1>
                        <p className="text-app-text-muted mt-1">Authorize physical movement of assets</p>
                    </div>
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className="px-5 py-2.5 rounded-none bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 font-semibold text-sm transition-all"
                    >+ Create Gate Pass</button>
                </header>

                {showForm && (
                    <form onSubmit={createPass} className="glass-card p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-app-text">New Gate Pass</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-app-text-muted mb-1">Asset *</label>
                                <select
                                    required
                                    value={form.asset_id}
                                    onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))}
                                    className="w-full bg-app-surface-soft border border-white/15 rounded-none px-3 py-2 text-sm text-app-text"
                                >
                                    <option value="">Select asset…</option>
                                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.serial_number})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-app-text-muted mb-1">Issued To *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Person receiving the asset"
                                    value={form.issued_to}
                                    onChange={e => setForm(f => ({ ...f, issued_to: e.target.value }))}
                                    className="w-full bg-app-surface-soft border border-white/15 rounded-none px-3 py-2 text-sm text-app-text"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-app-text-muted mb-1">Destination</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Branch Office"
                                    value={form.destination}
                                    onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                                    className="w-full bg-app-surface-soft border border-white/15 rounded-none px-3 py-2 text-sm text-app-text"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-app-text-muted mb-1">Valid Until</label>
                                <input
                                    type="datetime-local"
                                    value={form.valid_until}
                                    onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                                    className="w-full bg-app-surface-soft border border-white/15 rounded-none px-3 py-2 text-sm text-app-text"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs text-app-text-muted mb-1">Reason *</label>
                                <textarea
                                    required
                                    placeholder="Reason for moving this asset"
                                    value={form.reason}
                                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                    className="w-full bg-app-surface-soft border border-white/15 rounded-none px-3 py-2 text-sm text-app-text resize-none h-20"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-none text-sm text-app-text-muted hover:text-app-text">Cancel</button>
                            <button type="submit" disabled={saving} className="px-5 py-2 rounded-none text-sm bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 font-semibold">
                                {saving ? 'Creating…' : 'Create Pass'}
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div className="glass-card p-8 text-center text-app-text-muted">Loading gate passes…</div>
                ) : passes.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-xl mb-4">🚪</div>
                        <p className="text-app-text-muted">No gate passes yet. Create one above.</p>
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-app-border text-app-text-muted text-left">
                                    <th className="px-4 py-3 font-semibold">Asset</th>
                                    <th className="px-4 py-3 font-semibold">Issued To</th>
                                    <th className="px-4 py-3 font-semibold">Issued By</th>
                                    <th className="px-4 py-3 font-semibold">Destination</th>
                                    <th className="px-4 py-3 font-semibold">Valid Until</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    {isApprover && <th className="px-4 py-3 font-semibold">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {passes.map(gp => {
                                    const sc = STATUS_STYLE[gp.status] || STATUS_STYLE.PENDING;
                                    return (
                                        <tr key={gp.id} className="border-b border-app-border hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 text-app-text font-medium">{gp.asset_name || gp.asset_id?.slice(0, 8)}</td>
                                            <td className="px-4 py-3 text-app-text-muted">{gp.issued_to}</td>
                                            <td className="px-4 py-3 text-app-text-muted">{gp.issued_by}</td>
                                            <td className="px-4 py-3 text-app-text-muted">{gp.destination || '—'}</td>
                                            <td className="px-4 py-3 text-app-text-muted text-xs">
                                                {gp.valid_until ? new Date(gp.valid_until).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{sc.label}</span>
                                            </td>
                                            {isApprover && (
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        {gp.status === 'PENDING' && (
                                                            <button onClick={() => updatePass(gp.id, 'approve')} className="text-xs px-3 py-1 rounded-none bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all">Approve</button>
                                                        )}
                                                        {gp.status === 'APPROVED' && (
                                                            <button onClick={() => updatePass(gp.id, 'revoke')} className="text-xs px-3 py-1 rounded-none bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-all">Revoke</button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
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
