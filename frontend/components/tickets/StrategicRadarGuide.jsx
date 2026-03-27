import React from 'react';
import { X, Shield, Activity, Zap, CreditCard, CheckCircle, LifeBuoy, Pointer, Battery, RefreshCw, GraduationCap } from 'lucide-react';

const PILLARS = [
    { 
        id: 'Security', 
        icon: <Shield size={18} />, 
        color: 'text-blue-500',
        desc: 'Measures overall system hardening and threat posture. Baseline stability adjusted by real-time compliance health.' 
    },
    { 
        id: 'Infrastructure', 
        icon: <Activity size={18} />, 
        color: 'text-cyan-500',
        desc: 'Backend backbone stability. High-fidelity metrics reflecting the uptime and structural health of core assets.' 
    },
    { 
        id: 'Velocity', 
        icon: <Zap size={18} />, 
        color: 'text-amber-500', 
        desc: 'Delivery speed of service. Calculated as the inverse of current departmental load and backlog volume.' 
    },
    { 
        id: 'Cost Eff.', 
        icon: <CreditCard size={18} />, 
        color: 'text-emerald-500',
        desc: 'Optimization mapping. Higher scores indicate optimized resource allocation at >90% compliance thresholds.' 
    },
    { 
        id: 'Compliance', 
        icon: <CheckCircle size={18} />, 
        color: 'text-indigo-500',
        desc: 'Direct SLA performance. The primary KPI for meeting service level agreements across all ticket categories.' 
    },
    { 
        id: 'Reliability', 
        icon: <LifeBuoy size={18} />, 
        color: 'text-red-500',
        desc: 'Operational resilience. Penalized by critical P0/P1 blockers; measures system consistency.' 
    },
    { 
        id: 'Agility', 
        icon: <Pointer size={18} />, 
        color: 'text-purple-500',
        desc: 'Automation efficacy. Driven by the percentage of requests successfully handled via automated deflection.' 
    },
    { 
        id: 'Endurance', 
        icon: <Battery size={18} />, 
        color: 'text-orange-500',
        desc: 'Long-term capacity. Evaluates remaining operational runway before system stress impacts service.' 
    },
    { 
        id: 'Durability', 
        icon: <RefreshCw size={18} />, 
        color: 'text-rose-500',
        desc: 'Recovery speed. Weighted inverse of Mean Time To Resolve (MTTR) across the active horizon.' 
    },
    { 
        id: 'Aptitude', 
        icon: <GraduationCap size={18} />, 
        color: 'text-violet-500',
        desc: 'Organizational maturity. A hybrid metric reflecting institutional knowledge and process integration.' 
    }
];

const StrategicRadarGuide = ({ onClose }) => {
    return (
        <div className="absolute inset-0 z-[100] backdrop-blur-2xl bg-app-bg p-8 flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-light tracking-widest text-app-text uppercase">Strategic Intelligence Guide</h3>
                    <p className="text-[10px] text-app-text-muted font-mono tracking-widest uppercase mt-1">Understanding the 10 Performance Pillars</p>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-app-text-muted hover:text-app-text"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PILLARS.map(p => (
                        <div key={p.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`${p.color} p-2 rounded-lg bg-current/10 group-hover:scale-110 transition-transform`}>
                                    {p.icon}
                                </div>
                                <span className="font-black text-[12px] tracking-widest uppercase text-app-text">
                                    {p.id}
                                </span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-app-text-muted opacity-80 pl-11">
                                {p.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-[10px] text-app-text-muted font-mono uppercase tracking-[0.2em]">
                <span>System Version 5.2 // Strategic Horizon: Active</span>
                <span className="opacity-50">Data Refresh: Standard Scoped Service</span>
            </div>
        </div>
    );
};

export default StrategicRadarGuide;
