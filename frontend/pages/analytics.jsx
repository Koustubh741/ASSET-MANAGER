import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    PieChart, Activity, TrendingUp, TrendingDown,
    BarChart2, Target, Zap, Clock, CheckCircle2,
    ArrowUpRight, RefreshCw, Filter, Download
} from 'lucide-react';
import TicketCategorySummary from '@/components/tickets/TicketCategorySummary';
import apiClient from '@/lib/apiClient';

// ─── Mini Stat Card ──────────────────────────────────────────────────────────
function StatBadge({ label, value, delta, icon: Icon, color = 'indigo' }) {
    const isUp = typeof delta === 'string' && delta.startsWith('+');
    return (
        <div className={`relative glass-card px-4 py-6 overflow-hidden group hover:-translate-y-1 transition-all duration-300 border-t-2
            ${color === 'indigo' ? 'border-indigo-500' :
                color === 'emerald' ? 'border-emerald-500' :
                    color === 'rose' ? 'border-rose-500' :
                        color === 'amber' ? 'border-amber-500' :
                            color === 'blue' ? 'border-blue-500' : 'border-purple-500'}`}>
            <div className={`absolute -right-6 -top-6 w-20 h-20 opacity-0 group-hover:opacity-15 blur-[30px] transition-opacity bg-${color}-500`} />
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
                    <Icon size={18} className={`text-${color}-400`} />
                </div>
                {delta && (
                    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border
                        ${isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {delta}
                    </span>
                )}
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-['Outfit'] mt-1">{value ?? '—'}</p>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-1">{label}</p>
        </div>
    );
}

// ─── Resolution Rate Ring ─────────────────────────────────────────────────────
function ResolutionRing({ rate = 0 }) {
    const r = 54, circ = 2 * Math.PI * r;
    const progress = circ * (1 - rate / 100);
    return (
        <div className="relative w-36 h-36 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-white/5" />
                <circle cx="60" cy="60" r={r} fill="none" stroke="url(#rg)" strokeWidth="8"
                    strokeDasharray={circ} strokeDashoffset={progress}
                    strokeLinecap="round" className="transition-all duration-1000" />
                <defs>
                    <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">{rate}%</span>
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Resolution</span>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    const [categoryStats, setCategoryStats] = useState([]);
    const [assetStats, setAssetStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [timeRange, setTimeRange] = useState('30d');

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Convert '7d', '30d', '90d' to numeric days
            const days = parseInt(timeRange);
            const [catData, globalStats] = await Promise.all([
                apiClient.getTicketStatsByCategory(days),
                apiClient.getAssetStats()
            ]);
            setCategoryStats(catData?.stats || []);
            setAssetStats(globalStats || {});
            setLastRefresh(new Date());
        } catch (e) {
            console.error('Failed to load analytics:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, [timeRange]);

    // Derived metrics
    const totalTickets = categoryStats.reduce((s, c) => s + (c.total || 0), 0);
    const openTickets = categoryStats.reduce((s, c) => s + (c.open || 0), 0);
    const resolvedTickets = categoryStats.reduce((s, c) => s + (c.resolved || 0), 0);
    const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
    const topCategory = [...categoryStats].sort((a, b) => b.total - a.total)[0];

    return (
        <div className="min-h-screen p-6 lg:p-10 space-y-10">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="relative glass-panel p-8 overflow-hidden group border border-slate-300 dark:border-white/10 dark:border-white/10 border-slate-200">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/3 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                <BarChart2 size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit'] tracking-tight">
                                    Ticket <span className="text-indigo-400">Analytics</span>
                                </h1>
                                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mt-1">
                                    Neural Classification · Performance Matrix
                                </p>
                            </div>
                        </div>
                        {lastRefresh && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono ml-1">
                                Last updated: {lastRefresh.toLocaleTimeString()}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Time Range Selector */}
                        <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-1">
                            {['7d', '30d', '90d'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                            ${timeRange === range
                                            ? 'bg-indigo-600 text-slate-900 dark:text-white shadow-lg shadow-indigo-500/20'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-700 dark:text-slate-300'}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <Link href="/analytics/oem">
                                <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white dark:bg-slate-900 dark:bg-white text-slate-900 dark:text-white dark:text-slate-950 text-sm font-black transition-all hover:scale-105 active:scale-95 group">
                                    <Zap size={14} className="group-hover:text-indigo-400" />
                                    Manage Intelligence
                                </button>
                            </Link>
                            <button
                                onClick={fetchAll}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-sm font-black transition-all hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-white/10 active:scale-95"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── KPI Strip ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatBadge label="Total Tickets" value={totalTickets} delta="+12%" icon={Activity} color="indigo" />
                <StatBadge label="Open / Active" value={openTickets} delta={openTickets > 10 ? '+high' : 'low'} icon={Clock} color="rose" />
                <StatBadge label="Resolved" value={resolvedTickets} delta="+8%" icon={CheckCircle2} color="emerald" />
                <StatBadge label="Categories" value={categoryStats.length} icon={PieChart} color="purple" />
                <StatBadge label="Health Score" value={assetStats?.health_score ? `${assetStats.health_score}%` : '—'} icon={Target} color="blue" />
            </div>

            {/* ── Resolution Ring + Top Category ──────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Resolution Rate */}
                <div className="glass-panel p-8 flex items-center gap-8 relative overflow-hidden group border border-slate-200 dark:border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    <ResolutionRing rate={resolutionRate} />
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-2">Overall Resolution Rate</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white font-['Outfit']">{resolvedTickets} <span className="text-lg text-slate-500 dark:text-slate-400 font-bold">resolved</span></p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">out of <span className="text-slate-900 dark:text-white font-black">{totalTickets}</span> total</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {resolutionRate >= 75 ? 'On Track' : resolutionRate >= 50 ? 'Needs Attention' : 'Critical'}
                        </div>
                    </div>
                </div>

                {/* Dominant Category */}
                <div className="glass-panel p-8 relative overflow-hidden group border border-slate-200 dark:border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-4 relative z-10">Dominant Category</p>
                    {topCategory ? (
                        <div className="relative z-10">
                            <p className="text-2xl font-black text-slate-900 dark:text-white font-['Outfit'] leading-tight">{topCategory.category}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{topCategory.total} tickets · {topCategory.open} open</p>
                            <div className="mt-4 h-2 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${Math.min(100, (topCategory.total / totalTickets) * 100)}%` }}
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000"
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black mt-2 uppercase tracking-widest">
                                {Math.round((topCategory.total / totalTickets) * 100)}% of total volume
                            </p>
                        </div>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 italic text-sm">No data</p>
                    )}
                </div>

                <div className="glass-panel p-8 relative overflow-hidden group border border-slate-200 dark:border-white/10 lg:col-span-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-4 relative z-10">System Status</p>
                    <div className="relative z-10 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-lg font-bold text-slate-900 dark:text-white">All Systems Operational</p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Latest sync: {new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>

            {/* ── Main Two-Panel Grid ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-8">
                {/* Analytic Categories */}
                <section className="glass-panel p-8 group relative border border-slate-200 dark:border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                <PieChart size={22} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] uppercase tracking-tight">
                                    Analytic Categories
                                </h2>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Neural Classification</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
                            {categoryStats.length} Active
                        </span>
                    </div>
                    <div className="relative z-10">
                        <TicketCategorySummary stats={categoryStats} loading={loading} />
                    </div>
                </section>
            </div>

            {/* ── Category Breakdown Bar Chart ─────────────────────────────── */}
            {categoryStats.length > 0 && (
                <section className="glass-panel p-8 relative overflow-hidden border border-slate-200 dark:border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/3 to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                <BarChart2 size={22} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] uppercase tracking-tight">
                                    Volume Breakdown
                                </h2>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">All categories · open vs resolved</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-4">
                        {[...categoryStats]
                            .sort((a, b) => b.total - a.total)
                            .map((stat) => {
                                const openPct = totalTickets > 0 ? (stat.open / totalTickets) * 100 : 0;
                                const resolvedPct = totalTickets > 0 ? ((stat.resolved || 0) / totalTickets) * 100 : 0;
                                const barWidth = totalTickets > 0 ? (stat.total / Math.max(...categoryStats.map(s => s.total))) * 100 : 0;
                                return (
                                    <div key={stat.category} className="flex items-center gap-4 group/row">
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-36 shrink-0 truncate">
                                            {stat.category}
                                        </span>
                                        <div className="flex-1 h-7 bg-slate-100 dark:bg-white/5 rounded-lg overflow-hidden flex border border-slate-200 dark:border-white/5">
                                            <div
                                                style={{ width: `${(stat.open / stat.total) * barWidth}%` }}
                                                className="h-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-700"
                                            />
                                            <div
                                                style={{ width: `${((stat.resolved || 0) / stat.total) * barWidth}%` }}
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0 w-40 text-right">
                                            <span className="text-[10px] font-black text-rose-400 w-16 text-right">{stat.open} open</span>
                                            <span className="text-[10px] font-black text-emerald-400 w-20 text-right">{stat.resolved || 0} resolved</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-white/10 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400" />
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Open / In Progress</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Resolved</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <Zap size={14} className="text-indigo-400" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Neural Volume Sync Active</span>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Asset Reliability & Departmental Impact ──────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Reliability Matrix */}
                <section className="glass-panel p-8 relative overflow-hidden border border-slate-200 dark:border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            <Target size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] uppercase tracking-tight">Reliability Matrix</h2>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Top-Fault Assets & Categories</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {[...categoryStats]
                            .sort((a, b) => b.reliability_score - a.reliability_score)
                            .slice(0, 4)
                            .map((stat) => (
                                <div key={stat.category} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${stat.reliability_score > 7 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                        <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{stat.category}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Risk</p>
                                            <p className={`text-sm font-black ${stat.reliability_score > 7 ? 'text-rose-500' : 'text-amber-500'}`}>{stat.reliability_score}/10</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nodes</p>
                                            <p className="text-sm font-black text-slate-900 dark:text-white">{stat.total}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </section>

                {/* Departmental Impact Heatmap */}
                <section className="glass-panel p-8 relative overflow-hidden border border-slate-200 dark:border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Target size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white font-['Outfit'] uppercase tracking-tight">Departmental Load</h2>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">Ticket volume by org segment</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Flatten and aggregate departments across all categories for a global view */}
                        {(() => {
                            const deptMap = {};
                            categoryStats.forEach(stat => {
                                stat.department_impact?.forEach(di => {
                                    deptMap[di.department] = (deptMap[di.department] || 0) + di.count;
                                });
                            });
                            const depts = Object.entries(deptMap)
                                .map(([dept, count]) => ({ dept, count }))
                                .sort((a, b) => b.count - a.count)
                                .slice(0, 5);

                            const max = Math.max(...depts.map(d => d.count), 1);

                            return depts.map(d => (
                                <div key={d.dept} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-500 dark:text-slate-400">{d.dept}</span>
                                        <span className="text-slate-900 dark:text-white">{d.count} Events</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 transition-all duration-1000"
                                            style={{ width: `${(d.count / max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </section>
            </div>

        </div>
    );
}
