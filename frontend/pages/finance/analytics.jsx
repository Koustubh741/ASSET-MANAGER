import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, TrendingDown, PieChart as PieIcon, Download, TrendingUp, Activity } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/components/common/Toast';

/**
 * Finance Analytics — lives at /finance/analytics so PortalLayout (variant="finance")
 * is applied automatically. Routing never leaves the Finance portal.
 */
export default function FinanceAnalyticsPage() {
    const toast = useToast();
    const [summary, setSummary] = useState(null);
    const [monthlySpend, setMonthlySpend] = useState([]);
    const [depreciation, setDepreciation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [summaryRes, spendRes, deprRes] = await Promise.allSettled([
                    apiClient.getFinancialSummary(),
                    apiClient.getMonthlySpend(12),
                    apiClient.getDepreciation('straight-line', 5),
                ]);
                if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
                if (spendRes.status === 'fulfilled' && Array.isArray(spendRes.value)) {
                    setMonthlySpend(spendRes.value.map(d => ({
                        name: d.month?.length >= 7
                            ? d.month.slice(5, 7) + '/' + d.month.slice(2, 4)
                            : (d.month || ''),
                        spend: d.total_spend || 0,
                    })));
                }
                if (deprRes.status === 'fulfilled') setDepreciation(deprRes.value);
            } catch (e) {
                // individual errors handled by allSettled
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const totalValue = summary?.total_asset_value ?? 0;
    const totalDepr = depreciation?.total_depreciation ?? 0;
    const assetCount = summary?.total_assets ?? 0;
    const avgCost = assetCount > 0 ? totalValue / assetCount : 0;

    const exportCsv = () => {
        if (!monthlySpend.length) { toast.error('No data to export.'); return; }
        const rows = [
            ['Month', 'Total Spend (INR)'],
            ...monthlySpend.map(d => [d.name, d.spend]),
        ];
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export downloaded.');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-wrap justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white light:text-slate-800 flex items-center gap-3">
                        <PieIcon className="text-emerald-400" size={32} />
                        Finance Analytics
                    </h1>
                    <p className="text-slate-400 light:text-slate-600 mt-1">
                        Asset valuation, depreciation & spend trends
                    </p>
                </div>
                <button
                    onClick={exportCsv}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 light:bg-slate-50 hover:bg-white/10 border border-white/20 light:border-slate-200 text-white light:text-slate-800 text-sm font-medium"
                >
                    <Download size={18} /> Export CSV
                </button>
            </header>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <DollarSign size={22} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white light:text-slate-900">
                                {loading ? '—' : `₹${(totalValue / 100000).toFixed(1)}L`}
                            </p>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Book Value</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-rose-500/20 text-rose-400">
                            <TrendingDown size={22} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white light:text-slate-900">
                                {loading ? '—' : `₹${(totalDepr / 100000).toFixed(1)}L`}
                            </p>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Depreciation</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                            <Activity size={22} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white light:text-slate-900">
                                {loading ? '—' : assetCount}
                            </p>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Assets</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                            <TrendingUp size={22} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white light:text-slate-900">
                                {loading ? '—' : `₹${(avgCost / 1000).toFixed(1)}k`}
                            </p>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Avg Asset Cost</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Spend Trend */}
            <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4">
                    Monthly Spend Trend (12 months)
                </h3>
                {loading ? (
                    <div className="h-64 flex items-center justify-center text-slate-500">Loading…</div>
                ) : monthlySpend.length > 0 ? (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlySpend}>
                                <defs>
                                    <linearGradient id="financeSpendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                                <YAxis stroke="#64748b" tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Spend']}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="spend" stroke="#10b981" fillOpacity={1} fill="url(#financeSpendGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-64 flex items-center justify-center text-slate-500">
                        No spend data available yet.
                    </div>
                )}
            </div>

            {/* Depreciation breakdown */}
            {depreciation?.assets?.length > 0 && (
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4">
                        Depreciation by Asset (top 10)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={depreciation.assets.slice(0, 10).map(a => ({
                                    name: (a.name || 'Asset').slice(0, 12),
                                    depreciation: a.annual_depreciation ?? 0,
                                }))}
                                margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
                            >
                                <XAxis dataKey="name" stroke="#64748b" tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis stroke="#64748b" tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Annual Depr.']}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                />
                                <Bar dataKey="depreciation" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Summary table from financials API */}
            {summary && (
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4">Financial Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {Object.entries(summary)
                            .filter(([k, v]) => typeof v === 'number' || typeof v === 'string')
                            .map(([key, value]) => (
                                <div key={key} className="bg-white/5 light:bg-slate-50 rounded-xl p-4 border border-white/10 light:border-slate-200">
                                    <p className="text-xs text-slate-400 light:text-slate-600 uppercase font-bold tracking-wider mb-1">
                                        {key.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-base font-bold text-white light:text-slate-900">
                                        {typeof value === 'number'
                                            ? (key.toLowerCase().includes('value') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('spend'))
                                                ? `₹${Number(value).toLocaleString()}`
                                                : Number(value).toLocaleString()
                                            : String(value)}
                                    </p>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
