import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import {
    Shield, ShieldAlert, ShieldCheck, AlertCircle, RefreshCcw, Search,
    Monitor, Calendar, ChevronRight, ArrowUpCircle, X, CheckCircle2,
    XCircle, AlertTriangle, Loader2, Zap, Download, Clock, RotateCcw,
    RefreshCw, ExternalLink, Info, Upload, File
} from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
    INSTALLED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    MISSING: 'text-rose-400   bg-rose-500/10   border-rose-500/20',
    FAILED: 'text-rose-400  bg-rose-500/10  border-rose-500/20',
    PENDING: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
    QUEUED: 'text-slate-400 bg-white/5 border-white/10',
    PROCESSING: 'text-blue-400 bg-blue-500/10 border-blue-500/20 animate-pulse',
    AWAITING_APPROVAL: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    COMPLETED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    PENDING_APPROVAL: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    ROLLING_BACK: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    NOT_APPLICABLE: 'text-app-text-muted  bg-slate-500/10  border-slate-500/20',
};
const STATUS_ICON = {
    INSTALLED: <CheckCircle2 size={14} className="text-emerald-400" />,
    MISSING: <XCircle size={14} className="text-rose-400" />,
    FAILED: <AlertTriangle size={14} className="text-rose-400" />,
    PENDING: <Loader2 size={14} className="text-blue-400 animate-spin" />,
    QUEUED: <Clock size={14} className="text-slate-400" />,
    PROCESSING: <RefreshCcw size={14} className="text-blue-400 animate-spin" />,
    AWAITING_APPROVAL: <ShieldAlert size={14} className="text-violet-400 animate-pulse" />,
    COMPLETED: <CheckCircle2 size={14} className="text-emerald-400" />,
    PENDING_APPROVAL: <ShieldAlert size={14} className="text-violet-400 animate-pulse" />,
    NOT_APPLICABLE: <Shield size={14} className="text-app-text-muted" />,
};

