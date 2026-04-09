import Head from 'next/head';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

// STATUS LEGEND (Dynamically Overridden)
// "live"    = metrics found in backend integration-audit
// "partial" = some data found, but not 100% active
// "planned" = default (no backend data yet)

const departments = [
    {
        id: 'it',
        name: 'IT',
        features: [
            { name: 'Network Discovery', status: 'planned', note: 'Awaiting backend scan data', path: '/network-topology' },
            { name: 'SNMP Scanning', status: 'planned', note: 'Awaiting snmp_service trigger' },
            { name: 'Network Topology', status: 'planned', path: '/network-topology' },
            { name: 'Port Policies', status: 'planned', path: '/port-policies' },
            { name: 'License Management', status: 'planned', path: '/software' },
            { name: 'Software Inventory', status: 'planned', path: '/software' },
            { name: 'Audit Trail', status: 'planned', path: '/audit/overview' },
            { name: 'Auto Verification', status: 'planned' },
            { name: 'RFID Support', status: 'planned', path: '/rfid' },
            { name: 'AI Assistant', status: 'planned', path: '/ai-assistant' },
            { name: 'Cloud Monitoring', status: 'live', path: '/agents' },
        ],
    },
    {
        id: 'admin',
        name: 'Admin',
        features: [
            { name: 'User Management', status: 'planned', path: '/admin/users' },
            { name: 'Role Management', status: 'planned' },
            { name: 'Excel / CSV Import', status: 'planned', path: '/assets' },
            { name: 'Asset Requests', status: 'planned', path: '/asset-requests' },
            { name: 'Locations Mgmt', status: 'planned', path: '/admin/locations' },
            { name: 'Gate Pass', status: 'planned', path: '/gate-pass' },
            { name: 'Disposal Mgmt', status: 'planned', path: '/disposal' },
            { name: 'Setup & Config', status: 'planned', path: '/setup' },
            { name: 'Notifications', status: 'planned', path: '/notifications' },
            { name: 'Saved Views', status: 'planned', path: '/assets' },
        ],
    },
    {
        id: 'finance',
        name: 'Finance',
        features: [
            { name: 'Financial Reports', status: 'planned', path: '/financials' },
            { name: 'Depreciation', status: 'planned', path: '/financials' },
            { name: 'Renewals Mgmt', status: 'planned', path: '/renewals' },
            { name: 'Procurement Analytics', status: 'planned', path: '/procurement/analytics' },
            { name: 'Purchase Orders', status: 'planned', path: '/procurement/purchase-orders' },
            { name: 'Deliveries Tracking', status: 'planned', path: '/procurement/deliveries' },
            { name: 'Budget Queue', status: 'planned', path: '/finance/budget-queue' },
            { name: 'Cost Tracking', status: 'planned', path: '/assets' },
        ],
    },
    {
        id: 'operations',
        name: 'Operations',
        features: [
            { name: 'Asset Registry', status: 'planned', path: '/assets' },
            { name: 'Asset Assignment', status: 'planned', path: '/assets' },
            { name: 'CMDB Overview', status: 'planned', path: '/assets/cmdb' },
            { name: 'Asset Relationships', status: 'planned', path: '/assets' },
            { name: 'Asset Compare', status: 'planned', path: '/assets/compare' },
            { name: 'Asset Timeline', status: 'planned', path: '/assets' },
            { name: 'Barcode / QR', status: 'planned', path: '/barcode-scan' },
            { name: 'Bulk Operations', status: 'planned', path: '/assets' },
            { name: 'Asset Search', status: 'live', path: '/assets' },
            { name: 'Asset Card View', status: 'live', path: '/assets/cards' },
        ],
    },
    {
        id: 'support',
        name: 'IT Support',
        features: [
            { name: 'Ticket System', status: 'planned', path: '/tickets' },
            { name: 'IT Support Desk', status: 'planned', path: '/tickets' },
            { name: 'Maintenance Logs', status: 'planned', path: '/assets' },
            { name: 'Alerts & Monitoring', status: 'live', path: '/notifications' },
            { name: 'Agent Collector', status: 'live', path: '/admin/agents' },
            { name: 'Security / Port Scan', status: 'live', path: '/port-policies' },
            { name: 'Onboarding Flow', status: 'live', path: '/onboarding' },
            { name: 'Workflows Engine', status: 'live', path: '/workflows' },
        ],
    },
];

