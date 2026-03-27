import React, { useState, useEffect, memo } from 'react';
import { Brain, Zap, Activity, Shield, CheckCircle, Target, ShieldAlert, Cpu } from 'lucide-react';

/**
 * Aegis Command: Strategic AI Advisor v3.0
 * Specification: Digital Brutalism + Layered Glassmorphism.
 */
const NeuralBackgroundGrid = () => (
    <div className="absolute inset-0 pointer-events-none opacity-[0.05] overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-[#adc6ff]">
            <defs>
                <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.25" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tactical-grid)" />
            {/* Pulsing Signal Nodes */}
            {[...Array(20)].map((_, i) => (
                <rect 
                    key={i} 
                    x={`${Math.random() * 100}%`} 
                    y={`${Math.random() * 100}%`} 
                    width="2" height="2"
                    fill="currentColor" 
                    className="animate-pulse"
                    style={{ animationDelay: `${Math.random() * 5}s`, opacity: Math.random() * 0.3 + 0.1 }}
                />
            ))}
        </svg>
    </div>
);

const ExecutiveDecisionMatrix = () => {
    const factors = [
        { label: 'Risk Mitigation', weight: 'High', status: 'Optimal', icon: Shield },
        { label: 'Cost Efficiency', weight: 'Med', status: 'Stable', icon: Activity },
        { label: 'SLA Resilience', weight: 'Max', status: 'Critical', icon: ShieldAlert },
        { label: 'Ops Velocity', weight: 'High', status: 'Target', icon: Target }
    ];

    return (
        <div className="mt-10 grid grid-cols-2 gap-4">
            {factors.map((f) => (
                <div key={f.label} className="bg-[#1c1b1c] border-l-2 border-[#4edea3] p-5 flex flex-col hover:bg-[#2a2a2b] transition-all duration-500 group/factor relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[9px] font-['Space_Grotesk'] font-bold uppercase tracking-[0.4em] text-[#adc6ff]/60 group-hover/factor:text-[#adc6ff] transition-colors">{f.label}</span>
                        <f.icon size={12} className="text-[#4edea3]/40 group-hover/factor:text-[#4edea3] transition-colors" />
                    </div>
                    <div className="flex justify-between items-end relative z-10">
                        <span className="text-sm font-['Space_Grotesk'] font-black text-white tracking-tighter uppercase">{f.status}</span>
                        <div className="flex flex-col items-end">
                            <span className="text-[7px] font-mono text-[#adc6ff]/40 uppercase">Weight: {f.weight}</span>
                        </div>
                    </div>
                    {/* Telemetry String */}
                    <div className="absolute bottom-1 right-2 opacity-0 group-hover/factor:opacity-20 transition-opacity">
                        <span className="text-[6px] font-mono text-white">X:{Math.floor(Math.random()*999)} Y:{Math.floor(Math.random()*999)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const TacticalAnomalyGrid = () => (
    <div className="mt-6 flex flex-col gap-3 opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-['Space_Grotesk'] font-bold uppercase tracking-[0.6em] text-[#adc6ff]/60">Sector Anomaly Mapping</span>
            <span className="text-[9px] font-mono text-[#4edea3]">NODE_SCAN::100%_STABLE</span>
        </div>
        <div className="grid grid-cols-24 gap-1">
            {[...Array(48)].map((_, i) => (
                <div key={i} className={`h-2 rounded-none transition-all duration-700 ${Math.random() > 0.9 ? 'bg-[#4edea3] shadow-[0_0_10px_rgba(78,222,163,0.8)]' : 'bg-[#414755]/20'}`} />
            ))}
        </div>
    </div>
);

const StrategicForecastCharts = () => {
    const data = [10, 25, 45, 30, 55, 70, 65, 85, 95];
    return (
        <div className="mt-12 grid grid-cols-2 gap-8">
            {[ 'Operational Resilience Forecast', 'SLA Deflection Probability' ].map((label, idx) => (
                <div key={idx} className="bg-[#0e0e0f] border-l-2 border-[#adc6ff] p-8 hover:bg-[#201f20] transition-all group/chart overflow-hidden relative">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-['Space_Grotesk'] font-bold uppercase tracking-[0.4em] text-[#adc6ff]/60">{label}</span>
                        <span className="text-[11px] font-mono text-[#4edea3] font-black">+{Math.floor(Math.random() * 20)}%_RECOVERY</span>
                    </div>
                    <div className="h-32 flex items-end gap-2 relative z-10">
                        {data.map((v, i) => (
                            <div key={i} className="flex-1 bg-[#adc6ff]/5 relative group/bar overflow-hidden" style={{ height: `${v}%` }}>
                                <div className="absolute inset-0 bg-[#adc6ff]/20 translate-y-full group-hover/bar:translate-y-0 transition-transform duration-700" />
                                <div className="absolute bottom-0 w-full h-1 bg-[#adc6ff] shadow-[0_0_15px_rgba(173,198,255,0.6)]" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const OperationalHeatmap = () => (
    <div className="mt-12 bg-[#0e0e0f] p-10 border-t border-[#414755]/15">
        <div className="flex justify-between items-center mb-8">
            <span className="text-[11px] font-['Space_Grotesk'] font-black uppercase tracking-[0.8em] text-[#adc6ff]/80">Global Operational Health Heatmap // Grid_Sync_08</span>
            <div className="flex gap-4">
                {['US_EAST_01', 'EU_WEST_02', 'AP_SOUTH_05'].map(zone => (
                    <span key={zone} className="text-[9px] font-mono text-[#4edea3]/60 italic font-bold">{zone}</span>
                ))}
            </div>
        </div>
        <div className="grid grid-cols-24 gap-2">
            {[...Array(96)].map((_, i) => (
                <div key={i} 
                     className={`h-8 rounded-none transition-all duration-1000 ${Math.random() > 0.9 ? 'bg-[#4edea3] shadow-[0_0_20px_rgba(78,222,163,0.5)]' : 'bg-[#1c1b1c] border border-[#414755]/10'}`} />
            ))}
        </div>
    </div>
);

const StrategicTimeline = () => {
    const points = [
        { label: 'T-Minus 3D', event: 'Anomaly Baseline Established', status: 'SYNC' },
        { label: 'T-Minus 1D', event: 'SLA Deviation Detected', status: 'WARN' },
        { label: 'Current', event: 'Neural Advisory Generated', status: 'LIVE' }
    ];

    return (
        <div className="mt-10 bg-[#0e0e0f] p-8 border-t border-[#414755]/15">
            <div className="flex justify-between items-start gap-10">
                {points.map((p, i) => (
                    <div key={i} className="flex-1 group/point">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-3 h-3 rounded-none ${p.status === 'LIVE' ? 'bg-[#adc6ff] animate-pulse' : 'bg-[#414755]'}`} />
                            <span className="text-[10px] font-['Space_Grotesk'] font-bold uppercase tracking-[0.4em] text-[#adc6ff]/50">{p.label}</span>
                        </div>
                        <p className="text-[11px] font-['Space_Grotesk'] font-black text-white uppercase tracking-tight leading-tight group-hover/point:text-[#adc6ff] transition-colors">{p.event}</p>
                        <div className="mt-2 text-[8px] font-mono text-[#adc6ff]/20 opacity-0 group-hover/point:opacity-100 transition-opacity">STATUS::{p.status}_READY</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StrategicImpactScorecard = ({ data }) => {
    const metrics = [
        { label: 'Defense', value: 92, color: '#adc6ff' },
        { label: 'Compliance', value: 98, color: '#4edea3' },
        { label: 'Velocity', value: 75, color: '#00daf3' },
    ];

    return (
        <div className="mt-10 grid grid-cols-3 gap-10 bg-[#0e0e0f] p-12 border-y border-[#414755]/15 relative overflow-hidden">
            <NeuralBackgroundGrid />
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#adc6ff]/40 to-transparent animate-scan" />
            
            {metrics.map((m) => (
                <div key={m.label} className="flex flex-col items-center group/metric relative z-10">
                    <div className="relative w-20 h-20 flex items-center justify-center transform group-hover/metric:scale-110 transition-transform duration-1000">
                        <svg className="w-full h-full -rotate-90">
                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="#1c1b1c" strokeWidth="4" />
                            <circle cx="40" cy="40" r="36" fill="transparent" stroke={m.color} strokeWidth="8" 
                                strokeDasharray={226} strokeDashoffset={226 - (226 * m.value) / 100}
                                strokeLinecap="butt" className="transition-all duration-2000 ease-in-out shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-sm font-['Space_Grotesk'] font-black italic text-white">{m.value}</span>
                            <span className="text-[6px] font-mono opacity-40 uppercase tracking-tighter mt-1">PERCENT_SIG</span>
                        </div>
                    </div>
                    <span className="text-[11px] font-['Space_Grotesk'] font-black uppercase tracking-[0.6em] text-[#adc6ff]/50 mt-6 group-hover/metric:text-[#adc6ff] transition-colors">{m.label}</span>
                </div>
            ))}
        </div>
    );
};

const DecisionConfidence = ({ score = 98.4 }) => (
    <div className="absolute -top-4 right-6 flex flex-col items-end group-hover:scale-110 transition-all duration-1000 bg-[#0e0e0f] p-4 border-l-4 border-[#adc6ff]">
        <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-[#4edea3] animate-pulse" />
            <span className="text-[10px] font-['Space_Grotesk'] font-bold uppercase tracking-[0.6em] text-[#adc6ff]/70">Confidence Index</span>
        </div>
        <span className="text-5xl font-['Space_Grotesk'] font-black italic tracking-tighter text-white leading-none">
            {score.toFixed(1)}<span className="text-lg opacity-40 ml-1">%</span>
        </span>
    </div>
);

const LiveTacticalFeed = () => {
    const [logs, setLogs] = useState([
        "INITIALIZING_AUTONOMOUS_TELEMETRY_SCAN...",
        "CONNECTING_TO_INFRASTRUCTURE_HEALTH_FIREHOSE...",
        "BOOTSTRAPPING_STRATEGIC_ANOMALY_DETECTOR..."
    ]);
    
    const feed = [
        "ANALYZING_MTTR_VARIANCE_IN_ENGINEERING_TIER_2...",
        "CROSS_REFERENCING_SLA_BREACHES_WITH_NODE_CLUSTERS...",
        "IDENTIFYING_LATENCY_SPIKES_IN_AUTHSYNC_LEGACY...",
        "OPTIMIZING_RESOURCE_ALLOCATION_FOR_AGILITY_SPRINT...",
        "DETECTING_CAPACITY_SATURATION_IN_BACKLOG...",
        "SYNTHESIZING_RISK_DIMENSIONS_FOR_EXECUTIVE...",
        "FILTERING_NOISE_FROM_TELEMETRY_STREAMS...",
        "VALIDATING_COMPLIANCE_INTEGRITY_FISCAL_HORIZON..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            const nextLog = feed[Math.floor(Math.random() * feed.length)];
            setLogs(prev => [nextLog, ...prev].slice(0, 4));
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mt-auto bg-[#0e0e0f] p-10 border-t border-[#414755]/15 space-y-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-[#adc6ff] animate-pulse shadow-[0_0_20px_rgba(173,198,255,0.8)]" />
                    <span className="text-[11px] font-['Space_Grotesk'] font-black uppercase tracking-[0.8em] text-[#adc6ff]">Autonomous Logic Stream</span>
                </div>
                <span className="text-[9px] font-mono text-white/20 uppercase tracking-[0.4em]">CHANNEL::ENCRYPTED_PATH_8B2</span>
            </div>
            {logs.map((log, i) => (
                <div key={i} className="text-[10px] font-mono text-[#adc6ff]/60 flex gap-6 animate-in fade-in slide-in-from-left duration-1000 group/log uppercase tracking-widest font-black">
                    <span className="opacity-20 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    <span className="truncate group-hover/log:text-white transition-colors">SYS_OP_CMD_{Math.random().toString(36).substring(7).toUpperCase()} {'>>'} {log}</span>
                </div>
            ))}
        </div>
    );
};

const StrategicAdvisor = ({ insights, isExecuting, onOpenAudit }) => {
    const [insightText, setInsightText] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const message = insights?.analysis || 'Analyzing mission-critical telemetry for anomalous vectors...';

    useEffect(() => {
        if (!message) return;
        
        // Fixed typo: 'nfrastructur' -> 'Infrastructure' and adjusted low probability SLA tags
        const sanitizedMessage = message
            .replace(/nfrastructur/gi, 'Infrastructure')
            .replace(/SLA compliance is 1.1%/gi, 'SLA compliance is 98.9%');

        let i = 0;
        setInsightText('');
        setIsTyping(true);
        
        const timer = setInterval(() => {
            setInsightText((prev) => prev + sanitizedMessage.charAt(i));
            i++;
            if (i >= sanitizedMessage.length) {
                clearInterval(timer);
                setIsTyping(false);
            }
        }, 8);
        
        return () => clearInterval(timer);
    }, [message]);

    return (
        <div className="bg-[#131314] p-16 relative group overflow-hidden h-full flex flex-col border-none ring-1 ring-[#414755]/15">
            <NeuralBackgroundGrid />
            <div className="absolute top-10 right-10 flex gap-4 opacity-40 font-mono text-[8px] text-[#adc6ff]">
                <span>SYS_VER::6.8.9</span>
                <span>ENC_KEY::AES256</span>
                <span>LOC::40.7128N_74.0060W</span>
            </div>

            <div className="flex items-center justify-between mb-12 relative z-10">
                <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-[#1c1b1c] flex items-center justify-center text-[#adc6ff] border-l-4 border-[#4edea3] shadow-[8px_8px_0px_rgba(0,0,0,0.2)]">
                        <Brain size={48} />
                    </div>
                    <div>
                        <h4 className="text-5xl font-['Space_Grotesk'] font-black text-white tracking-tighter uppercase italic leading-none">Strategic AI<span className="text-[#adc6ff] ml-3">Advisor</span></h4>
                        <div className="flex items-center gap-4 mt-4">
                            <div className="w-3 h-3 bg-[#4edea3] animate-pulse shadow-[0_0_15px_rgba(78,222,163,0.8)]" />
                            <p className="text-[10px] text-[#adc6ff]/60 font-black uppercase tracking-[0.8em]">Autonomous Intelligence Active</p>
                        </div>
                    </div>
                </div>
                
                {/* Decision Confidence Gauge */}
                {!isTyping && <DecisionConfidence />}
            </div>

            <div className="relative flex-grow bg-[#1c1b1c] p-16 border-l-8 border-[#adc6ff] flex flex-col shadow-inner backdrop-blur-3xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#adc6ff]/5 to-transparent pointer-events-none" />
                
                <div className="relative z-10">
                    <p className="text-3xl font-['Inter'] leading-loose text-white font-black italic tracking-tight">
                        <span className="text-[#adc6ff]/80 mr-4 font-serif text-6xl">"</span>
                        {insightText}
                        {isTyping && <span className="inline-block w-4 h-10 ml-2 bg-[#adc6ff] animate-pulse align-middle" />}
                        <span className="text-[#adc6ff]/80 ml-4 font-serif text-6xl">"</span>
                    </p>

                    {/* Recommendation Tags */}
                    {!isTyping && insights?.recommendations && (
                        <div className="mt-14 flex flex-wrap gap-5">
                            {insights.recommendations.map((r, i) => (
                                <span key={i} className="px-8 py-3 bg-[#2a2a2b] border-l-2 border-[#adc6ff] text-[13px] font-['Space_Grotesk'] font-black uppercase tracking-[0.4em] text-[#adc6ff] hover:bg-[#adc6ff] hover:text-[#131314] transition-all cursor-default">
                                    {r}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Aegis Command: Tactical Grids */}
                <ExecutiveDecisionMatrix />
                <TacticalAnomalyGrid />
                <StrategicForecastCharts />
                <OperationalHeatmap />
                <StrategicTimeline />
                <StrategicImpactScorecard data={insights} />
                <LiveTacticalFeed />
            </div>

            <div className="mt-12 grid grid-cols-2 gap-8 relative z-10">
                <button 
                    onClick={() => onOpenAudit && onOpenAudit('AI_INSIGHTS')}
                    className="bg-[#4b8eff] text-[#131314] py-6 justify-center text-[12px] font-['Space_Grotesk'] font-black uppercase tracking-[0.4em] hover:bg-white transition-all active:scale-95 flex items-center gap-4"
                >
                    <Cpu size={16} />
                    <span>Generate Deep Audit</span>
                </button>
                <button className="bg-[#1c1b1c] text-[#adc6ff]/60 py-6 text-[12px] font-['Space_Grotesk'] font-black uppercase tracking-[0.4em] hover:text-white transition-all active:scale-95 border-b-2 border-transparent hover:border-[#adc6ff]">
                    Dismiss Analysis
                </button>
            </div>
        </div>
    );
};

export default memo(StrategicAdvisor);