function getSeverityColor(s = '') {
    switch (s.toLowerCase()) {
        case 'critical': return 'text-rose-400  bg-rose-500/10  border-rose-500/20';
        case 'important': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        case 'moderate': return 'text-blue-400  bg-blue-500/10  border-blue-500/20';
        default: return 'text-app-text-muted bg-slate-500/10 border-slate-500/20';
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
            <div className="relative bg-white dark:bg-slate-900 border border-app-border rounded-none p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-app-text">Schedule Patch</h3>
                    <button onClick={onClose} className="text-app-text-muted hover:text-app-text"><X size={18} /></button>
                </div>
                <p className="text-sm text-app-text-muted mb-4 truncate">{patch.title}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-app-text-muted uppercase block mb-1">Deploy At</label>
                        <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-app-border rounded-none px-3 py-2 text-sm text-app-text focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-app-text-muted uppercase block mb-1">Target Group</label>
                        <select
                            value={targetGroup}
                            onChange={(e) => setTargetGroup(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-app-border rounded-none px-3 py-2 text-sm text-app-text focus:outline-none focus:border-emerald-500"
                        >
                            <option value="ALL">All Endpoints</option>
                            <option value="PILOT">Pilot Assets Only</option>
                            <option value="SERVERS">Servers Only</option>
                            <option value="WORKSTATIONS">Workstations Only</option>
                        </select>
                    </div>
                    {error && <p className="text-xs text-rose-400">{error}</p>}
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-none text-sm text-app-text-muted border border-app-border hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-app-surface-soft">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-none text-sm font-bold bg-violet-500 hover:bg-violet-600 text-app-text flex items-center gap-2"
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

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function PatchUploadModal({ patch, onClose, onUploaded }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) { setError('Please select a file'); return; }
        setLoading(true);
        setError('');
        try {
            await apiClient.uploadPatchBinary(patch.id, file);
            onUploaded();
            onClose();
        } catch (err) {
            setError('Upload failed: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 border border-app-border rounded-none p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-app-text flex items-center gap-2">
                        <Upload size={20} className="text-emerald-400" />
                        Upload Patch Binary
                    </h3>
                    <button onClick={onClose} className="text-app-text-muted hover:text-app-text"><X size={18} /></button>
                </div>
                <p className="text-sm text-app-text-muted mb-6 truncate">{patch.title}</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="border-2 border-dashed border-app-border rounded-none p-8 text-center hover:border-emerald-500/50 transition-colors">
                        <input
                            type="file"
                            id="patchFile"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files[0])}
                        />
                        <label htmlFor="patchFile" className="cursor-pointer">
                            <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                            <p className="text-sm font-semibold text-app-text">
                                {file ? file.name : 'Click to browse binary file'}
                            </p>
                            <p className="text-xs text-app-text-muted mt-1">
                                .msu, .exe, .deb, .rpm support
                            </p>
                        </label>
                    </div>
                    {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-none border border-rose-500/20">{error}</p>}
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-none text-sm text-app-text-muted border border-app-border hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading || !file}
                            className={`px-4 py-2 rounded-none text-sm font-bold flex items-center gap-2 transition-all ${loading || !file ? 'bg-app-surface-soft text-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-app-text shadow-lg shadow-emerald-500/20'}`}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            {loading ? 'Uploading…' : 'Finalize Upload'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PatchManagement() {
    const { isITStaff: isAdminOrIT } = useRole();

    // Core data
    const [patches, setPatches] = useState([]);
    const [compliance, setCompliance] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [syncStatus, setSyncStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // UI
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('compliance'); // 'compliance', 'available', 'jobs'

    // Deploy
    const [deployingPatch, setDeployingPatch] = useState(null);
    const [deployResult, setDeployResult] = useState(null);

    // Jobs Detail
    const [selectedJob, setSelectedJob] = useState(null);
    const [jobLogs, setJobLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // Asset Drill-Down & Actions
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [assetDeployments, setAssetDeployments] = useState([]);
    const [drillLoading, setDrillLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    // Modal Visibility
    const [schedulingPatch, setSchedulingPatch] = useState(null);
    const [uploadingPatch, setUploadingPatch] = useState(null);

    // Fetch
    const fetchData = useCallback(async () => {
        if (!isAdminOrIT) return;
        setIsLoading(true);
        setDeployResult(null);
        try {
            if (activeTab === 'compliance') {
                const data = await apiClient.getPatchCompliance();
                setCompliance(data);
            } else if (activeTab === 'jobs') {
                const data = await apiClient.getPatchJobs();
                setJobs(data);
            } else {
                const data = await apiClient.getPatches();
                setPatches(data);
            }
            
            // Background sync check
            const status = await apiClient.getPatchSyncStatus();
            setSyncStatus(status);
        } catch (err) {
            console.error('Failed to fetch patch data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, isAdminOrIT]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Polling for jobs
    useEffect(() => {
        if (activeTab !== 'jobs' || !isAdminOrIT) return;
        
        const poll = async () => {
            try {
                const data = await apiClient.getPatchJobs();
                setJobs(data);
            } catch (err) {
                console.error('Job polling failed:', err);
            }
        };

        const interval = setInterval(poll, 10000);
        return () => clearInterval(interval);
    }, [activeTab, isAdminOrIT]); // Removed 'jobs' from dependencies to prevent infinite loop

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

    // Polling for drill-down statuses
    useEffect(() => {
        if (!selectedAsset) return;
        
        const poll = async () => {
            try {
                const data = await apiClient.getPatchDeployments({ asset_id: selectedAsset.asset_id });
                setAssetDeployments(data);
                
                const stillPending = data.some(d => d.status === 'PENDING' || d.status === 'ROLLING_BACK' || d.status === 'PENDING_APPROVAL');
                if (!stillPending) {
                    const updated = await apiClient.getPatchCompliance();
                    setCompliance(updated);
                }
            } catch (err) {
                console.error('Polling failed:', err);
            }
        };

        const interval = setInterval(poll, 15000);
        return () => clearInterval(interval);
    }, [selectedAsset, isAdminOrIT]); // Removed 'assetDeployments' from dependencies

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
                msg: result.message || "Bulk deployment queued."
            });
            // Refresh compliance data to reflect PENDING statuses
            const updated = await apiClient.getPatchCompliance();
            setCompliance(updated);
        } catch (err) {
            console.error('Bulk deploy failed:', err);
            const isCircuitBreaker = err.message?.includes('Circuit Breaker');
            setDeployResult({
                ok: false,
                msg: isCircuitBreaker ? err.message : 'Failed to queue bulk deployment: ' + (err.message || 'Unknown error')
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

    // Trigger Snapshot
    const handleSnapshot = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.request('/patch-management/snapshot', { method: 'POST' });
            setDeployResult({
                ok: true,
                msg: `Snapshot complete: ${res.data.snapshots_saved} records saved.`
            });
            // Refresh history if we had a chart (not yet implemented in this view, but good practice)
        } catch (err) {
            console.error('Snapshot failed:', err);
            setDeployResult({ ok: false, msg: 'Failed to trigger snapshot: ' + err.message });
        } finally {
            setIsLoading(false);
        }
    };

    // Filtered
    const term = searchTerm.toLowerCase();
    const filteredCompliance = compliance.filter(c => (c.asset_name || '').toLowerCase().includes(term));
    const filteredPatches = patches.filter(p =>
        (p.title || '').toLowerCase().includes(term) ||
        (p.patch_id || '').toLowerCase().includes(term) ||
        (p.platform || '').toLowerCase().includes(term)
    );

    // Stats
    const avgScore = compliance.length ? Math.round(compliance.reduce((a, b) => a + b.compliance_score, 0) / compliance.length) : 0;
    const highRiskCount = compliance.filter(c => c.critical_missing > 0).length;
    const totalMissing = compliance.reduce((a, b) => a + b.missing_patches, 0);

    // Access guard
    if (!isAdminOrIT) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <ShieldAlert size={48} className="text-rose-500 mb-4" />
            <h1 className="text-2xl font-bold text-app-text">Access Restricted</h1>
            <p className="text-app-text-muted mt-2">Only Administrators and IT staff can access Patch Management.</p>
        </div>
    );

    return (
        <>
            <div className="space-y-8 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-app-text mb-1">Patch Management</h1>
                        <p className="text-app-text-muted text-sm">Monitor vulnerabilities and manage security updates across the fleet.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex bg-white dark:bg-slate-900/50 p-1 rounded-none border border-app-border">
                            {[
                                ['compliance', 'Compliance', 'emerald'], 
                                ['available', 'Patches', 'violet'],
                                ['jobs', 'Deployment Jobs', 'blue']
                            ].map(([tab, label, color]) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1.5 rounded-none text-xs font-semibold transition-all ${activeTab === tab ? `bg-${color}-500 text-app-text shadow-lg` : 'text-app-text-muted hover:text-app-text'}`}
                                >{label}</button>
                            ))}
                        </div>
                        {/* Vendor Sync Button */}
                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                try {
                                    await apiClient.triggerPatchSync();
                                    setDeployResult({ ok: true, msg: "Vendor feed sync initiated." });
                                    fetchData();
                                } catch (err) {
                                    setDeployResult({ ok: false, msg: "Sync failed: " + err.message });
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-none text-app-text-muted transition-all border border-app-border flex items-center gap-1.5 px-3 text-xs font-semibold"
                            title="Sync with Microsoft/Linux Vendor Feeds"
                        >
                            <RefreshCw size={14} className={syncStatus?.status === 'RUNNING' ? 'animate-spin' : ''} />
                            Sync Feeds
                        </button>
                        {/* Export CSV button */}
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-none text-app-text-muted transition-all border border-app-border flex items-center gap-1.5 px-3 text-xs font-semibold"
                            title="Export Compliance CSV"
                        >
                            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Export
                        </button>
                        <button onClick={handleSnapshot} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-none text-app-text-muted transition-all border border-app-border" title="Initialize History Snapshot">
                            <Zap size={18} />
                        </button>
                        <button onClick={fetchData} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-none text-app-text-muted transition-all border border-app-border" title="Refresh">
                            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Deploy result banner */}
                {deployResult && (
                    <div className={`flex items-center gap-3 p-4 rounded-none border text-sm font-medium ${deployResult.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                        {deployResult.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        {deployResult.msg}
                        <button onClick={() => setDeployResult(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={16} /></button>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'FLEET COMPLIANCE', value: `${avgScore}%`, icon: <ShieldCheck size={20} />, color: 'emerald', sub: 'Avg compliance score' },
                        { label: 'HIGH-RISK ASSETS', value: highRiskCount, icon: <ShieldAlert size={20} />, color: 'rose', sub: 'With critical gaps' },
                        { label: 'MISSING PATCHES', value: totalMissing, icon: <ArrowUpCircle size={20} />, color: 'violet', sub: 'Across all endpoints' },
                        { label: 'MANAGED ENDPOINTS', value: compliance.length, icon: <Monitor size={20} />, color: 'blue', sub: 'Assets tracked' },
                    ].map(({ label, value, icon, color, sub }) => (
                        <div key={label} className="backdrop-blur-md bg-white bg-app-surface-soft border border-app-border p-6 rounded-none shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 bg-${color}-500/10 text-${color}-400 rounded-none`}>{icon}</div>
                                <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">{label}</span>
                            </div>
                            <p className="text-xl font-bold text-app-text">{value}</p>
                            <p className="text-xs text-app-text-muted mt-1">{sub}</p>
                        </div>
                    ))}
                </div>

                {/* Enterprise Compliance Heatmap */}
                {activeTab === 'compliance' && compliance.length > 0 && (
                    <div className="p-6 rounded-none bg-white bg-app-surface-soft border border-app-border shadow-sm animate-in slide-in-from-top duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-app-text-muted uppercase tracking-widest flex items-center gap-2">
                                <Shield className="text-emerald-400" size={14} /> Fleet Compliance Heatmap
                            </h3>
                            <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Non-Compliant (&lt;70%)</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> At Risk (70-90%)</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Compliant (&gt;90%)</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {[...compliance].sort((a,b) => a.compliance_score - b.compliance_score).map(c => (
                                <div 
                                    key={c.asset_id} 
                                    className={`w-6 h-6 rounded-none transition-all duration-300 hover:scale-125 hover:shadow-lg cursor-help ${getScoreBg(c.compliance_score)} border border-white/10`}
                                    title={`${c.asset_name}: ${Math.round(c.compliance_score)}%`}
                                />
                            ))}
                        </div>
                        <p className="text-[10px] text-app-text-muted mt-4 italic">Visualizing {compliance.length} managed endpoints. Hover over blocks for asset details.</p>
                    </div>
                )}

                {/* Main table */}
                <div className="backdrop-blur-md bg-app-surface-soft border border-app-border rounded-none overflow-hidden shadow-2xl">
                    {/* Search */}
                    <div className="p-6 border-b border-app-border flex items-center gap-4">
                        <div className="relative flex-grow max-w-md">
                            <Search size={18} className="absolute left-3 top-2.5 text-app-text-muted" />
                            <input
                                type="text"
                                placeholder={activeTab === 'compliance' ? 'Search assets…' : 'Search patches, CVE, platform…'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900/50 border border-app-border rounded-none py-2 pl-10 pr-4 text-sm text-app-text focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="text-app-text-muted hover:text-app-text"><X size={16} /></button>}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="bg-slate-50 dark:bg-white/[0.02] text-left">
                                {activeTab === 'compliance' ? (
                                    <tr>
                                        {['Asset Name', 'Platform', 'Installed / Total', 'Score', 'Critical Missing', 'Details'].map((h, i) => (
                                            <th key={h} className={`px-6 py-4 text-xs font-semibold text-app-text-muted uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                                        ))}
                                    </tr>
                                ) : activeTab === 'jobs' ? (
                                    <tr>
                                        {['Job ID', 'Patch / Target', 'Status', 'Endpoints', 'Created', 'Actions'].map((h, i) => (
                                            <th key={h} className={`px-6 py-4 text-xs font-semibold text-app-text-muted uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                                        ))}
                                    </tr>
                                ) : (
                                    <tr>
                                        {['Patch ID', 'Title / CVE', 'Severity', 'Platform', 'Release Date', 'Actions'].map((h, i) => (
                                            <th key={h} className={`px-6 py-4 text-xs font-semibold text-app-text-muted uppercase tracking-wider ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                                        ))}
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-app-text-muted">
                                        <div className="flex items-center justify-center gap-2"><RefreshCcw size={18} className="animate-spin" /> Scanning system state…</div>
                                    </td></tr>
                                ) : activeTab === 'compliance' ? (
                                    filteredCompliance.length === 0
                                        ? <tr><td colSpan="6" className="px-6 py-8 text-center text-app-text-muted">No matching assets found.</td></tr>
                                        : filteredCompliance.map((c) => (
                                            <tr key={c.asset_id} className="hover:bg-white dark:bg-white/[0.01] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-none bg-blue-500/20 flex items-center justify-center text-blue-400"><Monitor size={16} /></div>
                                                        <span className="text-sm font-medium text-app-text">{c.asset_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {c.platform
                                                        ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-app-border bg-app-surface-soft text-app-text-muted">{c.platform}</span>
                                                        : <span className="text-xs text-app-text-muted italic">Unknown</span>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-app-text-muted">
                                                    {c.installed_patches} / {c.total_patches}
                                                    <div className="w-24 h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${getScoreBg(c.compliance_score)}`} style={{ width: `${c.compliance_score}%` }} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-sm">
                                                    <span className={getScoreColor(c.compliance_score)}>{Math.round(c.compliance_score)}%</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${c.critical_missing > 0 ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' : 'text-app-text-muted border-app-border bg-app-surface-soft'}`}>
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
                                ) : activeTab === 'jobs' ? (
                                    jobs.length === 0
                                        ? <tr><td colSpan="6" className="px-6 py-8 text-center text-app-text-muted">No deployment jobs found.</td></tr>
                                        : jobs.map((j) => (
                                            <tr key={j.id} className="hover:bg-white dark:bg-white/[0.01] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-app-text-muted group-hover:text-blue-400 transition-colors">
                                                        #{j.id.slice(0, 8).toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-app-text truncate max-w-[200px]" title={j.patch_title || j.patch_id}>
                                                            {j.patch_title || (j.patch_id ? `Patch ${j.patch_id.slice(0,8)}` : 'Unknown Patch')}
                                                        </span>
                                                        <span className="text-[10px] text-app-text-muted font-medium uppercase tracking-wider">
                                                            TO: {j.target_criteria?.group === 'ALL' ? 'ALL ASSETS' : (j.target_criteria?.group || 'ALL ASSETS')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[j.status] || ''}`}>
                                                        {j.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-app-text">{j.completed_assets} / {j.total_assets}</span>
                                                        <div className="w-16 h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500 transition-all" style={{ width: `${(j.completed_assets / (j.total_assets || 1)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-app-text-muted italic">
                                                    {new Date(j.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {j.status === 'AWAITING_APPROVAL' && (
                                                            <button 
                                                                onClick={async () => {
                                                                    try {
                                                                        await apiClient.approvePatchJob(j.id);
                                                                        setDeployResult({ ok: true, msg: "Job approved and dispatched." });
                                                                        fetchData();
                                                                    } catch (err) {
                                                                        setDeployResult({ ok: false, msg: "Approval failed: " + err.message });
                                                                    }
                                                                }}
                                                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-none text-[10px] font-bold flex items-center gap-1"
                                                            >
                                                                <ShieldCheck size={12} /> Approve
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={async () => {
                                                                setSelectedJob(j);
                                                                setLogsLoading(true);
                                                                try {
                                                                    const logs = await apiClient.getPatchJobLogs(j.id);
                                                                    setJobLogs(logs);
                                                                } catch (err) { console.error(err); }
                                                                finally { setLogsLoading(false); }
                                                            }}
                                                            className="p-1.5 hover:bg-white/5 rounded-none text-slate-400"
                                                        >
                                                            <ChevronRight size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    filteredPatches.length === 0
                                        ? <tr><td colSpan="6" className="px-6 py-8 text-center text-app-text-muted">No available patches found.</td></tr>
                                        : filteredPatches.map((p) => (
                                            <tr key={p.id} className="hover:bg-white dark:bg-white/[0.01] transition-colors group">
                                                <td className="px-6 py-4 text-xs font-mono text-emerald-400">{p.patch_id}</td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {p.is_custom && <File size={14} className="text-emerald-400 shrink-0" title="Locally hosted patch" />}
                                                            <span className="text-sm font-medium text-app-text truncate">{p.title}</span>
                                                            {getCvssBadge(p.cvss_score)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            <span className="text-[10px] text-app-text-muted uppercase">{p.patch_type}</span>
                                                            {(p.cve_ids || []).slice(0, 2).map(cve => (
                                                                <span key={cve} className="text-[9px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1 py-px">{cve}</span>
                                                            ))}
                                                            {p.kb_article_url && (
                                                                <a href={p.kb_article_url} target="_blank" rel="noreferrer" className="text-app-text-muted hover:text-app-text-muted transition-colors" title="KB Article">
                                                                    <ExternalLink size={10} />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getSeverityColor(p.severity)}`}>{p.severity}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-app-text-muted uppercase">{p.platform}</td>
                                                <td className="px-6 py-4 text-sm text-app-text-muted">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={13} className="text-app-text-muted" />
                                                        {p.release_date ? new Date(p.release_date).toLocaleDateString() : '—'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Upload button */}
                                                        <button
                                                            onClick={() => setUploadingPatch(p)}
                                                            className={`px-2.5 py-1.5 rounded-none text-xs font-bold border transition-all flex items-center gap-1 ${p.is_custom ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-app-surface-soft text-app-text-muted border-app-border hover:border-emerald-500/30 hover:text-emerald-400'}`}
                                                            title={p.is_custom ? "Update binary" : "Upload binary"}
                                                        >
                                                            <Upload size={11} /> {p.is_custom ? "Update" : "Upload"}
                                                        </button>
                                                        {/* Schedule button */}
                                                        <button
                                                            onClick={() => setSchedulingPatch(p)}
                                                            className="px-2.5 py-1.5 rounded-none text-xs font-bold border bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border-violet-500/20 flex items-center gap-1"
                                                            title="Schedule deployment"
                                                        >
                                                            <Clock size={11} /> Schedule
                                                        </button>
                                                        {/* Deploy All button */}
                                                        <button
                                                            onClick={() => handleDeployToAll(p)}
                                                            disabled={!!deployingPatch}
                                                            className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all border flex items-center gap-1.5 ${deployingPatch === p.id ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 cursor-not-allowed' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'}`}
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
                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-none flex items-start gap-4">
                    <Info className="text-blue-400 mt-0.5 shrink-0" size={20} />
                    <div>
                        <p className="text-sm font-bold text-blue-400">Scheduled Automation Active</p>
                        <p className="text-app-text-muted text-xs mt-1">
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

            {/* Upload Modal */}
            {uploadingPatch && (
                <PatchUploadModal
                    patch={uploadingPatch}
                    onClose={() => setUploadingPatch(null)}
                    onUploaded={() => { 
                        setUploadingPatch(null); 
                        fetchData();
                        setDeployResult({ ok: true, msg: "Patch binary uploaded and verified." });
                    }}
                />
            )}

            {/* Asset Drill-Down Panel */}
            {selectedAsset && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedAsset(null)} />
                    <div className="relative w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-app-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                        {/* Panel header */}
                        <div className="flex items-center justify-between p-6 border-b border-app-border">
                            <div>
                                <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-1">Asset Patch Detail</p>
                                <h2 className="text-xl font-bold text-app-text">{selectedAsset.asset_name}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    {selectedAsset.platform && <span className="text-xs text-app-text-muted">{selectedAsset.platform}</span>}
                                    <span className={`text-sm font-bold ${getScoreColor(selectedAsset.compliance_score)}`}>{Math.round(selectedAsset.compliance_score)}% Compliant</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-none text-app-text-muted hover:text-app-text transition-all"><X size={20} /></button>
                        </div>

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-app-border">
                            {[
                                { label: 'Installed', value: selectedAsset.installed_patches, color: 'text-emerald-400' },
                                { label: 'Missing', value: selectedAsset.missing_patches, color: 'text-rose-400' },
                                { label: 'Critical ↑', value: selectedAsset.critical_missing, color: 'text-amber-400' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="px-4 py-3 text-center">
                                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                    <p className="text-[10px] text-app-text-muted uppercase mt-0.5">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Deployment list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {drillLoading ? (
                                <div className="flex items-center justify-center py-12 gap-2 text-app-text-muted">
                                    <Loader2 size={18} className="animate-spin" /> Loading patch records…
                                </div>
                            ) : assetDeployments.length === 0 ? (
                                <div className="py-12 text-center text-app-text-muted text-sm">
                                    No patch deployment records found for this asset.<br />
                                    <span className="text-xs text-app-text-muted">Records appear after agent scan or manual deploy.</span>
                                </div>
                            ) : assetDeployments.map((dep) => (
                                <div key={dep.id} className="flex items-center justify-between p-3 rounded-none bg-slate-50 dark:bg-white/[0.03] border border-app-border hover:bg-slate-100 dark:bg-white/[0.05] transition-colors gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {STATUS_ICON[dep.status] ?? STATUS_ICON.MISSING}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-app-text truncate">{dep.patch_title || dep.patch_id}</p>
                                            {dep.installed_at && <p className="text-[10px] text-app-text-muted">Installed {new Date(dep.installed_at).toLocaleDateString()}</p>}
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
                                                className="p-1 rounded-none text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
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
                                                className="p-1 rounded-none text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
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
            {/* Job Logs Modal */}
            {selectedJob && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedJob(null)} />
                    <div className="relative bg-white dark:bg-slate-900 border border-app-border rounded-none p-6 w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-app-text">Deployment Logs</h3>
                                <p className="text-xs text-app-text-muted font-mono">Job ID: {selectedJob.id}</p>
                            </div>
                            <button onClick={() => setSelectedJob(null)} className="text-app-text-muted hover:text-app-text"><X size={18} /></button>
                        </div>

                        <div className="flex-1 bg-slate-50 dark:bg-black/40 rounded-none border border-app-border p-4 font-mono text-[11px] overflow-y-auto space-y-2">
                            {logsLoading ? (
                                <div className="flex items-center gap-2 text-slate-500"><Loader2 size={14} className="animate-spin" /> Fetching agent logs…</div>
                            ) : jobLogs.length === 0 ? (
                                <div className="text-slate-500 italic">No logs generated yet. Agents report back as they process the command.</div>
                            ) : jobLogs.map((log, i) => (
                                <div key={i} className="border-b border-white/5 pb-2">
                                    <div className="flex justify-between text-slate-500 mb-1 font-bold">
                                        <span>Asset: {log.asset_id?.slice(0, 8) || 'Unknown'}…</span>
                                        <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <div className={`break-words ${log.source === 'stderr' ? 'text-rose-400' : 'text-emerald-400/80'}`}>
                                        <span className="opacity-50 mr-1">[{log.source.toUpperCase()}]</span> {log.message}
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
