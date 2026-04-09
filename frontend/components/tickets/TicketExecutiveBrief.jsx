import React, { memo } from 'react';
import { ShieldAlert, Zap, Clock, TrendingUp, Activity } from 'lucide-react';
import MetricCard from '../executive/MetricCard';

/**
 * TicketExecutiveBrief Component
 * High-level operational excellence metrics for the CEO.
 */
const TicketExecutiveBrief = ({ summary }) => {
    if (!summary) return null;

    const metrics = [
        {
            title: "SLA Compliance",
            value: `${summary.compliance_rate}%`,
            icon: ShieldAlert,
            trend: summary.compliance_rate >= 90 ? "up" : "down",
            trendValue: `${summary.total_met} Met`,
            color: summary.compliance_rate >= 90 ? "emerald" : "rose",
            delay: 100
        },
        {
            title: "Mean Time To Resolution",
            value: `${summary.avg_mttr_hours}h`,
            icon: Zap,
            trend: "down",
            trendValue: "-12% Velocity",
            color: "indigo",
            delay: 200
        },
        {
            title: "Executive Blockers",
            value: summary.critical_blockers,
            icon: Clock,
            trend: summary.critical_blockers > 5 ? "up" : "down",
            trendValue: "Active High",
            color: summary.critical_blockers > 5 ? "rose" : "amber",
            delay: 300
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Main Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((m, i) => (
                    <MetricCard key={m.title} {...m} />
                ))}
            </div>

            {/* Strategic Volume Pulse */}
            <div className="bg-app-void border border-app-border p-10 relative overflow-hidden group">
                <div className="kinetic-scan-line" />
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-[0.3em] text-app-text flex items-center gap-3 italic">
                            <Activity size={18} className="text-app-primary animate-pulse" />
                            Operational Pulse // Tactical Uplink
                        </h4>
                        <p className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.4em] mt-2 opacity-40">Frequency Discovery Matrix // 7-Day Velocity</p>
                    </div>
                    <div className="px-3 py-1 bg-app-primary/10 border border-app-primary/30 rounded-none">
                         <span className="text-[9px] font-black text-app-primary uppercase tracking-widest leading-none">Real-Time Data</span>
                    </div>
                </div>

                <div className="flex items-end gap-1.5 h-32 mb-6">
                    {Object.entries(summary.volume_trend || {}).map(([date, count], i) => {
                        const max = Math.max(...Object.values(summary.volume_trend || { 1: 1 }));
                        const height = (count / (max || 1)) * 100;
                        return (
                            <div key={date} className="flex-1 group/bar relative h-full flex items-end">
                                <div 
                                    className="w-full bg-app-primary/20 group-hover/bar:bg-app-primary transition-all duration-700 ease-out border-t border-app-primary/40 relative overflow-hidden"
                                    style={{ 
                                        height: `${Math.max(height, 5)}%`,
                                        transitionDelay: `${i * 50}ms`
                                    }}
                                >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                                </div>
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-all group-hover/bar:-top-12 z-20">
                                    <span className="text-[9px] font-black text-white bg-app-obsidian px-3 py-1.5 rounded-none border border-app-primary shadow-[0_0_15px_rgba(var(--color-app-primary-rgb),0.5)]">
                                        {count} PKTS
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="flex justify-between items-center text-[9px] font-black text-app-text-muted uppercase tracking-[0.3em] opacity-40 mt-4">
                    <span>{Object.keys(summary.volume_trend || {})[0]}</span>
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-app-secondary rounded-none" /> System Stability: High_Efficiency</span>
                    <span>Synchronized_Grid</span>
                </div>
            </div>
        </div>
    );
};

export default memo(TicketExecutiveBrief);
