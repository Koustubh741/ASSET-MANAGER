import Link from 'next/link';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, PieChart as PieIcon, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import BarChart from '@/components/BarChart'; 
import PieChart from '@/components/PieChart';
import apiClient from '@/lib/apiClient';

export default function FinancialCenterPage() {
    const [summary, setSummary] = useState(null);
    const [categorySpend, setCategorySpend] = useState([]);
    const [monthlySpend, setMonthlySpend] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFinancials = async () => {
            try {
                const [sum, byType, monthly] = await Promise.all([
                    apiClient.get('/financials/summary'),
                    apiClient.get('/financials/by-type'),
                    apiClient.get('/financials/monthly-spend?months=6')
                ]);
                
                setSummary(sum);
                setCategorySpend(byType.map(t => ({ name: t.asset_type, value: t.total_value })));
                setMonthlySpend(monthly.map(m => ({ name: m.month, value: m.total_spend })));
            } catch (e) {
                console.error("Failed to fetch financial data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchFinancials();
    }, []);

    if (loading) return <div className="p-8 text-app-text-muted font-mono text-sm animate-pulse text-center">Loading Real-time Financials...</div>;
    if (!summary) return <div className="p-8 text-rose-500 text-center">Error loading financial data.</div>;

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-app-text">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <Link href="/enterprise-features" className="p-2 rounded-none hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Financial Center</h1>
                        <p className="text-app-text-muted mt-1">Cost analysis and asset depreciation</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="glass-panel p-6 rounded-none bg-white dark:bg-slate-900 border border-app-border">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-none"><DollarSign size={20} /></div>
                            <span className="text-xs text-emerald-400 flex items-center gap-1">+12% <TrendingUp size={12} /></span>
                        </div>
                        <div className="text-2xl font-bold text-app-text">₹{(summary.total_asset_value / 1000000).toFixed(2)}M</div>
                        <div className="text-sm text-app-text-muted">Total Asset Value</div>
                    </div>
                    <div className="glass-panel p-6 rounded-none bg-white dark:bg-slate-900 border border-app-border">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-none"><CreditCard size={20} /></div>
                            <span className="text-xs text-app-text-muted">TOTAL</span>
                        </div>
                        <div className="text-2xl font-bold text-app-text">₹{(summary.total_procurement_cost / 1000).toFixed(0)}k</div>
                        <div className="text-sm text-app-text-muted">Procurement Cost</div>
                    </div>
                    <div className="glass-panel p-6 rounded-none bg-white dark:bg-slate-900 border border-app-border">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-none"><TrendingUp size={20} /></div>
                            <span className="text-xs text-orange-400 flex items-center gap-1">Upcoming <TrendingUp size={12} /></span>
                        </div>
                        <div className="text-2xl font-bold text-app-text">₹{(summary.upcoming_renewal_cost / 1000).toFixed(0)}k</div>
                        <div className="text-sm text-app-text-muted">Projected Renewal Cost</div>
                    </div>
                    <div className="glass-panel p-6 rounded-none bg-white dark:bg-slate-900 border border-app-border">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-red-500/10 text-red-400 rounded-none"><TrendingDown size={20} /></div>
                            <span className="text-xs text-app-text-muted">90 Days</span>
                        </div>
                        <div className="text-2xl font-bold text-app-text">{summary.renewals_due_90_days}</div>
                        <div className="text-sm text-app-text-muted">Assets Due for Renewal</div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-panel p-6 rounded-none bg-white dark:bg-slate-900 border border-app-border">
                        <h3 className="font-bold text-lg text-app-text mb-6">Spend by Asset Type</h3>
                        <div className="h-64 flex items-center justify-center">
                            <PieChart data={categorySpend} />
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-none bg-white dark:bg-slate-900 border border-app-border">
                        <h3 className="font-bold text-lg text-app-text mb-6">Spend Trend (Last 6 Months)</h3>
                        <div className="h-64 flex items-center justify-center">
                            <BarChart data={monthlySpend} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
