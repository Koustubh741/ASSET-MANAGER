import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import {
    Shield, ShieldAlert, ShieldCheck, AlertCircle, RefreshCcw, Search,
    Monitor, Calendar, ChevronRight, ArrowUpCircle, X, CheckCircle2,
    XCircle, AlertTriangle, Loader2, Zap, Download, Clock, RotateCcw,
    RefreshCw, ExternalLink, Info,
} from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
    INSTALLED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    MISSING: 'text-rose-400   bg-rose-500/10   border-rose-500/20',
    FAILED: 'text-amber-400  bg-amber-500/10  border-amber-500/20',
    PENDING: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
    ROLLING_BACK: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    NOT_APPLICABLE: 'text-slate-500 dark:text-slate-400  bg-slate-500/10  border-slate-500/20',
};
const STATUS_ICON = {
    INSTALLED: <CheckCircle2 size={14} className="text-emerald-400" />,
    MISSING: <XCircle size={14} className="text-rose-400" />,
    FAILED: <AlertTriangle size={14} className="text-amber-400" />,
    PENDING: <Loader2 size={14} className="text-blue-400 animate-spin" />,
    NOT_APPLICABLE: <Shield size={14} className="text-slate-500 dark:text-slate-400" />,
};

function getSeverityColor(s = '') {
    switch (s.toLowerCase()) {
        case 'critical': return 'text-rose-400  bg-rose-500/10  border-rose-500/20';
        case 'important': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        case 'moderate': return 'text-blue-400  bg-blue-500/10  border-blue-500/20';
        default: return 'text-slate-500 dark:text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
}
function getCvssBadge(score) {
    if (score == null) return null;
    const color = score >= 9.0
        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        : score >= 7.0
            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            : 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    return (
        <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${color}`}>
            CVSS {score.toFixed(1)}
        </span>
    );
}
function getScoreColor(s) { return s >= 90 ? 'text-emerald-400' : s >= 70 ? 'text-amber-400' : 'text-rose-400'; }
function getScoreBg(s) { return s >= 90 ? 'bg-emerald-400' : s >= 70 ? 'bg-amber-400' : 'bg-rose-400'; }

// ─── Schedule Modal ───────────────────────────────────────────────────────────
function ScheduleModal({ patch, onClose, onScheduled }) {
    const [scheduledAt, setScheduledAt] = useState('');
    const [targetGroup, setTargetGroup] = useState('ALL');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!scheduledAt) { setError('Please select a date and time'); return; }
        setLoading(true);
        try {
            await apiClient.schedulePatch(patch.id, new Date(scheduledAt).toISOString(), targetGroup);
            onScheduled();
            onClose();
        } catch (err) {
            setError('Failed to schedule: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Patch</h3>
                    <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"><X size={18} /></button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 truncate">{patch.title}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-1">Deploy At</label>
                        <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-1">Target Group</label>
                        <select
                            value={targetGroup}
                            onChange={(e) => setTargetGroup(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        >
                            <option value="ALL">All Endpoints</option>
                            <option value="PILOT">Pilot Assets Only</option>
                            <option value="SERVERS">Servers Only</option>
                            <option value="WORKSTATIONS">Workstations Only</option>
                        </select>
                    </div>
                    {error && <p className="text-xs text-rose-400">{error}</p>}
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-100 dark:bg-white/5">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-xl text-sm font-bold bg-violet-500 hover:bg-violet-600 text-slate-900 dark:text-white flex items-center gap-2"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                            Schedule
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PatchManagement() {
    const { currentRole } = useRole();
    const isAdminOrIT = currentRole?.slug === 'ADMIN' || currentRole?.slug === 'IT';

    // Core data
    const [patches, setPatches] = useState([]);
    const [compliance, setCompliance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('compliance');

    // Deploy
    const [deployingPatch, setDeployingPatch] = useState(null);
    const [deployResult, setDeployResult] = useState(null);

    // Drill-down
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [assetDeployments, setAssetDeployments] = useState([]);
    const [drillLoading, setDrillLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // deployment id

    // Schedule modal
    const [schedulingPatch, setSchedulingPatch] = useState(null);

    // Export
    const [exporting, setExporting] = useState(false);

    // Fetch
    const fetchData = useCallback(async () => {
        if (!isAdminOrIT) return;
        setIsLoading(true);
        setDeployResult(null);
        try {
            if (activeTab === 'compliance') {
                const data = await apiClient.getPatchCompliance();
                setCompliance(data);
            } else {
                const data = await apiClient.getPatches();
                setPatches(data);
            }
        } catch (err) {
            console.error('Failed to fetch patch data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, isAdminOrIT]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Drill-down
    const openDrillDown = async (row) => {
        setSelectedAsset(row);
        setAssetDeployments([]);
        setDrillLoading(true);
        try {
            const data = await apiClient.getPatchDeployments({ asset_id: row.asset_id });
            setAssetDeployments(data);
        } catch (err) {
            console.error('Failed:', err);
        } finally {
            setDrillLoading(false);
        }
    };

    // Retry / Rollback
    const handleDeployAction = async (depId, action) => {
        setActionLoading(depId);
        try {
            const updated = action === 'retry'
                ? await apiClient.retryPatch(depId)
                : await apiClient.rollbackPatch(depId);
            setAssetDeployments(prev => prev.map(d => d.id === depId ? { ...d, status: updated.status } : d));
        } catch (err) {
            console.error(action + ' failed:', err);
        } finally {
            setActionLoading(null);
        }
    };

    // Deploy All
    const handleDeployToAll = async (patch) => {
        setDeployingPatch(patch.id);
        setDeployResult(null);
        try {
            const result = await apiClient.deployPatchBulk(patch.id, "ALL");
            setDeployResult({
                ok: true,
                msg: result.message
            });
            // Refresh compliance data to reflect PENDING statuses
            const updated = await apiClient.getPatchCompliance();
            setCompliance(updated);
        } catch (err) {
            console.error('Bulk deploy failed:', err);
            setDeployResult({
                ok: false,
                msg: 'Failed to queue bulk deployment: ' + (err.message || 'Unknown error')
            });
        } finally {
            setDeployingPatch(null);
        }
    };

    // Export CSV
    const handleExport = async () => {
        setExporting(true);
        try {
            const blobUrl = await apiClient.exportCompliance();
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `patch_compliance_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    // Filtered
    const term = searchTerm.toLowerCase();
    const filteredCompliance = compliance.filter(c => c.asset_name.toLowerCase().includes(term));
    const filteredPatches = patches.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.patch_id.toLowerCase().includes(term) ||
        p.platform.toLowerCase().includes(term)
    );

    // Stats
    const avgScore = compliance.length ? Math.round(compliance.reduce((a, b) => a + b.compliance_score, 0) / compliance.length) : 0;
    const highRiskCount = compliance.filter(c => c.critical_missing > 0).length;
    const totalMissing = compliance.reduce((a, b) => a + b.missing_patches, 0);

    // Access guard
    if (!isAdminOrIT) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <ShieldAlert size={48} className="text-rose-500 mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Restricted</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Only Administrators and IT staff can access Patch Management.</p>
        </div>
    );

    return (
        <>
            <div className="space-y-8 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Patch Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor vulnerabilities and manage security updates across the fleet.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex bg-white dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                            {[['compliance', 'Asset Compliance', 'emerald'], ['available', 'Available Patches', 'violet']].map(([tab, label, color]) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? `bg-${color}-500 text-slate-900 dark:text-white shadow-lg` : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
                                >{label}</button>
                            ))}
                        </div>
                        {/* Export CSV button */}
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-white/5 flex items-center gap-1.5 px-3 text-xs font-semibold"
                            title="Export Compliance CSV"
                        >
                            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Export
                        </button>
                        <button onClick={fetchData} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-white/5" title="Refresh">
                            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Deploy result banner */}
                {deployResult && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${deployResult.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                        {deployResult.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        {deployResult.msg}
                        <button onClick={() => setDeployResult(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={16} /></button>
                    </div>
                )}

                {/* Stat cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'FLEET COMPLIANCE', value: `${avgScore}%`, icon: <ShieldCheck size={20} />, color: 'emerald', sub: 'Avg compliance score' },
                        { label: 'HIGH-RISK ASSETS', value: highRiskCount, icon: <ShieldAlert size={20} />, color: 'rose', sub: 'With critical gaps' },
                        { label: 'MISSING PATCHES', value: totalMissing, icon: <ArrowUpCircle size={20} />, color: 'violet', sub: 'Across all endpoints' },
                        { label: 'MANAGED ENDPOINTS', value: compliance.length, icon: <Monitor size={20} />, color: 'blue', sub: 'IN_USE assets tracked' },
                    ].map(({ label, value, icon, color, sub }) => (
                        <div key={label} className="backdrop-blur-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 bg-${color}-500/10 text-${color}-400 rounded-lg`}>{icon}</div>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{label}</span>
                            </div>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>
                        </div>
                    ))}
                </div>

                {/* Main table */}
                <div className="backdrop-blur-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Search */}
                    <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-4">
                        <div className="relative flex-grow max-w-md">
                            <Search size={18} className="absolute left-3 top-2.5 text-slate-500 dark:text-slate-400" />
                            <input
                                type="text"
                                placeholder={activeTab === 'compliance' ? 'Search assets…' : 'Search patches, CVE, platform…'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"><X size={16} /></button>}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="bg-slate-50 dark:bg-white/[0.02] text-left">
                                {activeTab === 'compliance' ? (
                                    <tr>
                                        {['Asset Name', 'Platform', 'Installed / Total', 'Score', 'Critical Missing', 'Details'].map((h, i) => (
                                            <th key={h} className={`px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                                        ))}
                                    </tr>
                                ) : (
                                    <tr>
                                        {['Patch ID', 'Title / CVE', 'Severity', 'Platform', 'Release Date', 'Actions'].map((h, i) => (
                                            <th key={h} className={`px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                                        ))}
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center justify-center gap-2"><RefreshCcw size={18} className="animate-spin" /> Scanning system state…</div>
                                    </td></tr>
                                ) : activeTab === 'compliance' ? (
                                    filteredCompliance.length === 0
                                        ? <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No matching assets found.</td></tr>
                                        : filteredCompliance.map((c) => (
                                            <tr key={c.asset_id} className="hover:bg-white dark:bg-white/[0.01] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><Monitor size={16} /></div>
                                                        <span className="text-sm font-medium text-slate-900 dark:text-white">{c.asset_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {c.platform
                                                        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">{c.platform}</span>
                                                        : <span className="text-xs text-slate-500 dark:text-slate-400 italic">Unknown</span>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                    {c.installed_patches} / {c.total_patches}
                                                    <div className="w-24 h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${getScoreBg(c.compliance_score)}`} style={{ width: `${c.compliance_score}%` }} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-sm">
                                                    <span className={getScoreColor(c.compliance_score)}>{Math.round(c.compliance_score)}%</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${c.critical_missing > 0 ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5'}`}>
                                                        {c.critical_missing} Critical
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => openDrillDown(c)} className="text-emerald-400 hover:text-emerald-300 transition-colors" title="View patch details">
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    filteredPatches.length === 0
                                        ? <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No available patches found.</td></tr>
                                        : filteredPatches.map((p) => (
                                            <tr key={p.id} className="hover:bg-white dark:bg-white/[0.01] transition-colors group">
                                                <td className="px-6 py-4 text-xs font-mono text-emerald-400">{p.patch_id}</td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.title}</span>
                                                            {getCvssBadge(p.cvss_score)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{p.patch_type}</span>
                                                            {(p.cve_ids || []).slice(0, 2).map(cve => (
                                                                <span key={cve} className="text-[9px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1 py-px">{cve}</span>
                                                            ))}
                                                            {p.kb_article_url && (
                                                                <a href={p.kb_article_url} target="_blank" rel="noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 transition-colors" title="KB Article">
                                                                    <ExternalLink size={10} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getSeverityColor(p.severity)}`}>{p.severity}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 uppercase">{p.platform}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={13} className="text-slate-500 dark:text-slate-400" />
                                                        {p.release_date ? new Date(p.release_date).toLocaleDateString() : '—'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Schedule button */}
                                                        <button
                                                            onClick={() => setSchedulingPatch(p)}
                                                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold border bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border-violet-500/20 flex items-center gap-1"
                                                            title="Schedule deployment"
                                                        >
                                                            <Clock size={11} /> Schedule
                                                        </button>
                                                        {/* Deploy All button */}
                                                        <button
                                                            onClick={() => handleDeployToAll(p)}
                                                            disabled={!!deployingPatch}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${deployingPatch === p.id ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 cursor-not-allowed' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'}`}
                                                        >
                                                            {deployingPatch === p.id ? <><Loader2 size={12} className="animate-spin" /> Deploying…</> : <><Zap size={12} /> Deploy All</>}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info banner */}
                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
                    <Info className="text-blue-400 mt-0.5 shrink-0" size={20} />
                    <div>
                        <p className="text-sm font-bold text-blue-400">Scheduled Automation Active</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                            Vendor patch feeds sync daily at 2:00 AM. Critical patches are queued to agent endpoints via the AgentCommand system.
                            Compliance snapshots are captured nightly at 23:59 for trend reporting.
                        </p>
                    </div>
                </div>
            </div>

            {/* Schedule Modal */}
            {schedulingPatch && (
                <ScheduleModal
                    patch={schedulingPatch}
                    onClose={() => setSchedulingPatch(null)}
                    onScheduled={() => { setSchedulingPatch(null); }}
                />
            )}

            {/* Asset Drill-Down Panel */}
            {selectedAsset && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedAsset(null)} />
                    <div className="relative w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                        {/* Panel header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Asset Patch Detail</p>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedAsset.asset_name}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    {selectedAsset.platform && <span className="text-xs text-slate-500 dark:text-slate-400">{selectedAsset.platform}</span>}
                                    <span className={`text-sm font-bold ${getScoreColor(selectedAsset.compliance_score)}`}>{Math.round(selectedAsset.compliance_score)}% Compliant</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-all"><X size={20} /></button>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-slate-200 dark:border-white/10">
                            {[
                                { label: 'Installed', value: selectedAsset.installed_patches, color: 'text-emerald-400' },
                                { label: 'Missing', value: selectedAsset.missing_patches, color: 'text-rose-400' },
                                { label: 'Critical ↑', value: selectedAsset.critical_missing, color: 'text-amber-400' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="px-4 py-3 text-center">
                                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase mt-0.5">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Deployment list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {drillLoading ? (
                                <div className="flex items-center justify-center py-12 gap-2 text-slate-500 dark:text-slate-400">
                                    <Loader2 size={18} className="animate-spin" /> Loading patch records…
                                </div>
                            ) : assetDeployments.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                                    No patch deployment records found for this asset.<br />
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Records appear after agent scan or manual deploy.</span>
                                </div>
                            ) : assetDeployments.map((dep) => (
                                <div key={dep.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:bg-white/[0.05] transition-colors gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {STATUS_ICON[dep.status] ?? STATUS_ICON.MISSING}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{dep.patch_title || dep.patch_id}</p>
                                            {dep.installed_at && <p className="text-[10px] text-slate-500 dark:text-slate-400">Installed {new Date(dep.installed_at).toLocaleDateString()}</p>}
                                            {dep.error_message && <p className="text-[10px] text-amber-400 truncate">{dep.error_message}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[dep.status] ?? STATUS_STYLES.MISSING}`}>{dep.status}</span>
                                        {/* Retry button for FAILED/MISSING */}
                                        {(dep.status === 'FAILED' || dep.status === 'MISSING') && (
                                            <button
                                                onClick={() => handleDeployAction(dep.id, 'retry')}
                                                disabled={actionLoading === dep.id}
                                                className="p-1 rounded-lg text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                                                title="Retry install"
                                            >
                                                {actionLoading === dep.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                            </button>
                                        )}
                                        {/* Rollback button for INSTALLED */}
                                        {dep.status === 'INSTALLED' && (
                                            <button
                                                onClick={() => handleDeployAction(dep.id, 'rollback')}
                                                disabled={actionLoading === dep.id}
                                                className="p-1 rounded-lg text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                                                title="Rollback patch"
                                            >
                                                {actionLoading === dep.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