const STATUS_META = {
    live: { label: 'Live & Integrated', color: 'var(--color-kinetic-secondary)', bg: 'rgba(var(--color-kinetic-secondary-rgb), 0.12)', border: 'rgba(var(--color-kinetic-secondary-rgb), 0.3)', dot: 'var(--color-kinetic-secondary)' },
    partial: { label: 'Partial', color: 'var(--color-kinetic-gold)', bg: 'rgba(var(--color-kinetic-gold-rgb), 0.12)', border: 'rgba(var(--color-kinetic-gold-rgb), 0.3)', dot: 'var(--color-kinetic-gold)' },
    planned: { label: 'Planned', color: 'var(--text-muted)', bg: 'rgba(var(--text-muted-rgb), 0.08)', border: 'rgba(var(--text-muted-rgb), 0.2)', dot: 'var(--text-muted)' },
};

export default function IntegrationStatus() {
    const [filter, setFilter] = useState('all');
    const [expandedDept, setExpandedDept] = useState(null);
    const [auditData, setAuditData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAudit = async () => {
        try {
            const data = await apiClient.get('/setup/integration-audit');
            setAuditData(data);
        } catch (err) {
            console.error("Failed to fetch integration audit:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAudit();
    }, []);

    const getFeatStatus = (deptId, featName, defaultStatus) => {
        if (!auditData || !auditData[deptId]) return defaultStatus;
        const key = featName.toLowerCase().replace(/ /g, '_');
        return auditData[deptId][key] ? 'live' : defaultStatus;
    };

    const getFeatNote = (deptId, featName, defaultNote) => {
        if (!auditData || !auditData[deptId]) return defaultNote;
        const key = featName.toLowerCase().replace(/ /g, '_');
        return auditData[deptId][key] || defaultNote;
    };

    const handleTrigger = async (url, featName) => {
        try {
            await apiClient.post(url, {});
            alert(`✓ Triggered ${featName} successfully!`);
            setTimeout(fetchAudit, 3000);
        } catch (err) {
            console.error(`Failed to trigger ${featName}:`, err);
            alert(`✗ Failed to trigger ${featName}.`);
        }
    };

    const allFeatures = departments.flatMap(d => d.features);
    const liveCount = allFeatures.filter(f => f.status === 'live').length;
    const partialCount = allFeatures.filter(f => f.status === 'partial').length;
    const plannedCount = allFeatures.filter(f => f.status === 'planned').length;
    const totalCount = allFeatures.length;
    const livePercent = Math.round((liveCount / totalCount) * 100);

    return (
        <>
            <Head>
                <title>Integration Status – Asset Manager Pro</title>
                <meta name="description" content="Real-time integration status of all platform modules and features." />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            <style>{`
        .page {
          min-height: 100vh;
          padding: 48px 24px 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        .orb { position: absolute; border-radius: 0; filter: blur(140px); opacity: 0.15; pointer-events: none; }
        .orb1 { width: 600px; height: 600px; background: var(--color-kinetic-primary); top: -200px; left: -200px; }
        .orb2 { width: 500px; height: 500px; background: var(--color-kinetic-secondary); bottom: -150px; right: -150px; }

        .grid-bg {
          position: absolute; inset: 0; pointer-events: none;
          background-image: linear-gradient(var(--color-kinetic-primary-rgb) 0.05 1px, transparent 1px),
                            linear-gradient(90deg, var(--color-kinetic-primary-rgb) 0.05 1px, transparent 1px);
          background-size: 64px 64px;
        }

        .inner { position: relative; z-index: 1; width: 100%; max-width: 1200px; }

        .badge-dot { width: 6px; height: 6px; border-radius: 0; background: var(--color-kinetic-secondary); animation: blink 1.8s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .s-card {
          @apply bg-app-obsidian border border-app-border rounded-none p-6 flex flex-col items-center gap-1 transition-all duration-300 shadow-2xl;
        }
        .s-card:hover { border-color: var(--color-kinetic-primary); }
        .s-num { font-size: 42px; font-weight: 900; line-height: 1; font-family: 'Space Grotesk'; }
        .s-lbl { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: var(--text-muted); margin-top: 4px; }
        
        .progress-track { height: 10px; background: var(--bg-app-obsidian); border-radius: 0; border: 1px solid var(--border-main); overflow: hidden; }
        .progress-fill {
          height: 100%; border-radius: 0;
          background: linear-gradient(90deg, var(--color-kinetic-primary), var(--color-kinetic-secondary));
          box-shadow: 0 0 15px rgba(var(--color-kinetic-secondary-rgb), 0.4);
          transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .filt-btn {
          @apply px-[18px] py-[7px] border border-app-border rounded-none text-xs font-semibold cursor-pointer transition-all duration-200 bg-transparent text-app-text/60;
        }
        .filt-btn.active, .filt-btn:hover { @apply text-app-text border-primary/50 bg-primary/10; }

        .dept-card {
           @apply bg-app-surface/30 border border-app-border rounded-none overflow-hidden transition-all duration-300;
        }
        .dept-card:hover { box-shadow: 0 0 32px rgba(99, 102, 241, 0.1); }

        .dept-header-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; cursor: pointer; user-select: none;
          border-bottom: 1px solid var(--border-soft);
        }

        .feat-row:hover { background: var(--bg-surface-soft); }
        .feat-info { flex: 1; min-width: 0; }
        .feat-name { font-size: 13px; font-weight: 600; color: var(--app-text); margin-bottom: 2px; }
        .feat-note { font-size: 11px; color: var(--app-text-muted); line-height: 1.4; opacity: 0.7; }
        .feat-badge {
          font-size: 10px; font-weight: 900; padding: 4px 10px; border-radius: 0;
          flex-shrink: 0; white-space: nowrap; letter-spacing: 0.1em; text-transform: uppercase;
        }

        @media (max-width: 700px) {
          .summary-row { grid-template-columns: repeat(2,1fr); }
          .dept-grid { grid-template-columns: 1fr; }
        }
      `}</style>

            <div className="page bg-app-bg text-app-text">
                <div className="orb orb1" />
                <div className="orb orb2" />
                <div className="grid-bg" />

                <div className="inner">
                    {/* Header */}
                    <div className="header text-center mb-12">
                        <div className="badge flex justify-center mb-6">
                            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-app-secondary/10 border border-app-secondary/30 text-[10px] font-black uppercase tracking-[0.3em] text-app-secondary">
                                <span className="badge-dot" /> Live System Audit
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase font-['Space_Grotesk']">Platform <span className="text-app-primary">Integration Status</span></h1>
                        <p className="sub text-app-text-muted text-lg font-mono tracking-widest opacity-60">REAL-TIME TELEMETRY · GLOBAL NODE CLUSTER v5.0</p>
                    </div>

                    {/* Summary cards */}
                    <div className="summary-row grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                        <div className="s-card" style={{ borderColor: 'var(--color-kinetic-secondary)' }}>
                            <span className="s-num text-app-secondary">{liveCount}</span>
                            <span className="s-lbl">Live & Integrated</span>
                            <span className="text-[10px] uppercase font-black tracking-tighter text-app-text-muted/40 mt-1">Full Sync Status</span>
                        </div>
                        <div className="s-card" style={{ borderColor: 'var(--color-kinetic-gold)' }}>
                            <span className="s-num text-app-gold">{partialCount}</span>
                            <span className="s-lbl">Telemetry Partial</span>
                            <span className="text-[10px] uppercase font-black tracking-tighter text-app-text-muted/40 mt-1">Optimization Required</span>
                        </div>
                        <div className="s-card" style={{ borderStyle: 'dashed' }}>
                            <span className="s-num text-app-text-muted">{plannedCount}</span>
                            <span className="s-lbl">Planned Deployment</span>
                            <span className="text-[10px] uppercase font-black tracking-tighter text-app-text-muted/40 mt-1">Hardware Blueprinting</span>
                        </div>
                        <div className="s-card" style={{ borderColor: 'var(--color-kinetic-primary)' }}>
                            <span className="s-num text-app-primary">{livePercent}%</span>
                            <span className="s-lbl">Mission Readiness</span>
                            <span className="text-[10px] uppercase font-black tracking-tighter text-app-text-muted/40 mt-1">{liveCount} of {totalCount} nodes active</span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="progress-wrap mb-16">
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-app-text-muted">Master Integration Sequence</span>
                            <span className="text-xl font-black font-mono text-app-secondary">{livePercent}% READY</span>
                        </div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${livePercent}%` }} />
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="filter-row">
                        {['all', 'live', 'partial', 'planned'].map(f => (
                            <button
                                key={f}
                                className={`filt-btn${filter === f ? ' active' : ''}`}
                                onClick={() => setFilter(f)}
                            >
                                {f === 'all' ? '🔍 All Features' : f === 'live' ? '✅ Live' : f === 'partial' ? '⚡ Partial' : '📋 Planned'}
                            </button>
                        ))}
                    </div>

                    {/* Department cards */}
                    <div className="dept-grid">
                        {departments.map(dept => {
                            // UI Metadata based on ID
                            const UI_META = {
                                it: { icon: '🖥️', color: 'var(--color-kinetic-primary)', glow: 'rgba(var(--color-kinetic-primary-rgb), 0.3)' },
                                admin: { icon: '⚙️', color: 'var(--color-kinetic-cyan)', glow: 'rgba(var(--color-kinetic-cyan-rgb), 0.3)' },
                                finance: { icon: '💰', color: 'var(--color-kinetic-secondary)', glow: 'rgba(var(--color-kinetic-secondary-rgb), 0.3)' },
                                operations: { icon: '📦', color: 'var(--color-kinetic-gold)', glow: 'rgba(var(--color-kinetic-gold-rgb), 0.3)' },
                                support: { icon: '🎫', color: 'var(--color-kinetic-rose)', glow: 'rgba(var(--color-kinetic-rose-rgb), 0.3)' },
                            }[dept.id];

                            const featuresWithStatus = dept.features.map(f => ({
                                ...f,
                                status: getFeatStatus(dept.id, f.name, f.status)
                            }));

                            const filtered = featuresWithStatus.filter(f => filter === 'all' || f.status === filter);
                            if (filtered.length === 0) return null;

                            const dLive = featuresWithStatus.filter(f => f.status === 'live').length;
                            const dPartial = featuresWithStatus.filter(f => f.status === 'partial').length;

                            return (
                                <div key={dept.id} className="dept-card" style={{ borderColor: expandedDept === dept.id ? `${UI_META.color}40` : undefined }}>
                                    <div
                                        className="dept-header-row"
                                        onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
                                        style={{ background: `linear-gradient(90deg, ${UI_META.color}12, transparent)` }}
                                    >
                                        <div className="dept-title">
                                            <span className="dept-icon">{UI_META.icon}</span>
                                            <span className="dept-name" style={{ color: UI_META.color }}>{dept.name}</span>
                                        </div>
                                        <div className="dept-counts">
                                            <span className="cnt-pill" style={{ background: STATUS_META.live.bg, color: STATUS_META.live.color, border: `1px solid ${STATUS_META.live.border}` }}>
                                                {dLive} live
                                            </span>
                                            {dPartial > 0 && (
                                                <span className="cnt-pill" style={{ background: STATUS_META.partial.bg, color: STATUS_META.partial.color, border: `1px solid ${STATUS_META.partial.border}` }}>
                                                    {dPartial} partial
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="features-body">
                                        {filtered.map((feat, fi) => {
                                            const meta = STATUS_META[feat.status];
                                            return (
                                                <div key={fi} className="feat-row">
                                                    <div className="feat-dot" style={{ background: meta.dot, boxShadow: `0 0 6px ${meta.dot}` }} />
                                                    <div className="feat-info">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <div className="feat-name">{feat.name}</div>
                                                            {feat.path && (
                                                                <a href={feat.path} className="text-primary hover:underline" title="Go to Page">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                </a>
                                                            )}
                                                        </div>
                                                        <div className="feat-note">{getFeatNote(dept.id, feat.name, feat.note)}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {feat.trigger_url && feat.status === 'live' && (
                                                            <button
                                                                onClick={() => handleTrigger(feat.trigger_url, feat.name)}
                                                                className="hover:scale-110 transition-transform text-white/40 hover:text-success"
                                                                title="Trigger Sync Now"
                                                            >
                                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                                            </button>
                                                        )}
                                                        <span className="feat-badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                                                            {feat.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
