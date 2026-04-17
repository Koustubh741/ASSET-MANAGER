import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3-force';
import { 
    X, Shield, Zap, Target, Activity, Monitor, 
    Lock, PieChart, Cpu, Terminal, ChevronRight, 
    ArrowRight, CheckCircle, Smartphone, Boxes, Globe,
    Server, CreditCard, AlertTriangle, Search, Radio, Users, Database
} from 'lucide-react';

const CAPABILITIES = {
    'IT': [
        { title: 'System Topology', desc: 'Real-time mapping of hardware & virtual network nodes.', icon: Globe },
        { title: 'Asset Lifecycle', desc: 'Automated tracking from procurement to decommissioning.', icon: Boxes },
        { title: 'Automation Engine', desc: 'Proactive incident resolution and patch deployment.', icon: Activity }
    ],
    'F&A': [
        { title: 'Fiscal Governance', desc: 'Enterprise-grade financial scoping and budget reconciliation.', icon: CreditCard },
        { title: 'Asset Depreciation', desc: 'Automated valuation and write-off scheduling.', icon: PieChart },
        { title: 'Audit Readiness', desc: 'Real-time compliance snapshots and historical ledger parity.', icon: Shield }
    ],
    'SCM': [
        { title: 'Logistics Hub', desc: 'Neural tracking of physical asset movements across nodes.', icon: Boxes },
        { title: 'Inventory Matrix', desc: 'Real-time parity between digital and physical stock.', icon: Target },
        { title: 'Procurement Bridge', desc: 'Synchronized ordering for rapid operational expansion.', icon: Zap }
    ]
};

const TACTICAL_MODULES = [
    { label: 'ERP_MATRIX', icon: Server, status: 'SYNCED', delay: 0 },
    { label: 'POS_BRIDGE', icon: Smartphone, status: 'ACTIVE', delay: 100 },
    { label: 'LOG_HUB', icon: Boxes, status: 'OK', delay: 200 },
    { label: 'FIN_LEDGER', icon: CreditCard, status: 'SYNCED', delay: 300 },
    { label: 'SEC_SHIELD', icon: Shield, status: 'ACTIVE', delay: 400 },
    { label: 'COMM_UNIT', icon: Radio, status: 'OK', delay: 500 },
    { label: 'DATA_NEURAL', icon: Database, status: 'SYNCED', delay: 600 },
    { label: 'ID_PORT', icon: Users, status: 'ACTIVE', delay: 700 },
];

const MatrixField = () => {
    const [elements, setElements] = useState([]);
    useEffect(() => {
        const hex = () => Math.floor(Math.random() * 0xff).toString(16).padStart(2, '0').toUpperCase();
        setElements(Array.from({ length: 120 }, () => ({
            id: Math.random(),
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            text: `${hex()}${hex()} ${hex()}`,
            delay: Math.random() * 5
        })));
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] dark:opacity-[0.07]">
            {elements.map(el => (
                <div 
                    key={el.id}
                    className="absolute font-mono text-[9px] matrix-text-ambient"
                    style={{ top: el.top, left: el.left, animationDelay: `${el.delay}s` }}
                >
                    {el.text}
                </div>
            ))}
        </div>
    );
};

