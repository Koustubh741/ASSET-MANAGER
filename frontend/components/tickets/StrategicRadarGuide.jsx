import React, { useState } from 'react';
import {
    X, Shield, Activity, Zap, CreditCard, CheckCircle,
    LifeBuoy, MousePointer2, Battery, RefreshCw, GraduationCap
} from 'lucide-react';

const PRIMARY   = 'var(--color-kinetic-primary, #6366f1)';
const SECONDARY = 'var(--color-kinetic-secondary, #22d3ee)';

const PILLARS = [
    {
        id: 'Security', icon: Shield, color: '#6366f1', glow: 'rgba(99,102,241,0.2)',
        shortcode: 'SEC',
        desc: 'Measures overall system hardening and threat posture. Baseline stability adjusted by real-time compliance health.'
    },
    {
        id: 'Infrastructure', icon: Activity, color: '#22d3ee', glow: 'rgba(34,211,238,0.2)',
        shortcode: 'INF',
        desc: 'Backend backbone stability. High-fidelity metrics reflecting the uptime and structural health of core assets.'
    },
    {
        id: 'Velocity', icon: Zap, color: '#f59e0b', glow: 'rgba(245,158,11,0.2)',
        shortcode: 'VEL',
        desc: 'Delivery speed of service. Calculated as the inverse of current departmental load and backlog volume.'
    },
    {
        id: 'Cost Eff.', icon: CreditCard, color: '#10b981', glow: 'rgba(16,185,129,0.2)',
        shortcode: 'CST',
        desc: 'Optimization mapping. Higher scores indicate optimized resource allocation at >90% compliance thresholds.'
    },
    {
        id: 'Compliance', icon: CheckCircle, color: '#818cf8', glow: 'rgba(129,140,248,0.2)',
        shortcode: 'SLA',
        desc: 'Direct SLA performance. The primary KPI for meeting service level agreements across all ticket categories.'
    },
    {
        id: 'Reliability', icon: LifeBuoy, color: '#f43f5e', glow: 'rgba(244,63,94,0.2)',
        shortcode: 'REL',
        desc: 'Operational resilience. Penalized by critical P0/P1 blockers; measures system consistency under load.'
    },
    {
        id: 'Agility', icon: MousePointer2, color: '#a855f7', glow: 'rgba(168,85,247,0.2)',
        shortcode: 'AGI',
        desc: 'Automation efficacy. Driven by the percentage of requests successfully handled via automated deflection.'
    },
    {
        id: 'Endurance', icon: Battery, color: '#f97316', glow: 'rgba(249,115,22,0.2)',
        shortcode: 'END',
        desc: 'Long-term capacity. Evaluates remaining operational runway before system stress impacts service quality.'
    },
    {
        id: 'Durability', icon: RefreshCw, color: '#fb7185', glow: 'rgba(251,113,133,0.2)',
        shortcode: 'DUR',
        desc: 'Recovery speed. Weighted inverse of Mean Time To Resolve (MTTR) across the active horizon window.'
    },
    {
        id: 'Aptitude', icon: GraduationCap, color: '#c084fc', glow: 'rgba(192,132,252,0.2)',
        shortcode: 'APT',
        desc: 'Organizational maturity. A hybrid metric reflecting institutional knowledge and process integration depth.'
    }
];

