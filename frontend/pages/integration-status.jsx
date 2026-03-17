import Head from 'next/head';
import { useState } from 'react';

// STATUS LEGEND
// "live"    = backend router + frontend page fully wired, JWT-secured
// "partial" = backend exists OR frontend exists, but not both / stub pages
// "planned" = no backend endpoint, stub or placeholder frontend

const departments = [
    {
        id: 'it',
        name: 'IT',
        icon: '🖥️',
        color: '#6366f1',
        glow: 'rgba(99,102,241,0.3)',
        features: [
            { name: 'Network Discovery', status: 'live', note: 'SNMP scan via collect.py router + TopologyPage' },
            { name: 'SNMP Scanning', status: 'live', note: 'snmp_service + /collect/scan endpoint active' },
            { name: 'Network Topology', status: 'live', note: 'network-topology.jsx + live graph rendering' },
            { name: 'Port Policies', status: 'live', note: 'port_policies.py router + port-policies.jsx' },
            { name: 'License Management', status: 'live', note: 'software.py router + software.jsx page' },
            { name: 'Software Inventory', status: 'live', note: 'software.py + full CRUD in software.jsx' },
            { name: 'Audit Trail', status: 'live', note: 'audit.py router + audit/overview.jsx' },
            { name: 'Auto Verification', status: 'live', note: 'Agent collector + collect.py endpoint' },
            { name: 'RFID Support', status: 'partial', note: 'Upload router exists, no dedicated RFID page' },
            { name: 'AI Assistant', status: 'live', note: 'ai_assistant.py router fully integrated' },
        ],
    },
    {
        id: 'admin',
        name: 'Admin',
        icon: '⚙️',
        color: '#0ea5e9',
        glow: 'rgba(14,165,233,0.3)',
        features: [
            { name: 'User Management', status: 'live', note: 'users.py + users.jsx full CRUD' },
            { name: 'Role Management', status: 'live', note: 'Role-based JWT enforced across all routers' },
            { name: 'Excel / CSV Import', status: 'live', note: 'upload.py router + file import in assets' },
            { name: 'Asset Requests', status: 'live', note: 'asset_requests.py + asset-requests pages' },
            { name: 'Locations Mgmt', status: 'live', note: 'locations.py router + locations.jsx page' },
            { name: 'Gate Pass', status: 'partial', note: 'No dedicated backend/frontend for gate pass yet' },
            { name: 'Disposal Mgmt', status: 'live', note: 'disposal.py router + disposal.jsx page' },
            { name: 'Setup & Config', status: 'live', note: 'setup.py router + setup.jsx wizard' },
            { name: 'Notifications', status: 'live', note: 'alerts.py router + notifications.jsx page' },
            { name: 'Saved Views', status: 'live', note: 'saved-views.jsx + backend persisted filters' },
        ],
    },
    {
        id: 'finance',
        name: 'Finance',
        icon: '💰',
        color: '#10b981',
        glow: 'rgba(16,185,129,0.3)',
        features: [
            { name: 'Financial Reports', status: 'live', note: 'financials.py router + finance/analytics.jsx' },
            { name: 'Depreciation', status: 'live', note: 'Depreciation calc in financials service' },
            { name: 'Renewals Mgmt', status: 'live', note: 'renewals.jsx + renewals backend logic' },
            { name: 'Procurement Analytics', status: 'live', note: 'procurement/analytics.jsx wired to backend' },
            { name: 'Purchase Orders', status: 'partial', note: 'purchase-orders.jsx exists, backend stub only' },
            { name: 'Deliveries Tracking', status: 'partial', note: 'deliveries.jsx exists, backend stub only' },
            { name: 'Budget Queue', status: 'partial', note: 'FinanceDashboard stub, no backend queue API' },
            { name: 'Cost Tracking', status: 'live', note: 'Asset cost fields tracked in financials router' },
        ],
    },
    {
        id: 'operations',
        name: 'Operations',
        icon: '📦',
        color: '#f59e0b',
        glow: 'rgba(245,158,11,0.3)',
        features: [
            { name: 'Asset Registry', status: 'live', note: 'assets.py + assets/index.jsx fully wired' },
            { name: 'Asset Assignment', status: 'live', note: 'assign.jsx + atomic assign_asset service' },
            { name: 'CMDB Overview', status: 'live', note: 'assets/cmdb-overview.jsx page active' },
            { name: 'Asset Relationships', status: 'live', note: 'assets/relationships.jsx + reference.py router' },
            { name: 'Asset Compare', status: 'live', note: 'assets/compare.jsx fully functional' },
            { name: 'Asset Timeline', status: 'live', note: 'AssetTimeline.jsx with animated history' },
            { name: 'Barcode / QR', status: 'partial', note: 'Upload router handles barcodes, no scan UI' },
            { name: 'Bulk Operations', status: 'live', note: 'Bulk actions available in assets/index.jsx' },
            { name: 'Asset Search', status: 'live', note: 'assets/search.jsx + backend filter API' },
            { name: 'Asset Card View', status: 'live', note: 'asset-card page available' },
        ],
    },
    {
        id: 'support',
        name: 'IT Support',
        icon: '🎫',
        color: '#ec4899',
        glow: 'rgba(236,72,153,0.3)',
        features: [
            { name: 'Ticket System', status: 'live', note: 'tickets.py router + tickets/index.jsx' },
            { name: 'IT Support Desk', status: 'live', note: 'tickets/all.jsx for IT Management view' },
            { name: 'Maintenance Logs', status: 'live', note: 'maintenance.py router + records per asset' },
            { name: 'Alerts & Monitoring', status: 'live', note: 'alerts.py router + notifications system' },
            { name: 'Agent Collector', status: 'live', note: 'agents.py router + agents.jsx dashboard' },
            { name: 'Security / Port Scan', status: 'live', note: 'port_policies.jsx + port_policies.py router' },
            { name: 'Onboarding Flow', status: 'partial', note: 'Setup wizard exists, no dedicated onboard flow' },
            { name: 'Workflows Engine', status: 'partial', note: 'workflows.py router exists, no frontend page' },
        ],
    },
];