const NeuralMatrix = ({ accentColor }) => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        const dots = Array.from({ length: 80 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            size: Math.random() * 2
        }));

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = accentColor === 'amber' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)';
                ctx.strokeStyle = accentColor === 'amber' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(99, 102, 241, 0.08)';

                dots.forEach((dot, i) => {
                dot.x += dot.vx;
                dot.y += dot.vy;

                if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
                if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;

                ctx.beginPath();
                ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
                ctx.fill();

                for (let j = i + 1; j < dots.length; j++) {
                    const other = dots[j];
                    const dist = Math.hypot(dot.x - other.x, dot.y - other.y);
                    if (dist < 150) {
                        ctx.lineWidth = 1 - dist / 150;
                        ctx.beginPath();
                        ctx.moveTo(dot.x, dot.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
        };
    }, [accentColor]);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40" />;
};

const NeuralCoreHub = () => (
    <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Cinematic Flare */}
        <div className="absolute inset-0 bg-primary/20 blur-[100px] animate-pulse" />
        
        {/* Kinetic HUD Rings - Interlocking */}
        <div className="absolute inset-2 rounded-full border-[3px] border-primary/40 border-t-transparent animate-[spin_8s_linear_infinite]" />
        <div className="absolute inset-6 rounded-full border border-primary/20 border-b-transparent animate-[spin_12s_linear_infinite_reverse]" />
        
        {/* Central Reactor Plate */}
        <div className="relative w-28 h-28 glass border-2 border-primary/60 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary-rgb),0.5)] z-[25]">
            <div className="absolute inset-[-10px] rounded-full border border-primary/10 animate-ping opacity-20" />
            <div className="absolute inset-4 rounded-full border border-white/10 animate-[spin_20s_linear_infinite]" />
            <Cpu size={48} className="text-app-text glow-text-primary animate-pulse" />
        </div>

        {/* Floating Protocol Data */}
        <div className="absolute -bottom-16 flex flex-col items-center gap-1 z-[25]">
            <div className="text-[14px] font-black text-app-text tracking-[0.8em] uppercase drop-shadow-2xl">Zenith <span className="text-primary tracking-[0.2em]">Protocol</span></div>
            <div className="flex items-center gap-4">
                <div className="h-px w-10 bg-primary/30" />
                <span className="text-[8px] font-mono text-primary/60 uppercase tracking-[0.4em]">Node::Stabilized</span>
                <div className="h-px w-10 bg-primary/30" />
            </div>
        </div>
    </div>
);

