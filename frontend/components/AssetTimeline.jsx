
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
import { ZenithCard, ZenithBadge, ZenithButton } from './common/ZenithUI';

const STAGES = [
    { label: 'Created', icon: Search, type: 'CREATED', color: 'var(--primary)', description: 'Genesis point' },
    { label: 'Discovered', icon: Server, type: 'DISCOVERED', color: 'var(--primary-soft)', description: 'Network identified' },
    { label: 'Assigned', icon: User, type: 'ASSIGNMENT', color: 'var(--secondary)', description: 'Custody established' },
    { label: 'Maintenance', icon: Wrench, type: 'MAINTENANCE', color: '#f59e0b', description: 'Health optimization' },
    { label: 'Retired', icon: Trash2, type: 'SOFT_DELETED', color: '#f43f5e', description: 'End of cycle' }
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
            case 'CREATED': return 'text-primary';
            case 'ASSIGNMENT': return 'text-secondary';
            case 'MAINTENANCE': return 'text-amber-500';
            case 'STATUS_CHANGE': return 'text-cyan-400';
            case 'DISCOVERED': return 'text-primary/70';
            case 'SOFT_DELETED': return 'text-rose-500';
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
        <div className="p-24 flex flex-col justify-center items-center relative overflow-hidden glass-zenith rounded-none">
            <div className="absolute inset-0 z-0 opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[120px] rounded-none animate-pulse"></div>
            </div>
            <div className="relative z-10 space-y-8 flex flex-col items-center">
                <div className="relative w-20 h-20">
                    <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/10" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="60 180" className="text-primary" strokeLinecap="square" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu size={24} className="text-primary animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-primary/80 mb-2">Syncing Zenith Core</h3>
                    <p className="text-[9px] text-app-text-muted font-bold tracking-widest uppercase">Fetching Temporal Asset Data</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full space-y-12 animate-in fade-in zoom-in-95 duration-1000">
            {/* --- ZENITH STAGE MONITOR --- */}
            <div className="relative px-8 py-12 glass-zenith rounded-none overflow-hidden group/header">
                {/* Background Glows */}
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 blur-[100px] rounded-full group-hover/header:bg-primary/20 transition-all duration-1000"></div>
                <div className="absolute top-1/2 -right-32 -translate-y-1/2 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full"></div>

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
                                    <div className={`relative w-16 h-16 rounded-none flex items-center justify-center transition-all duration-500 border-2 ${
                                        isCurrent ? 'bg-app-bg border-primary shadow-[0_0_30px_var(--primary-glow)] scale-110' :
                                        isCompleted ? 'bg-primary/5 border-primary/20 text-primary' :
                                        'bg-app-surface/50 border-app-border text-app-text-muted hover:bg-app-surface'
                                        } ${isFiltered ? 'scale-110 !border-white shadow-[0_0_40px_rgba(255,255,255,0.2)]' : ''}`}>

                                        {isCurrent && (
                                            <div className="absolute -inset-2 border border-primary/20 rounded-none animate-ping opacity-20"></div>
                                        )}

                                        <Icon size={22} className={`transition-all duration-500 ${isCurrent ? 'text-primary' : isCompleted ? 'text-primary/70' : 'opacity-30'}`} />

                                        {/* Status Glow */}
                                        {isCurrent && <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-10 h-1 bg-primary blur-sm rounded-none"></div>}
                                    </div>

                                    {/* Stage Labeling */}
                                    <div className="mt-6 text-center">
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                                            isCurrent ? 'text-app-text' : isCompleted ? 'text-app-text-muted' : 'text-app-text-muted/40'
                                            }`}>
                                            {stage.label}
                                        </p>
                                    </div>

                                    {isFiltered && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <ZenithBadge active className="text-[8px] whitespace-nowrap">FILTER ACTIVE</ZenithBadge>
                                        </div>
                                    )}
                                </div>

                                {idx < STAGES.length - 1 && (
                                    <div className="flex-1 h-[2px] mx-8 relative overflow-hidden bg-app-border rounded-none max-w-[100px]">
                                        <div
                                            className={`absolute inset-0 transition-all duration-1000 ${
                                                idx < currentStageIndex ? 'bg-gradient-to-r from-primary/50 to-primary' : 'bg-transparent'
                                                }`}
                                        ></div>
                                        {isCurrent && (
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="h-full w-4 bg-primary/40 blur-[4px] animate-pulse-flow"></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* --- ZENITH NEURAL FLOW TIMELINE --- */}
            <div className="relative pl-14 pr-4 py-4 min-h-[500px]">
                {/* The "Neural" Flow Path */}
                <div className="absolute left-[27px] top-0 bottom-0 w-[2px]">
                    <div className="absolute inset-0 bg-app-surface-soft overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent"></div>
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-transparent via-primary to-transparent animate-neural-flow-1 opacity-40"></div>
                        <div className="absolute top-1/2 left-0 w-full h-32 bg-gradient-to-b from-transparent via-secondary to-transparent animate-neural-flow-2 opacity-30"></div>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes neural-flow-1 { 0% { transform: translateY(-200%); } 100% { transform: translateY(500%); } }
                    @keyframes neural-flow-2 { 0% { transform: translateY(0%); } 100% { transform: translateY(800%); } }
                    @keyframes pulse-flow { 0% { transform: translateX(0%); opacity: 0.2; } 50% { transform: translateX(400%); opacity: 0.8; } 100% { transform: translateX(800%); opacity: 0.2; } }
                    @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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
                                    className={`absolute -left-[44px] top-4 w-10 h-10 flex items-center justify-center rounded-none border transition-all duration-500 z-10 cursor-pointer backdrop-blur-3xl shadow-2xl ${isSelected
                                            ? 'bg-primary border-primary shadow-[0_0_30px_var(--primary-glow)] scale-110'
                                            : 'bg-app-bg border-app-border'
                                        }`}
                                    onClick={() => setSelectedId(isSelected ? null : event.id)}
                                >
                                    <div className={`${isSelected ? 'text-white' : eventColor}`}>
                                        {getIcon(event.type)}
                                    </div>
                                    <div className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-4 h-[1px] bg-app-border group-hover:bg-primary transition-all duration-500"></div>
                                </div>

                                {/* Zenith Event Card */}
                                <div
                                    className={`relative ml-4 transition-all duration-700 rounded-none p-10 cursor-pointer border shadow-2xl overflow-hidden glass-zenith ${isSelected
                                            ? 'border-primary/40 bg-primary/5'
                                            : 'border-app-border/40 hover:bg-app-surface/60'
                                        }`}
                                    onClick={() => setSelectedId(isSelected ? null : event.id)}
                                >
                                    <div className="absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                    <div className="flex flex-col lg:flex-row justify-between gap-10 relative z-10">
                                        <div className="space-y-5 max-w-2xl">
                                            <div className="flex items-center gap-5">
                                                <ZenithBadge active={isSelected} className={eventColor}>{event.type}</ZenithBadge>
                                                <h4 className="text-xl font-black text-app-text tracking-tighter uppercase">
                                                    {event.title}
                                                </h4>
                                            </div>

                                            <p className="text-sm text-app-text-muted leading-relaxed font-medium italic opacity-80">
                                                {event.description}
                                            </p>

                                            <div className="flex items-center gap-8 pt-4">
                                                <div className="flex items-center gap-3 group/performer">
                                                    <div className="w-10 h-10 rounded-none bg-app-bg border border-app-border flex items-center justify-center overflow-hidden">
                                                        <User size={16} className="text-app-text-muted group-hover/performer:text-primary transition-colors" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest opacity-60">Initiator</span>
                                                        <span className="text-xs text-app-text font-black uppercase">{event.performer || 'System Core'}</span>
                                                    </div>
                                                </div>

                                                <div className="h-10 w-[1px] bg-app-border/40"></div>

                                                <div className="flex items-center gap-3">
                                                    <History size={16} className="text-app-text-muted" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-app-text-muted uppercase tracking-widest opacity-60">Sequence ID</span>
                                                        <span className="text-xs text-primary font-mono font-black">
                                                            {event.id?.slice(0, 8).toUpperCase() || 'ROOT-SYNC'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end lg:justify-between h-full pt-1">
                                            <div className="flex flex-col items-end space-y-3">
                                                <div className="flex items-center gap-3 px-5 py-3 glass-zenith border-app-border/40 rounded-none shadow-sm transition-all group-hover:border-primary/20">
                                                    <Calendar size={14} className="text-app-text-muted" />
                                                    <span className="text-xs font-black text-app-text-muted uppercase tracking-widest">
                                                        {new Date(event.timestamp).toLocaleString([], {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>

                                            {event.changes && event.changes.length > 0 && isSelected && (
                                                <div className="mt-8 lg:mt-0 p-6 glass-zenith border-emerald-500/20 rounded-none animate-digitize w-full lg:w-[320px]">
                                                    <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Parameter Delta</h5>
                                                    <div className="space-y-4">
                                                        {event.changes.map((change, i) => (
                                                            <div key={i} className="space-y-2">
                                                                <p className="text-[10px] text-app-text-muted font-bold uppercase tracking-tight">{change.field}</p>
                                                                <div className="flex items-center justify-between text-xs font-mono">
                                                                    <span className="text-app-text-muted/60 truncate max-w-[100px] line-through">{change.old}</span>
                                                                    <ArrowRightCircle size={10} className="text-emerald-500 flex-shrink-0" />
                                                                    <span className="text-emerald-400 font-bold truncate max-w-[100px]">{change.new}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_20px_var(--primary-glow)] animate-pulse"></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredEvents.length === 0 && (
                        <div className="py-32 flex flex-col items-center animate-in fade-in duration-1000">
                             <h3 className="text-xs font-black text-app-text-muted uppercase tracking-[0.4em]">Intelligence Void</h3>
                            <ZenithButton 
                                onClick={() => setFilterStage(null)}
                                className="mt-8 px-12"
                            >
                                Recalibrate Sensory Filter
                            </ZenithButton>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssetTimeline;
