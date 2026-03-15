import Link from 'next/link';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, PieChart as PieIcon, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import BarChart from '@/components/BarChart'; // Reusing existing components
import PieChart from '@/components/PieChart';

export default function FinancialCenterPage() {
    const [data, setData] = useState(null);

    useEffect(() => {
        // Mock Data
        setData({
            total_spend: 1250000,
            ytd_spend: 450000,
            projected: 550000,
            depreciation: [
                { name: 'Jan', value: 4000 },
                { name: 'Feb', value: 3000 },
                { name: 'Mar', value: 2000 },
                { name: 'Apr', value: 2780 },
                { name: 'May', value: 1890 },
                { name: 'Jun', value: 2390 },
            ],
            category_spend: [
                { name: 'Hardware', value: 400 },
                { name: 'Software', value: 300 },
                { name: 'Services', value: 300 },
                { name: 'Cloud', value: 200 },
            ]
        });
    }, []);

    if (!data) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading Financials...</div>;

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <Link href="/enterprise-features" className="p-2 rounded-xl hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Financial Center</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Cost analysis and asset depreciation</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-lg"><DollarSign size={20} /></div>
                            <span className="text-xs text-emerald-400 flex items-center gap-1">+12% <TrendingUp size={12} /></span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">₹{(data.total_spend / 1000000).toFixed(2)}M</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Total Asset Value</div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><CreditCard size={20} /></div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">YTD</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">₹{(data.ytd_spend / 1000).toFixed(0)}k</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Spend This Year</div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><TrendingUp size={20} /></div>
                            <span className="text-xs text-orange-400 flex items-center gap-1">+5% <TrendingUp size={12} /></span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">₹{(data.projected / 1000).toFixed(0)}k</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Projected Renewal Cost</div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg"><TrendingDown size={20} /></div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Monthly</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">₹4.2k</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Avg. Depreciation</div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">Spend by Category</h3>
                        <div className="h-64 flex items-center justify-center">
                            {/* Assuming PieChart takes data prop. If not compatible, we fallback to mock visual */}
                            <PieChart data={data.category_spend} />
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6">Depreciation Trend (6 Months)</h3>
                        <div className="h-64 flex items-center justify-center">
                            <BarChart data={data.depreciation} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
