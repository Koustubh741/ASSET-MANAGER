import { useState, useEffect } from 'react';
import { Clock, CheckCircle, User, Shield, AlertTriangle, Play, FilePlus, MessageSquare, Activity, Plus } from 'lucide-react';

export default function TicketTimeline({ timeline = [] }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!timeline || timeline.length === 0) return null;

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATED': return <Plus size={14} className="text-app-primary" />;
            case 'ACKNOWLEDGED': return <CheckCircle size={14} className="text-app-primary" />;
            case 'ASSIGNED': return <User size={14} className="text-app-secondary" />;
            case 'START_WORK': return <Play size={14} className="text-app-primary" />;
            case 'PROGRESS_UPDATE': return <Activity size={14} className="text-app-gold" />;
            case 'RESOLVED': return <Shield size={14} className="text-app-secondary" />;
            case 'ATTACHMENT_ADDED': return <FilePlus size={14} className="text-app-primary" />;
            case 'COMMENT_ADDED': return <MessageSquare size={14} className="text-app-text-muted" />;
            default: return <Clock size={14} className="text-app-text-muted" />;
        }
    };

    // Reverse data before mapping for cleaner JSX
    const reversedTimeline = [...timeline].reverse();

    return (
        <div className="space-y-6">
            <h3 className="text-sm font-black text-app-text uppercase italic flex items-center gap-2 tracking-[0.2em]">
                <Activity size={18} className="text-emerald-500" /> Operations Journal
            </h3>

            <div className="relative pl-10 space-y-10 before:absolute before:left-[13px] before:top-2 before:bottom-2 before:w-[1px] before:bg-app-border">
                {reversedTimeline.map((event, idx) => (
                    <div key={idx} className="relative group">
                        {/* Status Marker */}
                        <div className="absolute -left-[32px] top-1.5 w-6 h-6 rounded-none bg-app-obsidian border border-app-border flex items-center justify-center z-10 group-hover:border-app-primary transition-all group-hover:scale-110 shadow-lg">
                            {getActionIcon(event.action)}
                        </div>
                        
                        <div className="bg-app-void border border-app-border rounded-none p-6 hover:border-app-primary/30 transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 telemetry-text opacity-5">LOG_SEGMENT_v{idx}</div>
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-app-primary flex items-center gap-2">
                                    {event.action.replace('_', ' ')}
                                </span>
                                <span className="text-[9px] font-mono font-black text-app-text-muted opacity-40">
                                    {mounted ? new Date(event.timestamp).toLocaleString().toUpperCase() : ''}
                                </span>
                            </div>
                            
                            <p className="text-xs text-app-text-muted font-medium leading-relaxed mb-6 uppercase tracking-tight">
                                {event.comment}
                            </p>

                            <div className="flex items-center gap-3 pt-4 border-t border-app-border/30">
                                <div className="w-6 h-6 rounded-none bg-app-obsidian flex items-center justify-center text-app-primary/40 border border-app-border">
                                    <User size={12} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-app-text-muted">
                                    {event.byUser} <span className="text-app-primary/40 italic ml-2">[{event.byRole}]</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