const StrategicRadarGuide = ({ onClose }) => {
    const [active, setActive] = useState(null);
    const activePillar = PILLARS.find(p => p.id === active);

    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 200,
            backdropFilter: 'blur(24px)',
            background: 'rgba(4,4,12,0.97)',
            display: 'flex', flexDirection: 'column',
            animation: 'guideIn 0.25s ease',
        }}>
            <style>{`
                @keyframes guideIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to   { opacity: 1; transform: scale(1); }
                }
                .pillar-card:hover { background: rgba(255,255,255,0.06) !important; }
            `}</style>

            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: `radial-gradient(circle, ${PRIMARY}08, transparent 70%)`, pointerEvents: 'none' }} />

            {/* ── HEADER ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
                flexShrink: 0,
            }}>
                <div>
                    <h3 style={{
                        fontSize: 15, fontWeight: 900, letterSpacing: '0.2em',
                        textTransform: 'uppercase', color: '#f1f5f9',
                        fontFamily: "'Space Grotesk', sans-serif", margin: 0,
                    }}>
                        Strategic Intelligence Guide
                    </h3>
                    <p style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.35em',
                        textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
                        margin: '5px 0 0', fontFamily: 'monospace',
                    }}>
                        10-Pillar Performance Framework // v6.8
                    </p>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* ── BODY ── */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 0 }}>

                {/* Pillar grid */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start' }}
                    className="custom-scrollbar">
                    {PILLARS.map(p => {
                        const Icon = p.icon;
                        const isActive = active === p.id;
                        return (
                            <div
                                key={p.id}
                                className="pillar-card"
                                onClick={() => setActive(isActive ? null : p.id)}
                                style={{
                                    padding: '14px 16px',
                                    background: isActive ? `${p.glow}` : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isActive ? p.color + '50' : 'rgba(255,255,255,0.07)'}`,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    boxShadow: isActive ? `0 0 20px ${p.glow}` : 'none',
                                    position: 'relative', overflow: 'hidden',
                                }}
                            >
                                {/* Corner accent */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
                                    background: p.color, opacity: isActive ? 1 : 0.3,
                                    transition: 'opacity 0.2s',
                                }} />

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 8 }}>
                                    {/* Icon */}
                                    <div style={{
                                        width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: `${p.color}18`, border: `1px solid ${p.color}30`, flexShrink: 0,
                                        transition: 'all 0.2s',
                                        boxShadow: isActive ? `0 0 14px ${p.glow}` : 'none',
                                    }}>
                                        <Icon size={16} style={{ color: p.color }} />
                                    </div>

                                    {/* Label */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                            <span style={{
                                                fontSize: 11, fontWeight: 900, letterSpacing: '0.15em',
                                                textTransform: 'uppercase', color: isActive ? p.color : '#f1f5f9',
                                                fontFamily: "'Space Grotesk', sans-serif",
                                                transition: 'color 0.2s',
                                            }}>
                                                {p.id}
                                            </span>
                                            <span style={{
                                                fontSize: 8, fontWeight: 900, letterSpacing: '0.3em',
                                                fontFamily: 'monospace', color: p.color, opacity: 0.6,
                                            }}>
                                                [{p.shortcode}]
                                            </span>
                                        </div>
                                        <p style={{
                                            fontSize: 10, color: 'rgba(255,255,255,0.4)',
                                            margin: '4px 0 0', lineHeight: 1.5,
                                            display: isActive ? 'block' : '-webkit-box',
                                            WebkitLineClamp: isActive ? 'unset' : 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: isActive ? 'visible' : 'hidden',
                                            transition: 'all 0.2s',
                                        }}>
                                            {p.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right panel – detail view */}
                <div style={{
                    width: 260, flexShrink: 0,
                    borderLeft: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex', flexDirection: 'column',
                    padding: 24,
                }}>
                    {activePillar ? (
                        <>
                            {/* Active pillar detail */}
                            <div style={{
                                width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `${activePillar.color}20`, border: `1px solid ${activePillar.color}50`,
                                boxShadow: `0 0 30px ${activePillar.glow}`, marginBottom: 16,
                            }}>
                                <activePillar.icon size={26} style={{ color: activePillar.color }} />
                            </div>

                            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.4em', color: activePillar.color, fontFamily: 'monospace', marginBottom: 4, textTransform: 'uppercase' }}>
                                [{activePillar.shortcode}]
                            </div>
                            <h4 style={{
                                fontSize: 18, fontWeight: 900, letterSpacing: '-0.01em',
                                textTransform: 'uppercase', color: '#f1f5f9', margin: '0 0 12px',
                                fontFamily: "'Space Grotesk', sans-serif",
                            }}>
                                {activePillar.id}
                            </h4>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, flex: 1 }}>
                                {activePillar.desc}
                            </p>

                            <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}>
                                <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8 }}>
                                    Signal_Type
                                </div>
                                <span style={{
                                    display: 'inline-block', padding: '4px 10px',
                                    background: `${activePillar.color}15`, border: `1px solid ${activePillar.color}30`,
                                    fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
                                    color: activePillar.color, fontFamily: 'monospace',
                                }}>
                                    Derived_Composite
                                </span>
                            </div>
                        </>
                    ) : (
                        /* Empty state */
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12 }}>
                            <div style={{
                                width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.2)',
                            }}>
                                <Shield size={22} />
                            </div>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, maxWidth: 160 }}>
                                Select a pillar to inspect its signal definition
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── FOOTER ── */}
            <div style={{
                padding: '10px 28px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(0,0,0,0.3)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 8, fontWeight: 900, letterSpacing: '0.35em',
                fontFamily: 'monospace', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.2)', flexShrink: 0,
            }}>
                <span>Benchmark_Framework // Kinetic_Intelligence_Engine</span>
                <span>10 Pillars Mapped</span>
            </div>
        </div>
    );
};

export default StrategicRadarGuide;
