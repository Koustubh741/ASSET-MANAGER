import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, FileText, Download, PieChart as PieIcon } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/components/common/Toast';

/**
 * Procurement Analytics – stays in Procurement hub (URL /procurement/analytics).
 * Root fix: do not redirect to /financials (Finance portal).
 */
export default function ProcurementAnalyticsPage() {
    const [summary, setSummary] = useState(null);
    const toast = useToast();

    useEffect(() => {
        apiClient.getProcurementSummary(6)
            .then(res => setSummary(res))
            .catch(() => setSummary(null));
    }, []);

    const trendData = summary?.monthly_po_value?.length
        ? summary.monthly_po_value.map(d => ({
            name: d.month.length >= 7 ? d.month.slice(5, 7) + '/' + d.month.slice(2, 4) : d.month,
            value: d.po_count,
            amount: d.total_spend || 0
        }))
        : [];

    const exportCsv = () => {
        const rows = [
            ['Month', 'PO Count', 'Total Spend'],
            ...(summary?.monthly_po_value || []).map(d => [d.month, d.po_count, d.total_spend ?? 0]),
        ];
        const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `procurement-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export downloaded.');
    };

    const pendingCount = summary?.pending_po_count ?? 0;
    const pendingValue = summary?.pending_po_total_value ?? 0;

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap justify-between items-end gap-4">
                <div>
                    <h1 className="text-xl font-bold text-app-text flex items-center gap-2">
                        <PieIcon className="text-blue-400" size={32} />
                        Procurement Analytics
                    </h1>
                    <p className="text-app-text-muted text-app-text-muted mt-1">PO and spend trends — Procurement hub</p>
                </div>
                <button
                    onClick={exportCsv}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface border border-slate-200 dark:border-white/20 text-app-text text-sm font-medium"
                >
                    <Download size={18} /> Export
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-app-text">{pendingCount}</h3>
                            <p className="text-xs text-app-text-muted">Pending POs (6 months)</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-app-text">
                                {pendingValue > 0 ? `₹${(pendingValue / 100000).toFixed(1)}L` : '₹0'}
                            </h3>
                            <p className="text-xs text-app-text-muted">Total PO Value</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                            <PieIcon size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-app-text">
                                {summary?.monthly_po_value?.length ?? 0}
                            </h3>
                            <p className="text-xs text-app-text-muted">Months of data</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-app-text mb-4">PO spend trend (6 months)</h3>
                {trendData.length > 0 ? (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="procurementAnalyticsValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                                <YAxis stroke="#64748b" tickLine={false} tickFormatter={v => `₹${(v / 1000)}k`} />
                                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Spend']} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#procurementAnalyticsValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-64 flex items-center justify-center text-app-text-muted">
                        {summary === null ? 'Loading…' : 'No PO data for the last 6 months.'}
                    </div>
                )}
            </div>
        </div>
    );
}
