import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Trash2, Save, AlertTriangle } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function PortPolicyDetailPage() {
    const router = useRouter();
    const { id } = router.query;

    const [policy, setPolicy] = useState(null);
    const [enforcement, setEnforcement] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        scope_type: '',
        direction: '',
        protocol: '',
        port: '',
        port_range_start: '',
        port_range_end: '',
        action: '',
        priority: 100,
        enabled: true,
    });

    const [newTarget, setNewTarget] = useState({
        target_type: 'AGENT',
        target_ref_id: '',
        display_name: '',
        scope: 'INDIVIDUAL',
    });
    const [assigning, setAssigning] = useState(false);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [p, e] = await Promise.all([
                apiClient.getPortPolicy(id),
                apiClient.getPortPolicyEnforcement(id),
            ]);
            setPolicy(p);
            setEnforcement(e || []);
            if (p) {
                setEditForm({
                    name: p.name,
                    description: p.description || '',
                    scope_type: p.scope_type,
                    direction: p.direction,
                    protocol: p.protocol,
                    port: p.port ?? '',
                    port_range_start: p.port_range_start ?? '',
                    port_range_end: p.port_range_end ?? '',
                    action: p.action,
                    priority: p.priority,
                    enabled: p.enabled,
                });
            }
        } catch (err) {
            console.error('Failed to load policy detail', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!policy) return;
        setSaving(true);
        try {
            const payload = {
                ...editForm,
                port: editForm.port ? Number(editForm.port) : null,
                port_range_start: editForm.port_range_start ? Number(editForm.port_range_start) : null,
                port_range_end: editForm.port_range_end ? Number(editForm.port_range_end) : null,
            };
            await apiClient.updatePortPolicy(policy.id, payload);
            await loadData();
        } catch (err) {
            console.error('Failed to save policy', err);
            alert('Failed to save policy');
        } finally {
            setSaving(false);
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        if (!policy || !newTarget.target_ref_id) return;
        setAssigning(true);
        try {
            await apiClient.assignPortPolicyTargets(policy.id, [newTarget]);
            setNewTarget({
                target_type: 'AGENT',
                target_ref_id: '',
                display_name: '',
                scope: 'INDIVIDUAL',
            });
            await loadData();
        } catch (err) {
            console.error('Failed to assign target', err);
            alert('Failed to assign target');
        } finally {
            setAssigning(false);
        }
    };

    const handleDelete = async () => {
        if (!policy) return;
        if (!confirm('Are you sure you want to delete this policy? This cannot be undone.')) return;
        setDeleting(true);
        try {
            await apiClient.deletePortPolicy(policy.id);
            router.push('/security/port-policies');
        } catch (err) {
            console.error('Failed to delete policy', err);
            alert('Failed to delete policy');
        } finally {
            setDeleting(false);
        }
    };

    const summarizeEnforcement = () => {
        const summary = { APPLIED: 0, PENDING: 0, FAILED: 0, ROLLED_BACK: 0 };
        enforcement.forEach((e) => {
            const key = e.status || 'PENDING';
            if (summary[key] === undefined) summary[key] = 0;
            summary[key] += 1;
        });
        return summary;
    };

    const portsDisplay =
        editForm.port ||
        (editForm.port_range_start && editForm.port_range_end
            ? `${editForm.port_range_start}-${editForm.port_range_end}`
            : 'Any');

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-50 flex items-center justify-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Loading policy…</p>
            </div>
        );
    }

    if (!policy) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-50 flex items-center justify-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Policy not found</p>
            </div>
        );
    }

    const enforcementSummary = summarizeEnforcement();

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-50">
            <header className="border-b border-slate-800 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-md px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/security/port-policies" className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white transition-colors">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Shield size={18} />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight">{policy.name}</h1>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {policy.description || 'Managed port policy'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600/10 border border-rose-600/40 text-[11px] font-semibold text-rose-300 hover:bg-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-slate-900 dark:text-white shadow-lg shadow-indigo-500/30"
                    >
                        <Save size={14} />
                        Save Changes
                    </button>
                </div>
            </header>

            <main className="px-8 py-6 space-y-6">
                {/* Summary Row */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900/70 border border-slate-800 rounded-xl p-5 lg:col-span-2">
                        <form className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" onSubmit={handleSave}>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Scope</label>
                                <select
                                    value={editForm.scope_type}
                                    onChange={(e) => setEditForm({ ...editForm, scope_type: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="HOST">Host</option>
                                    <option value="NETWORK_DEVICE">Network Device</option>
                                    <option value="CLOUD_RESOURCE">Cloud Resource</option>
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Direction</label>
                                <select
                                    value={editForm.direction}
                                    onChange={(e) => setEditForm({ ...editForm, direction: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="INBOUND">Inbound</option>
                                    <option value="OUTBOUND">Outbound</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Protocol</label>
                                <select
                                    value={editForm.protocol}
                                    onChange={(e) => setEditForm({ ...editForm, protocol: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="TCP">TCP</option>
                                    <option value="UDP">UDP</option>
                                    <option value="ANY">Any</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Action</label>
                                <select
                                    value={editForm.action}
                                    onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="BLOCK">Block</option>
                                    <option value="ALLOW">Allow</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Port</label>
                                <input
                                    type="number"
                                    value={editForm.port}
                                    onChange={(e) => setEditForm({ ...editForm, port: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Range Start</label>
                                    <input
                                        type="number"
                                        value={editForm.port_range_start}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, port_range_start: e.target.value })
                                        }
                                        className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Range End</label>
                                    <input
                                        type="number"
                                        value={editForm.port_range_end}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, port_range_end: e.target.value })
                                        }
                                        className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Priority</label>
                                <input
                                    type="number"
                                    value={editForm.priority}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, priority: Number(e.target.value) || 100 })
                                    }
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    id="enabled"
                                    type="checkbox"
                                    checked={editForm.enabled}
                                    onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-600 bg-white dark:bg-slate-900 text-indigo-500"
                                />
                                <label htmlFor="enabled" className="text-xs text-slate-700 dark:text-slate-300">
                                    Enabled
                                </label>
                            </div>
                        </form>
                    </div>

                    {/* Enforcement Summary */}
                    <div className="bg-white dark:bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enforcement Summary</h2>
                            <AlertTriangle size={16} className="text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 dark:text-slate-400">Applied</span>
                                <span className="font-mono text-emerald-300">{enforcementSummary.APPLIED}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 dark:text-slate-400">Pending</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{enforcementSummary.PENDING}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 dark:text-slate-400">Failed</span>
                                <span className="font-mono text-rose-300">{enforcementSummary.FAILED}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 dark:text-slate-400">Rolled Back</span>
                                <span className="font-mono text-amber-300">{enforcementSummary.ROLLED_BACK}</span>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-800">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Ports: <span className="text-slate-900 dark:text-slate-100 font-mono">{portsDisplay}</span>
                            </p>
                        </div>
                    </div>
                </section>

                {/* Targets & Enforcement Detail */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Targets */}
                    <div className="bg-white dark:bg-slate-900/70 border border-slate-800 rounded-xl p-5 lg:col-span-1">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Assigned Targets</h2>
                        <ul className="space-y-2 text-xs">
                            {(policy.targets || []).map((t) => (
                                <li
                                    key={t.id}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950/60 border border-slate-800"
                                >
                                    <div>
                                        <p className="text-slate-900 dark:text-slate-100 font-mono text-[11px] truncate max-w-[200px]">
                                            {t.target_ref_id}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                            {t.target_type}
                                            {t.display_name ? ` • ${t.display_name}` : ''}
                                        </p>
                                    </div>
                                </li>
                            ))}
                            {(!policy.targets || policy.targets.length === 0) && (
                                <li className="text-slate-500 dark:text-slate-400 text-xs py-2">
                                    No targets assigned. Assign an agent, host, or resource below.
                                </li>
                            )}
                        </ul>
                        <form className="mt-4 space-y-2 text-xs" onSubmit={handleAssign}>
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Assign New Target
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Type</label>
                                    <select
                                        value={newTarget.target_type}
                                        onChange={(e) =>
                                            setNewTarget({ ...newTarget, target_type: e.target.value })
                                        }
                                        className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-2 py-1.5 text-slate-900 dark:text-slate-100 text-[11px]"
                                    >
                                        <option value="AGENT">Agent</option>
                                        <option value="HOST_ASSET">Host Asset</option>
                                        <option value="NETWORK_DEVICE">Network Device</option>
                                        <option value="CLOUD_RESOURCE_GROUP">Cloud Group</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Scope</label>
                                    <select
                                        value={newTarget.scope}
                                        onChange={(e) =>
                                            setNewTarget({ ...newTarget, scope: e.target.value })
                                        }
                                        className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-2 py-1.5 text-slate-900 dark:text-slate-100 text-[11px]"
                                    >
                                        <option value="INDIVIDUAL">Individual</option>
                                        <option value="GROUP">Group</option>
                                        <option value="GLOBAL">Global</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Identifier</label>
                                <input
                                    type="text"
                                    required
                                    value={newTarget.target_ref_id}
                                    onChange={(e) =>
                                        setNewTarget({ ...newTarget, target_ref_id: e.target.value })
                                    }
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-2 py-1.5 text-slate-900 dark:text-slate-100 text-[11px]"
                                    placeholder="e.g., agent-local, asset UUID, SG-1234"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Display Name (optional)</label>
                                <input
                                    type="text"
                                    value={newTarget.display_name}
                                    onChange={(e) =>
                                        setNewTarget({ ...newTarget, display_name: e.target.value })
                                    }
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-2 py-1.5 text-slate-900 dark:text-slate-100 text-[11px]"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={assigning}
                                className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-[11px] font-semibold text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {assigning ? 'Assigning…' : 'Assign Target'}
                            </button>
                        </form>
                    </div>

                    {/* Enforcement detail */}
                    <div className="bg-white dark:bg-slate-900/70 border border-slate-800 rounded-xl p-5 lg:col-span-2">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Per-Agent Enforcement</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-950/60 border-b border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Agent</th>
                                        <th className="px-3 py-2 text-left">Target ID</th>
                                        <th className="px-3 py-2 text-left">Status</th>
                                        <th className="px-3 py-2 text-left">Last Reported</th>
                                        <th className="px-3 py-2 text-left">Error</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enforcement.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                                                No enforcement reports yet. Agents will populate this after they start enforcing this policy.
                                            </td>
                                        </tr>
                                    )}
                                    {enforcement.map((e) => (
                                        <tr key={e.id} className="border-b border-slate-800/60">
                                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-[11px]">
                                                {e.agent_id}
                                            </td>
                                            <td className="px-3 py-2 text-slate-900 dark:text-slate-200 font-mono text-[11px]">
                                                {e.target_id}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        e.status === 'APPLIED'
                                                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                                                            : e.status === 'FAILED'
                                                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                                                            : e.status === 'ROLLED_BACK'
                                                            ? 'bg-amber-500/15 text-amber-200 border border-amber-500/40'
                                                            : 'bg-slate-200 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300 border border-slate-500/40'
                                                    }`}
                                                >
                                                    {e.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                                {e.last_reported_at
                                                    ? new Date(e.last_reported_at).toLocaleString()
                                                    : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                                                {e.last_error || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

