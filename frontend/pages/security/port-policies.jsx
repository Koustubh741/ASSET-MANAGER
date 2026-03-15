import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Shield, Plus, Filter, ArrowLeft, RefreshCcw } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function PortPoliciesPage() {
    const router = useRouter();
    const { agentId } = router.query;

    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [filters, setFilters] = useState({
        scope_type: '',
        direction: '',
        enabled: '',
    });
    const [form, setForm] = useState({
        name: '',
        description: '',
        scope_type: 'HOST',
        direction: 'INBOUND',
        protocol: 'TCP',
        port: '',
        port_range_start: '',
        port_range_end: '',
        action: 'BLOCK',
        priority: 100,
        enabled: true,
    });

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.scope_type) params.scope_type = filters.scope_type;
            if (filters.direction) params.direction = filters.direction;
            if (filters.enabled) params.enabled = filters.enabled === 'true';
            if (agentId) params.agent_id = agentId;
            const data = await apiClient.getPortPolicies(params);
            setPolicies(data || []);
        } catch (err) {
            console.error('Failed to load port policies', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, [filters.scope_type, filters.direction, filters.enabled, agentId]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const payload = {
                ...form,
                port: form.port ? Number(form.port) : null,
                port_range_start: form.port_range_start ? Number(form.port_range_start) : null,
                port_range_end: form.port_range_end ? Number(form.port_range_end) : null,
            };
            await apiClient.createPortPolicy(payload);
            setForm({
                name: '',
                description: '',
                scope_type: 'HOST',
                direction: 'INBOUND',
                protocol: 'TCP',
                port: '',
                port_range_start: '',
                port_range_end: '',
                action: 'BLOCK',
                priority: 100,
                enabled: true,
            });
            await fetchPolicies();
        } catch (err) {
            console.error('Failed to create policy', err);
            alert('Failed to create policy');
        } finally {
            setCreating(false);
        }
    };

    const scopeBadge = (scope) => {
        if (scope === 'HOST') return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
        if (scope === 'NETWORK_DEVICE') return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
        if (scope === 'CLOUD_RESOURCE') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
        return 'bg-slate-200 dark:bg-slate-700/40 text-slate-700 dark:text-slate-700 border-slate-500/40';
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-50">
            <header className="border-b border-slate-800 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-md px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/agents" className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-700 text-slate-700 dark:text-slate-700 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Shield size={18} />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight">Port Policies</h1>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Central control plane for host, network, and cloud port blocking.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {agentId && (
                        <div className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-700 text-xs text-slate-700 dark:text-slate-700">
                            Filtering for agent: <span className="font-mono text-slate-900 dark:text-slate-100">{agentId}</span>
                        </div>
                    )}
                    <button
                        onClick={fetchPolicies}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 transition-colors"
                    >
                        <RefreshCcw size={14} />
                        Refresh
                    </button>
                </div>
            </header>

            <main className="px-8 py-6 space-y-8">
                {/* Create / Filter Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Create Policy */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Plus size={16} className="text-indigo-400" />
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Create New Policy</h2>
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                BLOCK OR ALLOW BY PORT
                            </span>
                        </div>
                        <form className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" onSubmit={handleCreate}>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Block RDP on endpoints"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="e.g., Block inbound RDP (3389) for all laptops"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Scope</label>
                                <select
                                    value={form.scope_type}
                                    onChange={(e) => setForm({ ...form, scope_type: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="HOST">Host</option>
                                    <option value="NETWORK_DEVICE">Network Device</option>
                                    <option value="CLOUD_RESOURCE">Cloud Resource</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Direction</label>
                                <select
                                    value={form.direction}
                                    onChange={(e) => setForm({ ...form, direction: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="INBOUND">Inbound</option>
                                    <option value="OUTBOUND">Outbound</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Protocol</label>
                                <select
                                    value={form.protocol}
                                    onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="TCP">TCP</option>
                                    <option value="UDP">UDP</option>
                                    <option value="ANY">Any</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Port</label>
                                <input
                                    type="number"
                                    value={form.port}
                                    onChange={(e) => setForm({ ...form, port: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                    placeholder="e.g., 3389"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Range Start</label>
                                    <input
                                        type="number"
                                        value={form.port_range_start}
                                        onChange={(e) => setForm({ ...form, port_range_start: e.target.value })}
                                        className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                        placeholder="e.g., 1000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Range End</label>
                                    <input
                                        type="number"
                                        value={form.port_range_end}
                                        onChange={(e) => setForm({ ...form, port_range_end: e.target.value })}
                                        className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                        placeholder="e.g., 2000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Action</label>
                                <select
                                    value={form.action}
                                    onChange={(e) => setForm({ ...form, action: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="BLOCK">Block</option>
                                    <option value="ALLOW">Allow</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Priority</label>
                                <input
                                    type="number"
                                    value={form.priority}
                                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 100 })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    id="enabled"
                                    type="checkbox"
                                    checked={form.enabled}
                                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-600 bg-white dark:bg-slate-900 text-indigo-500"
                                />
                                <label htmlFor="enabled" className="text-xs text-slate-700 dark:text-slate-700">
                                    Enabled
                                </label>
                            </div>
                            <div className="md:col-span-3 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-slate-900 dark:text-white shadow-lg shadow-indigo-500/30"
                                >
                                    {creating ? 'Creating...' : 'Create Policy'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Filters */}
                    <div className="bg-white dark:bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Filter size={16} className="text-slate-500 dark:text-slate-400" />
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filter Policies</h2>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Scope</label>
                                <select
                                    value={filters.scope_type}
                                    onChange={(e) => setFilters({ ...filters, scope_type: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="HOST">Host</option>
                                    <option value="NETWORK_DEVICE">Network Device</option>
                                    <option value="CLOUD_RESOURCE">Cloud Resource</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Direction</label>
                                <select
                                    value={filters.direction}
                                    onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="INBOUND">Inbound</option>
                                    <option value="OUTBOUND">Outbound</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Status</label>
                                <select
                                    value={filters.enabled}
                                    onChange={(e) => setFilters({ ...filters, enabled: e.target.value })}
                                    className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="true">Enabled</option>
                                    <option value="false">Disabled</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Policies Table */}
                <section className="bg-white dark:bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Defined Policies</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {loading ? 'Loading…' : `${policies.length} policies`}
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-950/60 border-b border-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-[0.15em]">
                                <tr>
                                    <th className="px-3 py-2 text-left">Name</th>
                                    <th className="px-3 py-2 text-left">Scope</th>
                                    <th className="px-3 py-2 text-left">Direction</th>
                                    <th className="px-3 py-2 text-left">Protocol</th>
                                    <th className="px-3 py-2 text-left">Ports</th>
                                    <th className="px-3 py-2 text-left">Action</th>
                                    <th className="px-3 py-2 text-left">Enabled</th>
                                    <th className="px-3 py-2 text-right">Targets</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loading && policies.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                                            No policies defined yet. Start by creating one above.
                                        </td>
                                    </tr>
                                )}
                                {policies.map((p) => {
                                    const ports =
                                        p.port ??
                                        (p.port_range_start && p.port_range_end
                                            ? `${p.port_range_start}-${p.port_range_end}`
                                            : 'Any');
                                    const targets = p.targets || [];
                                    return (
                                        <tr
                                            key={p.id}
                                            className="border-b border-slate-800/60 hover:bg-white dark:bg-slate-900/80 cursor-pointer"
                                            onClick={() => router.push(`/security/port-policies/${p.id}`)}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 dark:text-slate-100 font-medium">{p.name}</span>
                                                    {p.description && (
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                                            {p.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${scopeBadge(
                                                        p.scope_type
                                                    )}`}
                                                >
                                                    {p.scope_type || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-900 dark:text-slate-200">{p.direction}</td>
                                            <td className="px-3 py-2 text-slate-900 dark:text-slate-200">{p.protocol}</td>
                                            <td className="px-3 py-2 text-slate-900 dark:text-slate-200">{ports}</td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        p.action === 'BLOCK'
                                                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                                                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                                                    }`}
                                                >
                                                    {p.action}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        p.enabled
                                                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                                                            : 'bg-slate-200 dark:bg-slate-700/40 text-slate-700 dark:text-slate-700 border border-slate-500/40'
                                                    }`}
                                                >
                                                    {p.enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-200">
                                                {targets.length}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