const GyroscopicMatrix = ({ accentColor }) => {
    const [time, setTime] = useState(0);
    const containerRef = useRef(null);
    const requestRef = useRef();

    const animate = (t) => {
        setTime(t / 1000); // Seconds
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    const modules = useMemo(() => TACTICAL_MODULES.map((mod, i) => ({
        ...mod,
        orbit: i < 4 ? 'H' : 'V',
        phase: (i % 4) * (Math.PI / 2),
        speed: 0.2 + (i * 0.05)
    })), []);

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden relative">
            <MatrixField />
            
            {/* The Gyroscopic Ribbons */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <defs>
                    <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
                        <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                <g className="opacity-30">
                    {modules.map((mod, i) => {
                        const radiusX = mod.orbit === 'H' ? 480 : 250;
                        const radiusY = mod.orbit === 'H' ? 220 : 400;
                        const x = Math.cos(time * 0.4 + mod.phase) * radiusX;
                        const y = Math.sin(time * 0.4 + mod.phase) * radiusY;
                        
                        return (
                            <line 
                                key={`ribbon-${i}`} 
                                x1="50%" y1="50%" 
                                x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`}
                                stroke="url(#ribbonGrad)" 
                                strokeWidth="4"
                                className="animate-pulse"
                            />
                        );
                    })}
                </g>
            </svg>

            <NeuralCoreHub />

            {/* Kinetic Orbital Units */}
            {modules.map((mod, i) => {
                const radiusX = mod.orbit === 'H' ? 480 : 250;
                const radiusY = mod.orbit === 'H' ? 220 : 400;
                const x = Math.cos(time * 0.4 + mod.phase) * radiusX;
                const y = Math.sin(time * 0.4 + mod.phase) * radiusY;
                const z = Math.sin(time * 0.4 + mod.phase); // Fake Z for scale
                const scale = 0.8 + (z + 1) * 0.2;
                const opacity = 0.4 + (z + 1) * 0.3;

                return (
                    <div 
                        key={mod.label}
                        className="absolute pointer-events-none will-change-transform flex flex-col items-center"
                        style={{ 
                            transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
                            opacity: opacity,
                            zIndex: z > 0 ? 30 : 5
                        }}
                    >
                        <div className="relative group pointer-events-auto cursor-crosshair">
                            {/* Scanning Satellite Unit */}
                            <div className="w-24 h-24 bg-app-bg/40 backdrop-blur-2xl border border-primary/20 flex flex-col items-center justify-center shadow-xl transition-all group-hover:scale-110 group-hover:border-primary/80">
                                <div className="absolute inset-0 border border-primary/10 animate-pulse" />
                                <mod.icon size={32} className="text-app-text/40 group-hover:text-primary transition-all duration-500" />
                                
                                <div className="absolute -bottom-10 whitespace-nowrap text-[8px] font-mono text-primary/60 uppercase tracking-widest text-center">
                                    <div className="font-black">{mod.label}</div>
                                    <div className="text-[6px] opacity-40">CALIBRATING::{mod.status}</div>
                                </div>
                            </div>

                            {/* HUD Indicators */}
                            <div className="absolute -top-4 -right-4 w-12 h-px bg-primary/40 rotate-45" />
                            <div className="absolute -bottom-4 -left-4 w-12 h-px bg-primary/40 rotate-45" />
                        </div>
                    </div>
                );
            })}

            {/* Global Telemetry HUD */}
            <div className="absolute top-8 left-10 flex flex-col gap-3 opacity-60 pointer-events-none">
                <div className="flex items-center gap-6 text-[11px] font-mono text-app-text tracking-widest">
                    <span className="text-primary font-black">[LATENCY: 2ms]</span>
                    <span className="text-primary font-black ml-4">[SYNC: 99.8%]</span>
                </div>
                <div className="h-1.5 w-60 bg-app-text/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-scanning w-1/3 shadow-[0_0_10px_var(--primary)]" />
                </div>
                <div className="text-[7px] font-mono text-app-text/40 uppercase tracking-tighter">Initializing_Departmental_Parity_Standard_V2.0.Z</div>
            </div>
            
            <div className="absolute bottom-10 right-10 text-right text-[10px] font-mono text-app-text/30 select-none space-y-1 pointer-events-none">
                <p className="flex items-center gap-2 justify-end tracking-widest">CORE_HANDSHAKE <span className="text-primary animate-pulse font-black">ACTIVE</span></p>
                <p className="opacity-60">GRID_SECTOR_16 :: UNLOCKED</p>
                <p className="opacity-40 italic">ZEN_CALIBRATION_0.98.0_RETAIL</p>
            </div>
        </div>
    );
};

const ExperienceCinematic = ({ onComplete }) => {
    const [stage, setStage] = useState(0);
    const [accentColor, setAccentColor] = useState('amber'); 

    useEffect(() => {
        const timers = [
            setTimeout(() => setStage(1), 2500), 
            setTimeout(() => setStage(2), 5500), 
            setTimeout(() => setStage(3), 9000), 
        ];
        
        // Prevent body scrolling during cinematic
        document.body.style.overflow = 'hidden';
        
        return () => {
            timers.forEach(t => clearTimeout(t));
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-app-bg zenith-vacuum flex items-center justify-center text-app-text overflow-hidden selection:bg-primary/30">
            {/* Neural Matrix Backdrop */}
            <NeuralMatrix accentColor={accentColor} />
            
            {/* Vignette Overlay (Adaptive to Theme - Strengthened for Full-Screen) */}
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-app-bg pointer-events-none z-10 opacity-80" />

            {/* Cinematic Scan Line (Global) */}
            <div className="absolute inset-x-0 h-[2px] bg-primary/20 animate-scanning shadow-[0_0_20px_var(--primary)] pointer-events-none z-50" />

            {/* Main Content Hub */}
            <div className="relative z-20 w-full max-w-7xl px-8">
                
                {/* Stage 0: Boot Sequence */}
                {stage === 0 && (
                    <div className="flex flex-col items-center gap-20 animate-pulse py-24">
                        <div className="relative">
                            <div className="absolute inset-0 blur-3xl bg-primary/30 animate-pulse" />
                            <div className="p-10 rounded-full border-2 border-primary/40 animate-spin-slow">
                                <Cpu className="w-32 h-32 text-primary relative z-10" />
                            </div>
                        </div>
                        <div className="space-y-8 text-center">
                            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-[0.6em] text-app-text-muted/40 pl-[0.6em] leading-none">Initializing</h2>
                            <p className="text-xs font-mono text-primary animate-pulse tracking-[0.8em] uppercase">Bridging_Sector_16_Protocol_v2.RET</p>
                        </div>
                    </div>
                )}

                {/* Stage 1: Identity & Role Verification */}
                {stage === 1 && (
                    <div className="max-w-4xl mx-auto space-y-20 animate-in slide-in-from-bottom duration-1000 py-12">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 text-primary mb-8">
                                <Terminal size={28} />
                                <span className="text-base font-mono tracking-[0.6em] font-black uppercase">Identity established // OK</span>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.85] drop-shadow-2xl">
                                Welcome, <br/>
                                <span className="text-primary glow-text-primary">Command Admin</span>
                            </h2>
                        </div>
                        <div className="p-12 fui-status-card max-w-3xl border-l-[8px] border-l-primary shadow-2xl transition-all hover:scale-[1.02]">
                            <p className="text-2xl text-app-text leading-relaxed font-light font-sans opacity-90">
                                Your departmental interface is being provisioned. We are calibrating the <span className="text-primary font-bold">V2 Retail Engine</span> for specialized departmental oversight.
                            </p>
                            <div className="mt-8 flex items-center gap-4 text-[10px] font-mono text-app-text-muted uppercase tracking-widest opacity-60">
                                <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                Synchronizing Sector 16 data streams...
                            </div>
                        </div>
                    </div>
                )}

                {/* Stage 2: Capability Matrix */}
                {stage === 2 && (
                    <div className="grid grid-cols-3 gap-20 animate-in zoom-in-95 duration-1000 py-12 max-w-full">
                        {Object.entries(CAPABILITIES).map(([dept, skills], i) => (
                            <div key={dept} className="group space-y-12 p-12 fui-status-card min-h-[72vh] hover:translate-y-[-10px] hover:border-primary/60 transition-all duration-700 shadow-2xl relative overflow-hidden flex flex-col justify-between" style={{ animationDelay: `${i * 200}ms` }}>
                                <div className="absolute top-0 right-0 p-6 opacity-10 font-mono text-6xl font-black select-none">{i+1}</div>
                                <div className="space-y-12">
                                <div className="flex items-center justify-between border-b border-app-text/5 pb-6">
                                    <h3 className="text-4xl font-black italic uppercase tracking-wider text-primary">{dept}</h3>
                                    <Shield className="text-primary/40" size={32} />
                                </div>
                                <div className="space-y-10">
                                    {skills.map((skill, j) => (
                                        <div key={j} className="flex gap-8 group/item">
                                            <div className="mt-1 w-12 h-12 rounded-sm glass flex items-center justify-center border border-app-text/10 text-primary group-hover/item:scale-125 group-hover/item:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] transition-all">
                                                <skill.icon size={24} />
                                            </div>
                                            <div className="space-y-3">
                                                <h4 className="font-black text-base uppercase tracking-[0.2em] group-hover/item:text-primary transition-colors">{skill.title}</h4>
                                                <p className="text-sm text-app-text-muted leading-relaxed font-medium opacity-80">{skill.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stage 3: Operational Simulation (The Neural Core) */}
                {stage === 3 && (
                    <div className="flex flex-col h-screen py-6 items-center justify-between overflow-hidden animate-in zoom-in-95 fade-in duration-1000">
                        {/* Header: Balanced Title Section */}
                        <div className="text-center space-y-2 flex-none translate-y-2">
                            <p className="text-[10px] font-mono text-primary/60 uppercase tracking-[0.4em] animate-pulse">Bridging Departmental Data Pools :: Parity Standard Stabilized</p>
                        </div>

                        {/* Middle: Dynamic Simulation Container */}
                        <div className="flex-1 w-full relative h-full flex items-center justify-center">
                             <GyroscopicMatrix accentColor={accentColor} />
                        </div>

                        {/* Footer: Compact Control Group */}
                        <div className="flex flex-col items-center gap-6 flex-none pb-14">
                            <button 
                                onClick={() => setStage(4)}
                                className="group relative px-24 py-6 bg-primary text-on-dark font-black uppercase tracking-[0.8em] overflow-hidden transition-all hover:px-32 hover:scale-110 active:scale-95 shadow-[0_20px_60px_-15px_rgba(var(--primary-rgb),0.6)] rounded-sm"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 ease-out" />
                                <span className="relative z-10 text-base">Activate Interface</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Stage 4: Ready State */}
                {stage === 4 && (
                    <div className="flex flex-col items-center gap-24 animate-in zoom-in-110 fade-in duration-1000 text-center py-10">
                        <div className="relative">
                            <div className="absolute inset-[-60px] animate-spin-slow border-2 border-dashed border-emerald-500/20 rounded-full" />
                            <div className="absolute inset-[-30px] animate-[spin_15s_linear_infinite_reverse] border border-emerald-500/10 rounded-full" />
                            <div className="w-64 h-64 rounded-full glass border border-emerald-500/40 flex items-center justify-center shadow-[0_0_120px_rgba(16,185,129,0.2)]">
                                <CheckCircle className="w-36 h-36 text-emerald-500 animate-pulse" />
                            </div>
                        </div>
                        <div className="space-y-10">
                            <h2 className="text-6xl md:text-8xl font-black text-app-text italic uppercase tracking-tighter leading-none drop-shadow-2xl">Core Ready</h2>
                            <p className="text-3xl text-app-text-muted/70 max-w-3xl mx-auto font-light leading-relaxed tracking-tight px-4">
                                The Specialized <span className="text-primary font-black uppercase">V2 Retail Command</span> interface is now fully calibrated. All cross-departmental nodes are operational.
                            </p>
                        </div>
                        <button 
                            onClick={onComplete}
                            className="group relative px-32 py-14 bg-app-text text-app-bg font-black uppercase tracking-[1em] overflow-hidden transition-all hover:px-44 hover:scale-105 shadow-[0_30px_60px_rgba(var(--primary-rgb),0.2)] active:scale-95"
                        >
                            <div className="absolute inset-0 bg-primary translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700" />
                            <span className="relative z-10 group-hover:text-on-dark transition-colors text-2xl font-black">Initialize Matrix</span>
                        </button>
                    </div>
                )}

            </div>

            {/* Premium Corner Accents */}
            <div className="absolute bottom-12 left-12 flex items-center gap-10 opacity-60 select-none">
                <div className="h-px w-32 bg-primary shadow-[0_0_15px_var(--primary)]" />
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-black text-app-text uppercase tracking-[0.4em]">Protocol V2.RET</span>
                    <span className="text-[10px] font-mono text-app-text-muted uppercase tracking-widest font-black">Auth: 0x42_ZENITH_SECURE_NODE_16</span>
                </div>
            </div>
            
            <div className="absolute top-12 right-12 flex flex-col items-end gap-2 opacity-30 select-none hidden md:flex">
                <span className="text-[14px] font-black text-app-text uppercase tracking-[0.8em] whitespace-nowrap">Command Sector 16 // ALPHA</span>
                <span className="text-[8px] font-mono text-primary px-2 border border-primary/40 uppercase">Safe_Boot_v2.0</span>
            </div>

            {/* Matrix Coordinates (Edge Polish) */}
            <div className="absolute top-[20%] right-8 font-mono text-[8px] text-white/10 vertical-rl uppercase tracking-[0.5em] hidden lg:block">
                Long: 77.5946° E // Lat: 12.9716° N // Elev: 920m
            </div>
            <div className="absolute bottom-[20%] left-8 font-mono text-[8px] text-white/10 vertical-rl uppercase tracking-[0.5em] rotate-180 hidden lg:block">
                Parity_Checksum: {Math.random().toString(16).slice(2, 10).toUpperCase()} // Node_ID: X-99
            </div>

            <style jsx>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes scanning {
                    0% { transform: translateY(-10vh); opacity: 0; }
                    50% { opacity: 0.8; }
                    100% { transform: translateY(110vh); opacity: 0; }
                }
                .animate-spin-slow {
                    animation: spin-slow 12s linear infinite;
                }
                .animate-scanning {
                    animation: scanning 5s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default ExperienceCinematic;
