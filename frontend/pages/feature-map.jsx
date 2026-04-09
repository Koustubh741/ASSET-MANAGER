import Head from 'next/head';
import { useState } from 'react';

const featureData = {
    platform: 'Cache Serve',
    departments: [
        {
            id: 'it',
            name: 'IT',
            color: '#e53e3e',
            glowColor: 'rgba(229,62,62,0.4)',
            features: [
                'Network Discovery',
                'SNMP Scanning',
                'License Management',
                'Software Inventory',
                'Consumable Mgmt',
                'Auto Verification',
                'Audit Trail',
                'RFID Support',
                'Network Topology',
                'Port Policies',
            ],
        },
        {
            id: 'admin',
            name: 'Admin',
            color: '#e53e3e',
            glowColor: 'rgba(229,62,62,0.4)',
            features: [
                'Excel Import',
                'Asset Requests',
                'User Management',
                'Role Management',
                'Locations Mgmt',
                'Gate Pass',
                'Disposal Mgmt',
                'Setup & Config',
                'Notifications',
                'Saved Views',
            ],
        },
        {
            id: 'finance',
            name: 'Finance',
            color: '#e53e3e',
            glowColor: 'rgba(229,62,62,0.4)',
            features: [
                'Financial Reports',
                'Depreciation',
                'Purchase History',
                'Procurement',
                'ROI Analytics',
                'Renewals Mgmt',
                'Cost Tracking',
                'Vendor Mgmt',
            ],
        },
        {
            id: 'operations',
            name: 'Operations',
            color: '#e53e3e',
            glowColor: 'rgba(229,62,62,0.4)',
            features: [
                'Asset Assignment',
                'Asset Tracking',
                'CMDB Overview',
                'Relationships',
                'Asset Compare',
                'Barcode / QR',
                'Asset Timeline',
                'Bulk Operations',
            ],
        },
        {
            id: 'support',
            name: 'IT Support',
            color: '#e53e3e',
            glowColor: 'rgba(229,62,62,0.4)',
            features: [
                'Ticket System',
                'IT Support Desk',
                'Maintenance Log',
                'Alerts & Monitors',
                'Security Scans',
                'Onboarding Flow',
                'AI Assistant',
                'Agent Collector',
            ],
        },
    ],
};

