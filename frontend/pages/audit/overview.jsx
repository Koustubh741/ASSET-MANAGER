import Link from 'next/link';
import { ArrowLeft, History, CheckCircle, AlertOctagon, XCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export default function AuditOverviewPage() {
    const [stats, setStats] = useState({ total: 0, compliant: 0, issues: 0 });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch real audit logs
            const logs = await apiClient.getAuditLogs({ limit: 20, entity_type: 'API' });
            
            // Map real logs to table format
            const formattedHistory = logs.map(log => ({
                id: log.id,
                location: log.details?.location || log.details?.asset_metadata?.location || 'External API',
                date: new Date(log.timestamp).toLocaleDateString(),
                status: 'Captured',
                auditor: log.performed_by,
                action: log.action,
                details: log.details
            }));
            
            setHistory(formattedHistory);
            
            // Fetch stats
            const auditStats = await apiClient.getAuditStats();
            setStats({ 
                total: auditStats.total, 
                compliant: 100, 
                issues: 0,
                api_collects: auditStats.api_collects
            });
            
            setLoading(false);
        } catch (error) {
            console.error('Failed to load audit data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSync = async () => {
        try {
            setSyncing(true);
            const res = await apiClient.syncAuditLogs();
            alert(`Sync complete! Created ${res.synced_count} missing assets.`);
            await loadData();
        } catch (err) {
            console.error('Sync failed:', err);
            alert('Failed to sync orphaned logs.');
        } finally {
            setSyncing(false);
        }
    };

    if (loading && history.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/enterprise" className="p-2 rounded-xl hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Asset Audit Hub</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Verify physical inventory and monitoring trails</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleSync}
                        disabled={syncing}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
                            syncing 
                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-slate-900 dark:text-white hover:scale-105 active:scale-95 shadow-blue-500/20'
                        }`}
                    >
                        <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing...' : 'Sync Ingested Data'}
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel p-6 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                <History size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.total}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">System Logs</div>
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.api_collects || 0}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">API Collects</div>
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                                <AlertOctagon size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.issues}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">Variances</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History Table */}
                <div className="glass-panel rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-white/5">
                        <h3 className="font-bold text-lg">Discovery & Ingestion History</h3>
                        <div className="flex gap-2">
                             <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">Live Trail</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-white/5">
                                <tr>
                                    <th className="px-6 py-4">Source / Scope</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Performed By</th>
                                    <th className="px-6 py-4">Action Type</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Options</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic">No audit events found in system logs.</td>
                                    </tr>
                                ) : (
                                    history.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-100 dark:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200">{item.location}</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.date}</td>
                                            <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{item.auditor}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono text-blue-400 px-2 py-1 bg-blue-500/10 rounded-md border border-blue-500/20">
                                                    {item.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedLog(item)}
                                                    className="px-4 py-1.5 text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-blue-600 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white rounded-lg transition-all border border-slate-200 dark:border-white/10"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Log Details Modal */}
                {selectedLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                            <div className="p-8 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400">
                                        <History size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">External Data Details</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono opacity-60 overflow-hidden truncate max-w-[300px]">{selectedLog.id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-all">
                                    <XCircle size={28} />
                                </button>
                            </div>
                            
                            <div className="p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900/50">
                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest mb-1.5">Ingestion Source</p>
                                        <p className="text-sm text-slate-900 dark:text-white font-semibold">{selectedLog.auditor}</p>
                                    </div>
                                    <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest mb-1.5">Capture Date</p>
                                        <p className="text-sm text-slate-900 dark:text-white font-semibold">{selectedLog.date}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Raw JSON Metadata</p>
                                        <span className="text-[10px] text-blue-500 font-bold px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20 uppercase tracking-widest">application/json</span>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-white/10 font-mono text-[11px] text-blue-300/90 leading-relaxed overflow-x-auto whitespace-pre shadow-sm dark:shadow-inner">
                                        {JSON.stringify(selectedLog.details || { message: "No payload details captured for this event." }, null, 4)}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 border-t border-slate-200 dark:border-white/5 flex justify-end gap-3 bg-slate-50 dark:bg-white/[0.02]">
                                <button 
                                    onClick={() => setSelectedLog(null)}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
