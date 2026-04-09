import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Activity, Lock, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/apiClient';

export default function SecurityWidget() {
    const [stats, setStats] = useState({
        total: 0,
        enforced: 0,
        pending: 0,
        error: 0,
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

    const fetchSecurityStats = async () => {
        setLoading(true);
        try {
            // In a real scenario, we'd have a dedicated summary endpoint.
            // For now, we fetch all policies and aggregate.
            const policies = await apiClient.getPortPolicies();
            let enforced = 0;
            let pending = 0;
            let error = 0;

            // Fetch enforcement for each policy to get a real picture
            const enforcementPromises = policies.map(p => apiClient.getPortPolicyEnforcement(p.id));
            const allEnforcements = await Promise.all(enforcementPromises);

            allEnforcements.flat().forEach(e => {
                if (e.status === 'APPLIED') enforced++;
                else if (e.status === 'ERROR' || e.status === 'FAILED') error++;
                else pending++;
            });

            setStats({
                total: policies.length,
                enforced,
                pending,
                error
            });
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Failed to fetch security stats', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSecurityStats();
        const interval = setInterval(fetchSecurityStats, 60000); // Pulse every minute
        return () => clearInterval(interval);
    }, []);

    const completionRate = stats.enforced + stats.pending + stats.error > 0
        ? Math.round((stats.enforced / (stats.enforced + stats.pending + stats.error)) * 100)
        : 100;

    return (
        <div className="relative overflow-hidden rounded-none bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-app-border p-6 shadow-2xl transition-all duration-300 hover:shadow-blue-500/10 hover:border-blue-500/30 group">
            {/* Animated Background Pulse */}
            <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-none bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/30 text-blue-400">
                            <Shield size={22} className="group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-app-text tracking-tight">Security Oversight</h3>
                            <p className="text-xs text-app-text-muted font-medium">Port Policy Enforcement</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchSecurityStats}
                        className="p-2 rounded-none bg-app-surface-soft text-app-text-muted hover:text-app-text hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-all"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-none bg-app-surface-soft border border-app-border hover:border-blue-500/20 transition-colors">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-app-text-muted mb-1">Active Policies</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-app-text">{stats.total}</span>
                            <span className="text-[10px] text-emerald-400 font-semibold">+2 today</span>
                        </div>
                    </div>
                    <div className="p-4 rounded-none bg-app-surface-soft border border-app-border hover:border-blue-500/20 transition-colors">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-app-text-muted mb-1">Compliance Rate</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-app-text">{completionRate}%</span>
                            <div className="h-1.5 w-12 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${completionRate}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between p-3 rounded-none bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <span className="text-xs font-medium text-app-text-muted">Enforced Targets</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-400">{stats.enforced}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-none bg-orange-500/5 border border-orange-500/10">
                        <div className="flex items-center gap-2">
                            <Activity size={14} className="text-orange-400" />
                            <span className="text-xs font-medium text-app-text-muted">Pending Sync</span>
                        </div>
                        <span className="text-sm font-bold text-orange-400">{stats.pending}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-none bg-rose-500/5 border border-rose-500/10">
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={14} className="text-rose-400" />
                            <span className="text-xs font-medium text-app-text-muted">Policy Conflicts</span>
                        </div>
                        <span className="text-sm font-bold text-rose-400">{stats.error}</span>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-app-border flex items-center justify-between">
                    <span className="text-[10px] text-app-text-muted font-medium italic">Last updated: {lastUpdated}</span>
                    <Link href="/security/port-policies" className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 hover:gap-2 transition-all">
                        Management Console <ExternalLink size={12} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
