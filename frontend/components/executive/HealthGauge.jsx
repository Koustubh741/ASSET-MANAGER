import React, { memo } from 'react';

/**
 * Premium SVG Health Gauge Component.
 * Features dynamic gradients, glow effects, and pulse animations.
 */
const HealthGauge = ({ score }) => {
    const radius = 75;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    
    let colorClass = "from-emerald-600 to-emerald-400";
    let glowColor = "rgba(16,185,129,0.3)";
    if (score < 60) {
        colorClass = "from-rose-600 to-rose-400";
        glowColor = "rgba(244,63,94,0.3)";
    } else if (score < 80) {
        colorClass = "from-amber-600 to-amber-400";
        glowColor = "rgba(245,158,11,0.3)";
    }

    return (
        <div className="relative flex items-center justify-center h-56 w-56 animate-in zoom-in duration-1000">
            {/* Background Glow */}
            <div className={`absolute inset-10 rounded-full blur-[60px] opacity-20 bg-gradient-to-tr ${colorClass}`} />
            
            <svg className="h-full w-full rotate-[-90deg] drop-shadow-[0_0_15px_rgba(0,0,0,0.1)]">
                <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: score < 60 ? '#f43f5e' : score < 80 ? '#f59e0b' : '#10b981' }} />
                        <stop offset="100%" style={{ stopColor: score < 60 ? '#fb7185' : score < 80 ? '#fbbf24' : '#2dd4bf' }} />
                    </linearGradient>
                </defs>
                <circle
                    className="stroke-app-border-soft"
                    strokeWidth="14"
                    fill="transparent"
                    r={radius}
                    cx="112"
                    cy="112"
                />
                <circle
                    stroke="url(#gaugeGradient)"
                    strokeWidth="14"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx="112"
                    cy="112"
                    className="transition-all duration-[2000ms] ease-out"
                    style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
                />
            </svg>
            <div className="absolute flex flex-col items-center group cursor-help">
                <span className="text-5xl font-['Outfit'] font-black text-app-text tracking-tighter group-hover:scale-110 transition-transform duration-500">{score}%</span>
                <span className="text-[10px] uppercase font-black tracking-[0.4em] text-app-text-muted mt-2 opacity-60">Status: Optimal</span>
                <div className="mt-4 flex gap-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= (score/33) ? 'bg-indigo-500' : 'bg-app-border'} animate-pulse`} style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(HealthGauge);
