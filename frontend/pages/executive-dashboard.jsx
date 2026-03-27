import React from 'react';
import Head from 'next/head';
import { 
    Shield, 
    Activity, 
    DollarSign, 
    RefreshCw,
    User
} from 'lucide-react';

// Hooks
import { useExecutiveData } from '../hooks/useExecutiveData';

// Components
import HealthGauge from '../components/executive/HealthGauge';
import MetricCard from '../components/executive/MetricCard';
import StrategicAdvisor from '../components/executive/StrategicAdvisor';
import AssetDistribution from '../components/executive/AssetDistribution';
import FinancialRiskPanel from '../components/executive/FinancialRiskPanel';
import DepartmentalOverview from '../components/executive/DepartmentalOverview';

/**
 * Executive Strategic Hub - Orchestrator Page.
 * Implements a high-fidelity, autonomous intelligence node for CXO personas.
 */
export default function ExecutiveDashboard() {
    const { data, loading, error, refresh } = useExecutiveData();

    if (loading && !data) return (
        <div className="flex min-h-screen items-center justify-center bg-app-bg text-app-text-muted">
            <div className="flex flex-col items-center gap-4">
                <RefreshCw className="animate-spin text-primary" size={32} />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Initializing Boardroom Insights...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex min-h-screen items-center justify-center bg-app-bg">
            <div className="glass p-8 border-rose-500/20 text-center">
                <p className="text-rose-500 font-bold mb-4">Integrity Breach: {error}</p>
                <button onClick={refresh} className="btn-premium">Retry Sync</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-app-bg text-app-text p-8 transition-colors duration-500 selection:bg-indigo-500/30">
            <Head>
                <title>Executive Strategic Hub | IT Insights</title>
            </Head>

            {/* Header Section */}
            <header className="flex items-center justify-between mb-12 animate-in fade-in duration-1000">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-app-text uppercase">Executive Hub</h1>
                    <p className="text-app-text-muted mt-1 font-medium opacity-60">Real-time enterprise health & risk assessment</p>
                </div>
                <div className="flex items-center gap-6">
                    <button 
                        onClick={refresh} 
                        className="p-3 glass-interactive rounded-2xl text-app-text hover:text-primary transition-all group"
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-700"} />
                    </button>
                    <div className="flex items-center gap-4 p-1 pl-4 glass rounded-full border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">System Root</span>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 border border-white/10">
                            <User size={20} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Hero Section: Health Gauge */}
                <section className="lg:col-span-1 flex flex-col items-center justify-center glass p-8">
                    <HealthGauge score={data.health_index} />
                    <div className="mt-8 grid grid-cols-3 gap-4 w-full text-center">
                        <div className="p-3 glass-interactive rounded-2xl">
                            <span className="block text-[9px] font-black text-app-text-muted uppercase tracking-tighter mb-1">Security</span>
                            <span className="font-bold text-emerald-500 text-sm">{data.scores.security}%</span>
                        </div>
                        <div className="p-3 glass-interactive rounded-2xl">
                            <span className="block text-[9px] font-black text-app-text-muted uppercase tracking-tighter mb-1">Ops</span>
                            <span className="font-bold text-primary text-sm">{data.scores.operations}%</span>
                        </div>
                        <div className="p-3 glass-interactive rounded-2xl">
                            <span className="block text-[9px] font-black text-app-text-muted uppercase tracking-tighter mb-1">Finance</span>
                            <span className="font-bold text-amber-500 text-sm">{data.scores.financial}%</span>
                        </div>
                    </div>
                </section>

                {/* KPI Overview */}
                <section className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <MetricCard 
                        title="Critical Vulnerabilities" 
                        value={data.kpis.critical_vulnerabilities} 
                        icon={Shield} 
                        trend="down" 
                        trendValue="-12%" 
                        color="emerald" 
                        delay={100}
                    />
                    <MetricCard 
                        title="Mean Time To Resolve" 
                        value={`${data.kpis.avg_mttr_hours}h`} 
                        icon={Activity} 
                        trend="down" 
                        trendValue="-2.4h" 
                        color="blue" 
                        delay={200}
                    />
                    <MetricCard 
                        title="Total Fleet Spend" 
                        value={`$${(data.kpis.total_spend/1000).toFixed(1)}k`} 
                        icon={DollarSign} 
                        trend="up" 
                        trendValue="+4.1%" 
                        color="amber" 
                        delay={300}
                    />
                </section>

                {/* Innovation Layer & Intelligence */}
                <section className="lg:col-span-2 flex flex-col gap-8 animate-in slide-in-from-bottom-8 duration-1000">
                    <StrategicAdvisor data={data} />
                </section>

                {/* Segment Audit & Organizational Intelligence */}
                <section className="lg:col-span-2 flex flex-col gap-8">
                     <AssetDistribution 
                        distribution={data.asset_distribution} 
                        statusDistribution={data.status_distribution} 
                    />
                </section>

                <section className="lg:col-span-2 flex flex-col gap-8">
                    <DepartmentalOverview analytics={data.departmental_analytics} />
                </section>

                <section className="lg:col-span-4">
                     <FinancialRiskPanel upcomingRenewals={data.kpis.upcoming_renewals} />
                </section>
            </main>

            {/* Footer Telemetry Marquee */}
            <footer className="mt-12 glass border-app-border relative h-10 w-full flex items-center overflow-hidden">
                <div className="absolute inset-0 bg-neutral-900/5 dark:bg-black/20" />
                <div className="flex whitespace-nowrap animate-marquee relative z-10">
                    <span className="mx-12 text-[9px] font-black text-app-text lowercase tracking-[0.4em] flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Scanning Segment 4 - Node Integrity Verified
                    </span>
                    <span className="mx-12 text-[9px] font-black text-rose-500 lowercase tracking-[0.4em] flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        Unauthorized Access Attempt Logged - Blocked
                    </span>
                    <span className="mx-12 text-[9px] font-black text-app-text lowercase tracking-[0.4em] flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        Strategic Sync Mode v4.2 Active
                    </span>
                    <span className="mx-12 text-[9px] font-black text-app-text-muted lowercase tracking-[0.2em] opacity-40">
                         Autonomous IT Financial & Risk Intelligence Node • {new Date().toLocaleDateString()}
                    </span>
                </div>
                {/* Secondary Marquee for seamless loop */}
                <div className="flex whitespace-nowrap animate-marquee2 absolute top-0 relative z-10">
                   <span className="mx-12 text-[9px] font-black text-app-text lowercase tracking-[0.4em] flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Scanning Segment 4 - Node Integrity Verified
                    </span>
                    <span className="mx-12 text-[9px] font-black text-rose-500 lowercase tracking-[0.4em] flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        Unauthorized Access Attempt Logged - Blocked
                    </span>
                    <span className="mx-12 text-[9px] font-black text-app-text lowercase tracking-[0.4em] flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        Strategic Sync Mode v4.2 Active
                    </span>
                    <span className="mx-12 text-[9px] font-black text-app-text-muted lowercase tracking-[0.2em] opacity-40">
                         Autonomous IT Financial & Risk Intelligence Node • {new Date().toLocaleDateString()}
                    </span>
                </div>
            </footer>

            <style jsx global>{`
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                }
                .animate-marquee2 {
                    animation: marquee2 40s linear infinite;
                }
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                @keyframes marquee2 {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(0%); }
                }
                main section::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
                    background-size: 24px 24px;
                    opacity: 0.3;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
}