export default function FeatureMap() {
    const [hoveredDept, setHoveredDept] = useState(null);
    const [hoveredFeature, setHoveredFeature] = useState(null);

    return (
        <>
            <Head>
                <title>Platform Feature Map – Cache Serve</title>
                <meta name="description" content="Complete feature map of Cache Serve platform across all departments." />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', sans-serif;
          background: #0a0a1a;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .page-wrapper {
          min-height: 100vh;
          background: radial-gradient(ellipse at top, #0d1330 0%, #0a0a1a 60%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px 24px 80px;
          position: relative;
          overflow: hidden;
        }

        /* Ambient glow orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          opacity: 0.15;
        }
        .orb-1 { width: 600px; height: 600px; background: #3b5bdb; top: -200px; left: -200px; }
        .orb-2 { width: 500px; height: 500px; background: #7048e8; bottom: -150px; right: -150px; }
        .orb-3 { width: 400px; height: 400px; background: #e53e3e; top: 40%; left: 40%; transform: translate(-50%,-50%); }

        /* Grid lines background */
        .grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        /* Header */
        .header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 60px;
          position: relative;
          z-index: 1;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(59,91,219,0.15);
          border: 1px solid rgba(99,130,255,0.3);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #818cf8;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #818cf8;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .main-title {
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          text-align: center;
          line-height: 1.1;
          margin-bottom: 12px;
        }

        .main-title span {
          background: linear-gradient(135deg, #6366f1, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          font-size: 16px;
          color: rgba(255,255,255,0.45);
          text-align: center;
          font-weight: 400;
          max-width: 500px;
        }

        /* Root node */
        .root-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1300px;
        }

        .root-node {
          background: linear-gradient(135deg, #3b5bdb, #6366f1);
          border: 1px solid rgba(99,130,255,0.5);
          border-radius: 14px;
          padding: 16px 48px;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.01em;
          box-shadow: 0 0 40px rgba(99,130,255,0.4), 0 8px 32px rgba(0,0,0,0.4);
          position: relative;
          cursor: default;
          transition: box-shadow 0.3s ease;
        }

        .root-node::after {
          content: '';
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 30px;
          background: linear-gradient(180deg, rgba(99,130,255,0.8), rgba(99,130,255,0.2));
        }

        /* Horizontal connector line */
        .h-connector {
          position: relative;
          width: 100%;
          height: 2px;
          margin-bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .h-connector-line {
          width: 85%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(99,130,255,0.5), rgba(229,62,62,0.5), rgba(99,130,255,0.5), transparent);
          position: absolute;
          top: 0;
        }

        /* Department columns */
        .departments-row {
          display: flex;
          gap: 20px;
          width: 100%;
          max-width: 1300px;
          justify-content: center;
          align-items: flex-start;
          padding-top: 0;
        }

        .dept-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 0;
          max-width: 220px;
          position: relative;
          transition: transform 0.3s ease;
        }

        .dept-column:hover {
          transform: translateY(-4px);
        }

        /* Vertical line from h-connector to dept header */
        .v-line-top {
          width: 2px;
          height: 30px;
          background: linear-gradient(180deg, rgba(229,62,62,0.6), rgba(229,62,62,0.3));
        }

        /* Department header */
        .dept-header {
          background: linear-gradient(135deg, #c53030, #e53e3e);
          border: 1px solid rgba(255,100,100,0.4);
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          width: 100%;
          text-align: center;
          cursor: default;
          transition: box-shadow 0.3s ease, background 0.3s ease;
          position: relative;
        }

        .dept-column:hover .dept-header {
          box-shadow: 0 0 24px rgba(229,62,62,0.6);
          background: linear-gradient(135deg, #e53e3e, #fc5c5c);
        }

        /* Vertical line from dept header to features */
        .v-line-mid {
          width: 2px;
          height: 20px;
          background: linear-gradient(180deg, rgba(229,62,62,0.4), rgba(99,130,255,0.2));
        }

        /* Features list */
        .features-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .feature-item {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 9px 14px;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.75);
          text-align: center;
          cursor: default;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.01em;
        }

        .feature-item::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(99,130,255,0.1), transparent);
          opacity: 0;
          transition: opacity 0.25s ease;
        }

        .feature-item:hover {
          background: rgba(99,130,255,0.12);
          border-color: rgba(99,130,255,0.35);
          color: #ffffff;
          box-shadow: 0 0 16px rgba(99,130,255,0.2), 0 2px 8px rgba(0,0,0,0.3);
          transform: scale(1.02);
        }

        .feature-item:hover::before {
          opacity: 1;
        }

        /* V connectors between features */
        .feature-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 0;
        }

        .feature-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(99,130,255,0.5);
          border: 1px solid rgba(99,130,255,0.8);
          margin: 2px 0;
          flex-shrink: 0;
        }

        /* Stats bar */
        .stats-bar {
          display: flex;
          gap: 32px;
          margin-top: 60px;
          position: relative;
          z-index: 2;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 16px 28px;
          backdrop-filter: blur(10px);
          transition: all 0.25s ease;
        }

        .stat-card:hover {
          border-color: rgba(99,130,255,0.3);
          background: rgba(99,130,255,0.08);
        }

        .stat-number {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #6366f1, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .departments-row { flex-wrap: wrap; gap: 16px; }
          .dept-column { max-width: calc(50% - 8px); flex: 0 0 calc(50% - 8px); }
          .h-connector-line { width: 95%; }
          .stats-bar { flex-wrap: wrap; gap: 16px; justify-content: center; }
        }

        @media (max-width: 520px) {
          .dept-column { max-width: 100%; flex: 0 0 100%; }
        }

        /* Animated shimmer on root node */
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

            <div className="page-wrapper">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />
                <div className="grid-bg" />

                {/* Header */}
                <div className="header">
                    <div className="badge">
                        <span className="badge-dot" />
                        Platform Overview
                    </div>
                    <h1 className="main-title">
                        <span>Cache Serve</span>
                        <br />
                        Feature Map
                    </h1>
                    <p className="subtitle">
                        Complete module overview across all departments and roles
                    </p>
                </div>

                {/* Chart */}
                <div className="root-container">
                    {/* Root Node */}
                    <div className="root-node">
                        🏢 Cache Serve (CS)
                    </div>

                    {/* Horizontal connector */}
                    <div style={{ height: 30 }} />
                    <div className="h-connector">
                        <div className="h-connector-line" />
                    </div>

                    {/* Departments */}
                    <div className="departments-row">
                        {featureData.departments.map((dept) => (
                            <div
                                key={dept.id}
                                className="dept-column"
                                onMouseEnter={() => setHoveredDept(dept.id)}
                                onMouseLeave={() => setHoveredDept(null)}
                            >
                                <div className="v-line-top" />
                                <div className="dept-header">{dept.name}</div>
                                <div className="v-line-mid" />
                                <div className="features-list">
                                    {dept.features.map((feature, fi) => (
                                        <div
                                            key={fi}
                                            className="feature-item"
                                            onMouseEnter={() => setHoveredFeature(`${dept.id}-${fi}`)}
                                            onMouseLeave={() => setHoveredFeature(null)}
                                        >
                                            {feature}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="stats-bar">
                    <div className="stat-card">
                        <span className="stat-number">5</span>
                        <span className="stat-label">Departments</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-number">44</span>
                        <span className="stat-label">Features</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-number">6</span>
                        <span className="stat-label">Role Levels</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-number">100%</span>
                        <span className="stat-label">Cloud Ready</span>
                    </div>
                </div>
            </div>
        </>
    );
}
