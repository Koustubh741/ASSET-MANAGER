import React, { useState, useEffect } from 'react';
import {
    Monitor, Layers, Globe, Shield, HelpCircle, HardDrive, Cpu, Wifi, Lock,
    Mail, Printer, ShieldCheck, ShoppingCart, Smartphone, Clock, CheckCircle2,
    Activity, PieChart, Target, Zap, Server, Database, Bug, Users
} from 'lucide-react';
import { Card, Typography, Progress, Space, Tag } from 'antd';
import apiClient from '../../lib/apiClient';

const { Title, Text } = Typography;

// Icon mapping for dynamic Lucide icon resolution
const ICON_MAP = {
    Monitor, Layers, Globe, Shield, HelpCircle, HardDrive, Cpu, Wifi, Lock,
    Mail, Printer, ShieldCheck, ShoppingCart, Smartphone, Clock, CheckCircle2,
    Server, Database, Bug, Activity, PieChart, Target, Zap, Users
};

const DEFAULT_COLOR = '#64748b';
const FALLBACK_ICON = HelpCircle;

export default function TicketCategorySummary({ stats, loading: parentLoading }) {
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const data = await apiClient.getCategoryConfigs();
                const configMap = {};
                data.forEach(c => {
                    configMap[c.name] = {
                        icon: ICON_MAP[c.icon_name] || FALLBACK_ICON,
                        color: c.color || DEFAULT_COLOR,
                        bgColor: c.bg_color || 'bg-slate-500/20',
                        borderColor: c.border_color || 'group-hover:border-slate-500/30'
                    };
                });
                setConfigs(configMap);
            } catch (err) {
                console.error("Failed to fetch category configs, using fallbacks:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfigs();
    }, []);

    if (parentLoading || loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <Card key={i} loading className="rounded-2xl border-slate-100 border-app-border shadow-sm" />
                ))}
            </div>
        );
    }

    if (!stats || stats.length === 0) {
        return (
            <Card className="rounded-[2rem] border-slate-100 border-app-border shadow-sm p-8 text-center bg-app-surface-soft">
                <Text className="text-app-text-muted italic font-medium">No neural classification data streaming...</Text>
            </Card>
        );
    }

    // Helper to get styling for a category (Static Fallback -> DB -> Smart Match -> Uncategorized)
    const getStyle = (categoryName) => {
        if (configs[categoryName]) return configs[categoryName];

        // Hardcoded fallbacks for core categories if DB is empty
        const hardcoded = {
            'Hardware': { icon: HardDrive, color: '#f43f5e', bgColor: 'bg-rose-500/20', borderColor: 'group-hover:border-rose-500/30' },
            'Software': { icon: Cpu, color: '#3b82f6', bgColor: 'bg-blue-500/20', borderColor: 'group-hover:border-blue-500/30' },
            'Network': { icon: Wifi, color: '#34d399', bgColor: 'bg-emerald-500/20', borderColor: 'group-hover:border-emerald-500/30' },
            'Security': { icon: ShieldCheck, color: '#fbbf24', bgColor: 'bg-amber-500/20', borderColor: 'group-hover:border-amber-500/30' },
            'HR & Finance': { icon: Users, color: '#a78bfa', bgColor: 'bg-purple-500/20', borderColor: 'group-hover:border-purple-500/30' },
            'Procurement': { icon: ShoppingCart, color: '#22d3ee', bgColor: 'bg-cyan-500/20', borderColor: 'group-hover:border-cyan-500/30' },
            'Other': { icon: HelpCircle, color: '#94a3b8', bgColor: 'bg-slate-500/20', borderColor: 'group-hover:border-slate-500/30' }
        };

        if (hardcoded[categoryName]) return hardcoded[categoryName];

        // Smart Match Fallback
        const lower = categoryName.toLowerCase();
        if (lower.includes('cloud') || lower.includes('aws')) return { icon: Globe, color: '#38bdf8', bgColor: 'bg-sky-500/20', borderColor: 'group-hover:border-sky-500/30' };
        if (lower.includes('database') || lower.includes('sql')) return { icon: Database, color: '#f59e0b', bgColor: 'bg-amber-500/20', borderColor: 'group-hover:border-amber-500/30' };
        if (lower.includes('server')) return { icon: Server, color: '#8b5cf6', bgColor: 'bg-violet-500/20', borderColor: 'group-hover:border-violet-500/30' };

        return { icon: HelpCircle, color: '#64748b', bgColor: 'bg-slate-500/20', borderColor: 'group-hover:border-slate-500/30' };
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map((stat) => {
                const config = getStyle(stat.category);
                const Icon = config.icon;
                const openPercentage = stat.total > 0 ? (stat.open / stat.total) * 100 : 0;

                return (
                    <Card
                        key={stat.category}
                        className={`relative rounded-[2.5rem] border-app-border transition-all duration-700 group overflow-hidden 
                                    hover:-translate-y-2 hover:scale-[1.02] bg-white dark:bg-slate-900 border-2 ${config.borderColor}`}
                        styles={{ body: { padding: '24px' } }}
                    >
                        {/* High-Reflect Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1500 ease-in-out pointer-events-none" />

                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-6">
                                <div className={`p-4 rounded-[1.25rem] ${config.bgColor} border border-white border-app-border transition-all duration-700 shadow-none group-hover:bg-opacity-40`}>
                                    <Icon size={24} style={{ color: config.color }} />
                                </div>
                                <div className="max-w-[180px]">
                                    <Title level={4} className="!m-0 !text-lg font-black text-app-text font-['Outfit'] uppercase tracking-tight leading-none mb-1 truncate">
                                        {stat.category}
                                    </Title>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/20" />
                                        <Text className="text-[11px] text-app-text-muted font-black uppercase tracking-[0.25em]">
                                            {stat.total} Nodes Detected
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                                <div className="flex flex-col gap-1">
                                    <span className="text-app-text-muted">Live Queue</span>
                                    <Space size={8} className="flex items-center">
                                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                                        <Text className="text-app-text text-xs">Open Status</Text>
                                    </Space>
                                </div>
                                <div className="text-xl font-black text-slate-950 text-app-text font-['Outfit']">{stat.open}</div>
                            </div>

                            <div className="relative h-2 bg-app-surface-soft rounded-full overflow-hidden border border-slate-200/50 border-app-border p-0.5">
                                <div
                                    className={`h-full transition-all duration-1500 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-full`}
                                    style={{
                                        width: `${Math.max(2, openPercentage)}%`,
                                        backgroundColor: config.color
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 mt-2 border-t border-slate-100 border-app-border">
                                <div className="group/pending transition-all duration-300">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.3em]">Pending</div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-app-surface-soft text-amber-500 border border-slate-200/50 border-app-border">
                                                <Clock size={14} />
                                            </div>
                                            <div className="text-lg font-black text-app-text font-['Outfit']">{stat.pending}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-l border-slate-100 border-app-border pl-4 group/resolved transition-all duration-300">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.3em]">Resolved</div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-app-surface-soft text-emerald-500 border border-slate-200/50 border-app-border">
                                                <CheckCircle2 size={14} />
                                            </div>
                                            <div className="text-lg font-black text-app-text font-['Outfit']">{stat.resolved}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Matrix Integration */}
                            <div className="pt-6 mt-2 space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-app-text-muted">
                                    <span>Reliability Index</span>
                                    <span className={stat.reliability_score > 7 ? 'text-rose-500' : stat.reliability_score > 4 ? 'text-amber-500' : 'text-emerald-500'}>
                                        {stat.reliability_score > 7 ? 'HIGH RISK' : stat.reliability_score > 4 ? 'VULNERABLE' : 'STABLE'}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-app-surface-soft rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${stat.reliability_score > 7 ? 'bg-rose-500' : stat.reliability_score > 4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${stat.reliability_score * 10}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-app-text-muted uppercase tracking-widest">MTTR (Avg)</span>
                                        <span className="text-xs font-black text-app-text font-['Outfit']">{stat.mttr_hours}h</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black text-app-text-muted uppercase tracking-widest">Top Impact</span>
                                        <span className="text-xs font-black text-indigo-400 font-['Outfit'] truncate max-w-[80px]">
                                            {stat.department_impact?.[0]?.department || 'None'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-dashed border-app-border flex justify-between items-center group/cost">
                                    <Text className="text-[8px] font-black text-app-text-muted uppercase tracking-[0.2em]">Estimated TCO Impact</Text>
                                    <Tag className="!m-0 !border-0 bg-white dark:bg-slate-950 text-app-text font-black text-[9px] px-2 py-0.5 rounded-md">
                                        ${stat.estimated_cost?.toLocaleString()}
                                    </Tag>
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
