
import React, { useEffect, useState, useMemo } from 'react';
import {
    Activity,
    User,
    Server,
    Shield,
    CheckCircle,
    Calendar,
    Search,
    Wrench,
    AlertCircle,
    Trash2,
    Edit3,
    ArrowRightCircle,
    Fingerprint,
    Cpu,
    CpuIcon,
    Layers,
    History,
    Network
} from 'lucide-react';
import apiClient from '@/lib/apiClient';

const STAGES = [
    { label: 'Created', icon: Search, type: 'CREATED', color: 'var(--color-kinetic-primary)', description: 'Genesis point' },
    { label: 'Discovered', icon: Server, type: 'DISCOVERED', color: 'var(--color-kinetic-primary-soft)', description: 'Network identified' },
    { label: 'Assigned', icon: User, type: 'ASSIGNMENT', color: 'var(--color-kinetic-secondary)', description: 'Custody established' },
    { label: 'Maintenance', icon: Wrench, type: 'MAINTENANCE', color: 'var(--color-kinetic-gold)', description: 'Health optimization' },
    { label: 'Retired', icon: Trash2, type: 'SOFT_DELETED', color: 'var(--color-kinetic-rose)', description: 'End of cycle' }
];

const AssetTimeline = ({ assetId }) => {
    const [data, setData] = useState({ events: [], stats: {}, current_stage: 'Created' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [filterStage, setFilterStage] = useState(null);

    useEffect(() => {
        if (!assetId) return;
        const fetchTimeline = async () => {
            try {
                const response = await apiClient.get(`/assets/${assetId}/timeline`);
                setData(response);
            } catch (err) {
                console.error("Failed to fetch timeline:", err);
                setError("Terminal: Lifecycle intelligence link severed.");
            } finally {
                setLoading(false);
            }
        };
        fetchTimeline();
    }, [assetId]);

    const getIcon = (type) => {
        switch (type) {
            case 'CREATED': return <Fingerprint size={16} />;
            case 'ASSIGNMENT': return <User size={16} />;
            case 'MAINTENANCE': return <Wrench size={16} />;
            case 'STATUS_CHANGE': return <Activity size={16} />;
            case 'DISCOVERED': return <Server size={16} />;
            case 'SOFT_DELETED': return <Trash2 size={16} />;
            default: return <Edit3 size={16} />;
        }
    };

    const getEventColor = (type) => {
        switch (type) {
            case 'CREATED': return 'text-app-primary';
            case 'ASSIGNMENT': return 'text-app-secondary';
            case 'MAINTENANCE': return 'text-app-gold';
            case 'STATUS_CHANGE': return 'text-app-cyan';
            case 'DISCOVERED': return 'text-app-primary-soft';
            case 'SOFT_DELETED': return 'text-app-rose';
            default: return 'text-app-text-muted';
        }
    };

    const filteredEvents = useMemo(() => {
        if (!filterStage) return data.events;
        const stageType = STAGES.find(s => s.label === filterStage)?.type;
        return data.events.filter(e => e.type === stageType);
    }, [data.events, filterStage]);

    const currentStageIndex = STAGES.findIndex(s => s.label === data.current_stage);

    if (loading) return (
        <div className="p-24 flex flex-col justify-center items-center relative overflow-hidden bg-app-void rounded-none border border-app-border">
            <div className="absolute inset-0 z-0 opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-app-primary/20 blur-[120px] rounded-none animate-pulse"></div>
            </div>
            <div className="relative z-10 space-y-8 flex flex-col items-center">
                <div className="relative w-20 h-20">
                    <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" className="text-app-primary/10" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="60 180" className="text-app-primary" strokeLinecap="square" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu size={24} className="text-app-primary animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-blue-500/80 mb-2">Syncing Neural Core</h3>
                    <p className="text-[9px] text-app-text-muted font-bold tracking-widest uppercase">Fetching Temporal Asset Data</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full space-y-12 animate-in fade-in zoom-in-95 duration-1000">
            {/* --- HYPER-PREMIUM STAGE MONITOR --- */}
            <div className="relative px-8 py-10 bg-app-surface backdrop-blur-3xl border border-app-border rounded-[3rem] overflow-hidden group/header">
                {/* Parallax Background Orbs */}
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full group-hover/header:bg-blue-500/20 transition-all duration-1000"></div>
                <div className="absolute top-1/2 -right-32 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full"></div>

                <div className="flex justify-between items-center relative z-10 max-w-5xl mx-auto">
                    {STAGES.map((stage, idx) => {
                        const isCompleted = idx <= currentStageIndex;
                        const isCurrent = idx === currentStageIndex;
                        const Icon = stage.icon;
                        const isFiltered = filterStage === stage.label;

                        return (
                            <React.Fragment key={stage.label}>
                                <div
                                    className="flex flex-col items-center cursor-pointer relative group/stage"
                                    onClick={() => setFilterStage(isFiltered ? null : stage.label)}
                                >
                                    {/* Stage Indicator */}
                                    <div className={`relative w-14 h-14 rounded-none flex items-center justify-center transition-all duration-500 border-2 ${isCurrent ? 'bg-app-obsidian border-app-primary shadow-[0_0_30px_rgba(var(--color-kinetic-primary-rgb),0.3)] scale-110' :
                                            isCompleted ? 'bg-app-secondary/10 border-app-secondary/30 text-app-secondary' :
                                                'bg-app-void border-app-border text-app-text-muted hover:bg-app-obsidian'
                                        } ${isFiltered ? 'scale-110 !border-app-text shadow-[0_0_40px_rgba(255,255,255,0.2)]' : ''}`}>

                                        {isCurrent && (
                                            <div className="absolute -inset-1 border border-app-primary/30 rounded-none animate-ping opacity-20"></div>
                                        )}

                                        <Icon size={20} className={`transition-all duration-500 ${isCurrent ? 'text-app-primary' : isCompleted ? 'text-app-secondary' : 'text-slate-700'}`} />

                                        {/* Status Glow */}
                                        {isCurrent && <div className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-8 h-1 bg-app-primary blur-sm rounded-none"></div>}
                                    </div>

                                    {/* Stage Labeling */}
                                    <div className="mt-5 text-center">
                                        <p className={`text-[10px] font-black uppercase tracking-[0.1em] transition-colors ${isCurrent ? 'text-app-text' : isCompleted ? 'text-app-text-muted' : 'text-app-text-muted'
                                            }`}>
                                            {stage.label}
                                        </p>
                                        <p className="text-[8px] text-app-text-muted font-medium tracking-tight mt-0.5 opacity-0 group-hover/stage:opacity-100 transition-opacity">
                                            {stage.description}
                                        </p>
                                    </div>

                                    {isFiltered && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                            <div className="text-[8px] font-black text-app-primary bg-app-primary/10 border border-app-primary/20 px-2 py-0.5 rounded-none whitespace-nowrap">
                                                FILTER ACTIVE
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {idx < STAGES.length - 1 && (
                                    <div className="flex-1 h-[2px] mx-6 relative overflow-hidden bg-app-border rounded-none max-w-[80px]">
                                        <div
                                            className={`absolute inset-0 transition-all duration-1000 ${idx < currentStageIndex ? 'bg-gradient-to-r from-app-secondary to-app-primary' :
                                                    'bg-transparent'
                                                }`}
                                        ></div>
                                        {isCurrent && (
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="h-full w-4 bg-app-text/20 blur-[4px] animate-pulse-flow"></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* --- DATA-FLOW TIMELINE BODY --- */}
            <div className="relative pl-14 pr-4 py-4 min-h-[500px]">
                {/* The "Neural" Flow Path */}
                <div className="absolute left-[27px] top-0 bottom-0 w-[2px]">
                    <div className="absolute inset-0 bg-app-surface overflow-hidden">
                        {/* Static Path Background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>

                        {/* Moving Pulse Packets */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-transparent via-blue-500 to-transparent animate-neural-flow-1 opacity-40"></div>
                        <div className="absolute top-1/2 left-0 w-full h-32 bg-gradient-to-b from-transparent via-emerald-500 to-transparent animate-neural-flow-2 opacity-30"></div>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes neural-flow-1 {
                        0% { transform: translateY(-200%); }
                        100% { transform: translateY(500%); }
                    }
                    @keyframes neural-flow-2 {
                        0% { transform: translateY(0%); }
                        100% { transform: translateY(800%); }
                    }
                    @keyframes pulse-flow {
                        0% { transform: translateX(0%); opacity: 0.2; }
                        50% { transform: translateX(400%); opacity: 0.8; }
                        100% { transform: translateX(800%); opacity: 0.2; }
                    }
                    @keyframes spin-slow {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .animate-neural-flow-1 { animation: neural-flow-1 8s linear infinite; }
                    .animate-neural-flow-2 { animation: neural-flow-2 12s linear infinite; }
                    .animate-pulse-flow { animation: pulse-flow 2s ease-in-out infinite; }
                    .animate-spin-slow { animation: spin-slow 10s linear infinite; }
                `}</style>

                <div className="grid gap-12">
                    {filteredEvents.map((event, index) => {
                        const isSelected = selectedId === event.id;
                        const eventColor = getEventColor(event.type);

                        return (
                            <div
                                key={event.id || index}
                                className={`relative group transition-all duration-700 animate-in slide-in-from-left-8 fade-in`}
                                style={{ animationDelay: `${index * 150}ms` }}
                            >
                                {/* Neural Node Marker */}
                                <div
                                    className={`absolute -left-[44px] top-2 w-10 h-10 flex items-center justify-center rounded-none border transition-all duration-500 z-10 cursor-pointer backdrop-blur-3xl shadow-2xl ${isSelected
                                            ? 'bg-app-primary border-app-primary shadow-[0_0_30px_rgba(var(--color-kinetic-primary-rgb),0.5)] scale-110'
                                            : 'bg-app-obsidian border-app-border'
                                        }`}
                                    onClick={() => setSelectedId(isSelected ? null : event.id)}
                                >
                                    <div className={`${isSelected ? 'text-app-void' : eventColor}`}>
                                        {getIcon(event.type)}
                                    </div>

                                    {/* Connecting Wire Line */}
                                    <div className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-4 h-[1px] bg-app-border group-hover:bg-app-primary transition-all duration-500"></div>
                                </div>

                                {/* Intelligent Event Card */}
                                <div
                                    className={`relative ml-4 transition-all duration-700 rounded-none p-8 cursor-pointer border shadow-2xl overflow-hidden ${isSelected
                                            ? 'bg-app-primary/5 border-app-primary'
                                            : 'bg-app-void border-app-border hover:bg-app-obsidian'
                                        }`}
                                    onClick={() => setSelectedId(isSelected ? null : event.id)}
                                >
                                    {/* Hover Interactive Scan Effect */}
                                    <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-app-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                    <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                                        <div className="space-y-4 max-w-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-none border border-app-border bg-app-obsidian ${eventColor}`}>
                                                    {event.type}
                                                </div>
                                                <h4 className="text-lg font-black text-app-text tracking-tighter uppercase font-['Space_Grotesk']">
                                                    {event.title}
                                                </h4>
                                            </div>

                                            <p className="text-sm text-app-text-muted leading-relaxed font-medium">
                                                {event.description}
                                            </p>

                                            <div className="flex items-center gap-6 pt-2">
                                                <div className="flex items-center gap-2 group/performer">
                                                    <div className="w-8 h-8 rounded-none bg-app-obsidian border border-app-border flex items-center justify-center overflow-hidden">
                                                        <User size={14} className="text-app-text-muted group-hover/performer:text-app-primary transition-colors" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-app-text-muted uppercase tracking-widest">Initiator</span>
                                                        <span className="text-[11px] text-app-text font-black uppercase">{event.performer || 'System Core'}</span>
                                                    </div>
                                                </div>

                                                <div className="h-6 w-[1px] bg-app-surface-soft"></div>

                                                <div className="flex items-center gap-2">
                                                    <History size={14} className="text-app-text-muted" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-app-text-muted uppercase tracking-widest">Telemetry Count</span>
                                                        <span className="text-[11px] text-app-primary font-mono font-black">
                                                            {data.stats[event.type] || 0} SEGM
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end lg:justify-between h-full pt-1">
                                            <div className="flex flex-col items-end space-y-2">
                                                <div className="flex items-center gap-2 px-4 py-2 bg-app-surface-soft border border-app-border rounded-none shadow-sm dark:shadow-inner">
                                                    <Calendar size={12} className="text-app-text-muted" />
                                                    <span className="text-[11px] font-bold text-app-text-muted">
                                                        {new Date(event.timestamp).toLocaleString([], {
                                                            weekday: 'short',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Advanced Data Diffs Overlay */}
                                            {event.changes && event.changes.length > 0 && isSelected && (
                                                <div className="mt-6 lg:mt-0 p-4 bg-app-surface-soft border border-emerald-500/20 rounded-none animate-in zoom-in-95 duration-500 w-full lg:w-[280px]">
                                                    <h5 className="text-[9px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-3">Parameter delta</h5>
                                                    <div className="space-y-3">
                                                        {event.changes.map((change, i) => (
                                                            <div key={i} className="space-y-1">
                                                                <p className="text-[10px] text-app-text-muted font-bold">{change.field}</p>
                                                                <div className="flex items-center justify-between text-[11px] font-mono">
                                                                    <span className="text-app-text-muted/80 truncate max-w-[80px]">{change.old}</span>
                                                                    <ArrowRightCircle size={10} className="text-emerald-500 flex-shrink-0" />
                                                                    <span className="text-emerald-400 font-black truncate max-w-[80px]">{change.new}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hologram Pulse Line for Selection */}
                                    {isSelected && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-app-primary shadow-[0_0_15px_rgba(var(--color-kinetic-primary-rgb),0.8)] animate-pulse"></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredEvents.length === 0 && (
                        <div className="py-32 flex flex-col items-center animate-in fade-in duration-1000">
                            <div className="relative mb-8">
                                <Network size={64} className="text-app-text-muted absolute -inset-1 blur-md opacity-20" />
                                <Network size={64} className="text-app-text-muted opacity-20" />
                            </div>
                            <h3 className="text-xs font-black text-app-text-muted uppercase tracking-[0.4em]">Intelligence Void</h3>
                            <p className="text-[10px] text-app-text-muted font-bold mt-2 uppercase tracking-tightest">No data mapped to {filterStage} stage</p>
                            <button
                                onClick={() => setFilterStage(null)}
                                className="mt-8 px-10 py-3 rounded-none bg-app-primary/10 border border-app-primary/20 text-[10px] font-black uppercase tracking-[0.4em] text-app-primary hover:bg-app-primary hover:text-app-void transition-all duration-500"
                            >
                                Recalibrate Sensory Filter
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssetTimeline;
