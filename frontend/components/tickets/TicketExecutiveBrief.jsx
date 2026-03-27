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
            <div className="glass p-8 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-app-text flex items-center gap-2">
                            <Activity size={16} className="text-primary animate-pulse" />
                            Operational Pulse
                        </h4>
                        <p className="text-[9px] text-app-text-muted font-black uppercase tracking-widest mt-1 opacity-60">7-Day Incident Velocity</p>
                    </div>
                </div>

                <div className="flex items-end gap-1 h-24 mb-4">
                    {Object.entries(summary.volume_trend || {}).map(([date, count], i) => {
                        const max = Math.max(...Object.values(summary.volume_trend || { 1: 1 }));
                        const height = (count / (max || 1)) * 100;
                        return (
                            <div key={date} className="flex-1 group/bar relative h-full flex items-end">
                                <div 
                                    className="w-full bg-primary/20 group-hover/bar:bg-primary/40 rounded-t-lg transition-all duration-1000 ease-out border-t border-primary/30"
                                    style={{ 
                                        height: `${Math.max(height, 5)}%`,
                                        transitionDelay: `${i * 50}ms`
                                    }}
                                />
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                        {count}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="flex justify-between items-center text-[8px] font-black text-app-text-muted uppercase tracking-widest opacity-40">
                    <span>{Object.keys(summary.volume_trend || {})[0]}</span>
                    <span>System Stability: Nominal</span>
                    <span>Today</span>
                </div>
            </div>
        </div>
    );
};

export default memo(TicketExecutiveBrief);