const STATUS_META = {
    live: { label: 'Live & Integrated', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', dot: '#10b981' },
    partial: { label: 'Partial', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', dot: '#f59e0b' },
    planned: { label: 'Planned', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', dot: '#4b5563' },
};

export default function IntegrationStatus() {
    const [filter, setFilter] = useState('all');
    const [expandedDept, setExpandedDept] = useState(null);

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
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #07070f; min-height: 100vh; }

        .page {
          min-height: 100vh;
          background: radial-gradient(ellipse at 20% 0%, #0d1330 0%, #07070f 55%);
          padding: 48px 24px 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        .orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.12; pointer-events: none; }
        .orb1 { width: 500px; height: 500px; background: #3b5bdb; top: -100px; left: -100px; }
        .orb2 { width: 400px; height: 400px; background: #10b981; bottom: -100px; right: -100px; }

        .grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image: linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 56px 56px;
        }

        .inner { position: relative; z-index: 1; width: 100%; max-width: 1200px; }

        /* Header */
        .header { text-align: center; margin-bottom: 48px; }
        .badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3);
          border-radius: 100px; padding: 5px 14px; font-size: 11px; font-weight: 600;
          color: #34d399; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 18px;
        }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; animation: blink 1.8s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        h1 { font-size: clamp(24px,3.5vw,42px); font-weight: 800; color: #fff; letter-spacing: -0.02em; margin-bottom: 10px; }
        h1 span { background: linear-gradient(135deg, #6366f1, #34d399); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .sub { font-size: 15px; color: rgba(255,255,255,0.4); font-weight: 400; }

        /* Summary cards */
        .summary-row {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px;
        }
        .s-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 20px; display: flex; flex-direction: column;
          align-items: center; gap: 4px; transition: border-color 0.25s;
          cursor: default;
        }
        .s-card:hover { border-color: rgba(99,130,255,0.3); }
        .s-num { font-size: 36px; font-weight: 800; line-height: 1; }
        .s-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .s-sub { font-size: 11px; color: rgba(255,255,255,0.25); }

        /* Progress bar */
        .progress-wrap { margin-bottom: 36px; }
        .progress-label { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: rgba(255,255,255,0.5); }
        .progress-track { height: 8px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
        .progress-fill {
          height: 100%; border-radius: 99px;
          background: linear-gradient(90deg, #6366f1, #10b981);
          box-shadow: 0 0 12px rgba(16,185,129,0.4);
          transition: width 1s ease;
        }

        /* Filter tabs */
        .filter-row { display: flex; gap: 8px; margin-bottom: 28px; flex-wrap: wrap; }
        .filt-btn {
          padding: 7px 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
          font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;
          background: transparent; color: rgba(255,255,255,0.4); font-family: 'Inter', sans-serif;
          letter-spacing: 0.03em;
        }
        .filt-btn.active, .filt-btn:hover { color: #fff; border-color: rgba(99,130,255,0.5); background: rgba(99,130,255,0.12); }

        /* Department cards */
        .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }

        .dept-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; overflow: hidden; transition: border-color 0.3s, box-shadow 0.3s;
        }
        .dept-card:hover { box-shadow: 0 0 32px rgba(99,102,241,0.1); }

        .dept-header-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; cursor: pointer; user-select: none;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .dept-title { display: flex; align-items: center; gap: 10px; }
        .dept-icon { font-size: 20px; }
        .dept-name { font-size: 15px; font-weight: 700; color: #fff; }
        .dept-counts { display: flex; gap: 8px; }
        .cnt-pill {
          font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 99px;
          letter-spacing: 0.04em;
        }
        .expand-arrow { color: rgba(255,255,255,0.3); font-size: 12px; transition: transform 0.25s; }
        .expand-arrow.open { transform: rotate(180deg); }

        /* Feature rows */
        .features-body { padding: 8px 0; }
        .feat-row {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 10px 20px; transition: background 0.2s; cursor: default;
        }
        .feat-row:hover { background: rgba(255,255,255,0.03); }
        .feat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
        .feat-info { flex: 1; min-width: 0; }
        .feat-name { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.85); margin-bottom: 2px; }
        .feat-note { font-size: 11px; color: rgba(255,255,255,0.3); line-height: 1.4; }
        .feat-badge {
          font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 99px;
          flex-shrink: 0; white-space: nowrap; letter-spacing: 0.05em; text-transform: uppercase;
        }

        @media (max-width: 700px) {
          .summary-row { grid-template-columns: repeat(2,1fr); }
          .dept-grid { grid-template-columns: 1fr; }
        }
      `}</style>

            <div className="page">
                <div className="orb orb1" />
                <div className="orb orb2" />
                <div className="grid" />

                <div className="inner">
                    {/* Header */}
                    <div className="header">
                        <div className="badge"><span className="badge-dot" /> Live Audit</div>
                        <h1>Platform <span>Integration Status</span></h1>
                        <p className="sub">Real-time feature audit based on backend routers + frontend pages</p>
                    </div>

                    {/* Summary cards */}
                    <div className="summary-row">
                        <div className="s-card" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                            <span className="s-num" style={{ color: '#10b981' }}>{liveCount}</span>
                            <span className="s-lbl">Live & Active</span>
                            <span className="s-sub">Fully integrated</span>
                        </div>
                        <div className="s-card" style={{ borderColor: 'rgba(245,158,11,0.25)' }}>
                            <span className="s-num" style={{ color: '#f59e0b' }}>{partialCount}</span>
                            <span className="s-lbl">Partial</span>
                            <span className="s-sub">Needs completion</span>
                        </div>
                        <div className="s-card" style={{ borderColor: 'rgba(107,114,128,0.25)' }}>
                            <span className="s-num" style={{ color: '#6b7280' }}>{plannedCount}</span>
                            <span className="s-lbl">Planned</span>
                            <span className="s-sub">Not yet built</span>
                        </div>
                        <div className="s-card" style={{ borderColor: 'rgba(99,130,255,0.25)' }}>
                            <span className="s-num" style={{ color: '#818cf8' }}>{livePercent}%</span>
                            <span className="s-lbl">Completion</span>
                            <span className="s-sub">{liveCount} of {totalCount} features</span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="progress-wrap">
                        <div className="progress-label">
                            <span>Overall integration progress</span>
                            <span style={{ color: '#34d399', fontWeight: 600 }}>{livePercent}% complete</span>
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
                            const filtered = dept.features.filter(f => filter === 'all' || f.status === filter);
                            if (filtered.length === 0) return null;
                            const dLive = dept.features.filter(f => f.status === 'live').length;
                            const dPartial = dept.features.filter(f => f.status === 'partial').length;
                            const isOpen = expandedDept === null || expandedDept === dept.id;

                            return (
                                <div key={dept.id} className="dept-card" style={{ borderColor: expandedDept === dept.id ? `${dept.color}40` : undefined }}>
                                    <div
                                        className="dept-header-row"
                                        onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
                                        style={{ background: `linear-gradient(90deg, ${dept.color}12, transparent)` }}
                                    >
                                        <div className="dept-title">
                                            <span className="dept-icon">{dept.icon}</span>
                                            <span className="dept-name" style={{ color: dept.color }}>{dept.name}</span>
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
                                                        <div className="feat-name">{feat.name}</div>
                                                        <div className="feat-note">{feat.note}</div>
                                                    </div>
                                                    <span className="feat-badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                                                        {feat.status}
                                                    </span>
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
