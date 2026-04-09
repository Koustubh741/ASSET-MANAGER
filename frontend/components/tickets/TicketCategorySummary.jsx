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

const DEFAULT_COLOR = 'var(--text-muted)';
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
                        bgColor: c.bg_color || 'bg-app-surface-soft',
                        borderColor: c.border_color || 'group-hover:border-app-border'
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
                    <Card key={i} loading className="rounded-none border-app-border bg-app-void shadow-none" />
                ))}
            </div>
        );
    }

    if (!stats || stats.length === 0) {
        return (
            <Card className="rounded-none border-app-border shadow-none p-10 text-center bg-app-void relative overflow-hidden">
                <div className="kinetic-scan-line" />
                <Text className="text-app-text-muted italic font-black uppercase tracking-widest text-[10px] opacity-30">No neural categorization streams detected...</Text>
            </Card>
        );
    }

    // Helper to get styling for a category (Static Fallback -> DB -> Smart Match -> Uncategorized)
    const getStyle = (categoryName) => {
        if (configs[categoryName]) return configs[categoryName];

        // Hardcoded fallbacks for core categories if DB is empty
        const hardcoded = {
            'Hardware': { icon: HardDrive, color: 'var(--color-kinetic-rose)', bgColor: 'bg-app-rose/20', borderColor: 'group-hover:border-app-rose/30' },
            'Software': { icon: Cpu, color: 'var(--color-kinetic-primary)', bgColor: 'bg-app-primary/20', borderColor: 'group-hover:border-app-primary/30' },
            'Network': { icon: Wifi, color: 'var(--color-kinetic-secondary)', bgColor: 'bg-app-secondary/20', borderColor: 'group-hover:border-app-secondary/30' },
            'Security': { icon: ShieldCheck, color: 'var(--color-kinetic-gold)', bgColor: 'bg-app-gold/20', borderColor: 'group-hover:border-app-gold/30' },
            'HR & Finance': { icon: Users, color: 'var(--color-kinetic-cyan)', bgColor: 'bg-app-cyan/20', borderColor: 'group-hover:border-app-cyan/30' },
            'Procurement': { icon: ShoppingCart, color: 'var(--color-kinetic-cyan)', bgColor: 'bg-app-cyan/20', borderColor: 'group-hover:border-app-cyan/30' },
            'Other': { icon: HelpCircle, color: 'var(--text-muted)', bgColor: 'bg-app-surface-soft', borderColor: 'group-hover:border-app-border' }
        };

        if (hardcoded[categoryName]) return hardcoded[categoryName];

        // Smart Match Fallback
        const lower = categoryName.toLowerCase();
        if (lower.includes('cloud') || lower.includes('aws')) return { icon: Globe, color: 'var(--color-kinetic-cyan)', bgColor: 'bg-app-cyan/20', borderColor: 'group-hover:border-app-cyan/30' };
        if (lower.includes('database') || lower.includes('sql')) return { icon: Database, color: 'var(--color-kinetic-gold)', bgColor: 'bg-app-gold/20', borderColor: 'group-hover:border-app-gold/30' };
        if (lower.includes('server')) return { icon: Server, color: 'var(--color-kinetic-primary)', bgColor: 'bg-app-primary/20', borderColor: 'group-hover:border-app-primary/30' };

        return { icon: HelpCircle, color: 'var(--text-muted)', bgColor: 'bg-app-surface-soft', borderColor: 'group-hover:border-app-border' };
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
                        className={`relative rounded-none border-app-border transition-all duration-700 group overflow-hidden 
                                    hover:-translate-y-2 hover:scale-[1.02] bg-app-void border-2 ${config.borderColor}`}
                        styles={{ body: { padding: '24px' } }}
                    >
                        {/* High-Reflect Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1500 ease-in-out pointer-events-none" />

                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-6">
                                <div className={`p-4 rounded-none ${config.bgColor} border border-app-border transition-all duration-700 shadow-none group-hover:bg-opacity-40`}>
                                    <Icon size={24} style={{ color: config.color }} />
                                </div>
                                <div className="max-w-[180px]">
                                    <Title level={4} className="!m-0 !text-xl font-black text-app-text uppercase italic tracking-tighter leading-none mb-2 truncate italic">
                                        {stat.category}
                                    </Title>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-none bg-app-primary opacity-50" />
                                        <Text className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.25em] opacity-40">
                                            {stat.total} Nodes_IDD
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                                <div className="flex flex-col gap-2">
                                    <span className="text-app-text-muted opacity-40">Queue_Latency</span>
                                    <Space size={8} className="flex items-center">
                                        <div className="w-2 h-2 rounded-none bg-app-rose animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                        <Text className="text-app-text text-[10px] font-black uppercase tracking-widest">Live_Status</Text>
                                    </Space>
                                </div>
                                <div className="text-3xl font-black text-app-text italic tracking-tighter italic leading-none">{stat.open}</div>
                            </div>

                            <div className="relative h-3 bg-app-void rounded-none overflow-hidden border border-app-border p-0.5">
                                <div
                                    className={`h-full transition-all duration-1500 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-none relative`}
                                    style={{
                                        width: `${Math.max(2, openPercentage)}%`,
                                        backgroundColor: config.color
                                    }}
                                >
                                    <div className="absolute top-0 right-0 w-1 h-full bg-white opacity-40" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 mt-2 border-t border-slate-100 border-app-border">
                                <div className="group/pending transition-all duration-300">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="text-[9px] text-app-text-muted font-black uppercase tracking-[0.3em]">Pending</div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-none bg-app-surface-soft text-app-gold border border-app-border">
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
                                            <div className="p-1.5 rounded-none bg-app-surface-soft text-app-secondary border border-app-border">
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
                                    <span className={stat.reliability_score > 7 ? 'text-app-rose' : stat.reliability_score > 4 ? 'text-app-gold' : 'text-app-secondary'}>
                                        {stat.reliability_score > 7 ? 'HIGH RISK' : stat.reliability_score > 4 ? 'VULNERABLE' : 'STABLE'}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-app-surface-soft rounded-none overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${stat.reliability_score > 7 ? 'bg-app-rose' : stat.reliability_score > 4 ? 'bg-app-gold' : 'bg-app-secondary'}`}
                                        style={{ width: `${stat.reliability_score * 10}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between mt-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[8px] font-black text-app-text-muted uppercase tracking-widest opacity-40">MTTR_Vector</span>
                                        <span className="text-[11px] font-black text-app-text italic leading-none">{stat.mttr_hours}H</span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[8px] font-black text-app-text-muted uppercase tracking-widest opacity-40">Impact_Focus</span>
                                        <span className="text-[11px] font-black text-app-primary uppercase italic leading-none truncate max-w-[100px]">
                                            {stat.department_impact?.[0]?.department || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-app-border flex justify-between items-center bg-app-surface-soft/30 p-3">
                                    <Text className="text-[8px] font-black text-app-text-muted uppercase tracking-[0.3em] opacity-40">Neural_Cost_TCO</Text>
                                    <Tag className="!m-0 !border border-app-border bg-app-void text-app-text font-black text-[10px] px-3 py-1 rounded-none shadow-none">
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
