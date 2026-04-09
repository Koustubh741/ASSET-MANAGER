import React, { memo } from 'react';

/**
 * Premium SVG Health Gauge Component.
 * Features dynamic gradients, glow effects, and pulse animations.
 */
const HealthGauge = ({ score }) => {
    const radius = 75;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    
    let colorClass = "from-app-secondary to-app-cyan";
    let glowColor = "var(--color-kinetic-secondary-rgb)"; // We use RGBA in the style filter
    if (score < 60) {
        colorClass = "from-app-rose to-app-rose-soft";
        glowColor = "var(--color-kinetic-rose-rgb)";
    } else if (score < 80) {
        colorClass = "from-app-gold to-app-gold-soft";
        glowColor = "var(--color-kinetic-gold-rgb)";
    }

    return (
        <div className="relative flex items-center justify-center h-56 w-56 animate-in zoom-in duration-1000">
            {/* Background Glow */}
            <div className={`absolute inset-10 rounded-full blur-[60px] opacity-20 bg-gradient-to-tr ${colorClass}`} />
            
            <svg className="h-full w-full rotate-[-90deg] drop-shadow-[0_0_15px_rgba(0,0,0,0.1)]">
                <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: score < 60 ? 'var(--color-kinetic-rose)' : score < 80 ? 'var(--color-kinetic-gold)' : 'var(--color-kinetic-secondary)' }} />
                        <stop offset="100%" style={{ stopColor: score < 60 ? 'var(--color-kinetic-rose-soft)' : score < 80 ? 'var(--color-kinetic-gold-soft)' : 'var(--color-kinetic-cyan)' }} />
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
                    style={{ filter: `drop-shadow(0 0 12px rgba(${glowColor}, 0.5))` }}
                />
            </svg>
            <div className="absolute flex flex-col items-center group cursor-help">
                <span className="text-5xl font-['Outfit'] font-black text-app-text tracking-tighter group-hover:scale-110 transition-transform duration-500">{score}%</span>
                <span className="text-[10px] uppercase font-black tracking-[0.4em] text-app-text-muted mt-2 opacity-60">Status: Optimal</span>
                <div className="mt-4 flex gap-1.5">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`w-2 h-2 rounded-none ${i <= (score/33) ? 'bg-app-primary' : 'bg-app-border-soft'} animate-pulse`} style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(HealthGauge);
