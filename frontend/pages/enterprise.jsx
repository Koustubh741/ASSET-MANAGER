import Link from 'next/link';
import {
    Search, Eye, Split, Calendar, ClipboardCheck,
    Ticket, Network, Users, DollarSign, Bot, FileText,
    ChevronDown, ChevronUp, Package, UserMinus, Smartphone, Database
} from 'lucide-react';
import React, { useState } from 'react';
import AIAssistantSidebar from '@/components/AIAssistantSidebar';
import OrganizationHierarchy from '@/components/OrganizationHierarchy';
import BulkImport from '@/components/BulkImport';

const PLATFORM_WORKFLOWS = [
    {
        id: 'asset-request',
        title: 'Asset Request & Procurement',
        icon: Package,
        color: 'blue',
        steps: [
            { step: 1, role: 'Employee', action: 'Submits request with justification', state: 'SUBMITTED' },
            { step: 2, role: 'Manager', action: 'Reviews and approves or rejects', state: 'MANAGER_APPROVED' },
            { step: 3, role: 'IT', action: 'Verifies technical specs and approves', state: 'IT_APPROVED' },
            { step: 4, role: 'Manager', action: 'Confirms IT decision (Oversight Phase)', state: 'MANAGER_CONFIRMED_IT' },
            { step: 5, role: 'Procurement', action: 'Creates Purchase Order (PO)', state: 'PROCUREMENT_REQUIRED / PO_CREATED' },
            { step: 6, role: 'Finance', action: 'Validates and approves budget for PO', state: 'PO_VALIDATED → FINANCE_APPROVED' },
            { step: 7, role: 'Procurement', action: 'Confirms delivery from vendor', state: 'DELIVERY_CONFIRMED' },
            { step: 8, role: 'Inventory Manager', action: 'Performs Quality Control (QC) and allocates asset', state: 'QC_PENDING → ALLOCATED' },
            { step: 9, role: 'Employee', action: 'Verifies asset condition; Accepts or Reports Issue', state: 'USER_ACCEPTANCE_PENDING' },
            { step: 10, role: 'Manager', action: 'Confirms final assignment (Oversight Phase)', state: 'MANAGER_CONFIRMED_ASSIGNMENT' },
            { step: 11, role: 'System', action: 'Asset marked In Use; workflow closed', state: 'IN_USE → CLOSED' },
        ],
        note: 'BYOD requests branch to compliance path after IT approval. Verification rejections or returns automatically trigger high/medium priority support tickets.',
    },
    {
        id: 'byod-compliance',
        title: 'BYOD Compliance Path (after IT Approval)',
        icon: Smartphone,
        color: 'sky',
        steps: [
            { step: 1, role: 'Employee', action: 'Submits BYOD request; follows approval path through Manager and IT', state: 'SUBMITTED → MANAGER_CONFIRMED_IT' },
            { step: 2, role: 'System', action: 'Routes to BYOD compliance path (no procurement)', state: 'BYOD path' },
            { step: 3, role: 'IT', action: 'Runs compliance check via Policy Engine / MDM Enrollment', state: 'BYOD_COMPLIANCE_CHECK' },
            { step: '4a', role: 'System', action: 'If compliant: device registered; user accepts terms', state: 'User registration → IN_USE' },
            { step: '4b', role: 'System', action: 'If non-compliant: request rejected', state: 'BYOD_REJECTED → CLOSED' },
            { step: 5, role: 'System', action: 'Device in use or workflow closed', state: 'IN_USE → CLOSED' },
        ],
        note: 'BYOD devices are automatically offboarded (data wipe/unenroll) during the Employee Exit workflow.',
    },
    {
        id: 'ticketing',
        title: 'IT Support (Ticketing)',
        icon: Ticket,
        color: 'rose',
        steps: [
            { step: 1, role: 'User', action: 'Creates ticket (Manual or Auto-generated from Return/Verification Failure)', state: 'Open' },
            { step: 2, role: 'IT Technician', action: 'Picks up ticket; completes mandatory diagnostic checklist', state: 'In Progress' },
            { step: 3, role: 'IT Technician', action: 'Performs remediation (fix, replacement, or escalation)', state: 'Pending' },
            { step: 4, role: 'IT Technician', action: 'Submits resolution notes and closes ticket', state: 'Closed' },
        ],
        note: 'Asset returns trigger Medium-priority tickets. Verification failures trigger High-priority tickets with automated diagnostic checklists.',
    },
    {
        id: 'exit',
        title: 'Employee Exit (Offboarding)',
        icon: UserMinus,
        color: 'amber',
        steps: [
            { step: 1, role: 'Admin', action: 'Initiates exit workflow for departing employee', state: 'Initiated' },
            { step: 2, role: 'System', action: 'Freezes asset and BYOD snapshot; locks changes', state: 'Snapshot' },
            { step: 3, role: 'Inventory Manager', action: 'Reclaims physical company-owned assets', state: 'Reclaim' },
            { step: 4, role: 'IT', action: 'Wipes data and unenrolls BYOD devices', state: 'Wipe' },
            { step: 5, role: 'Admin', action: 'Finalizes exit and disables account', state: 'Closed' },
        ],
        note: 'The system automatically snapshots the entire asset state to prevent data loss or unauthorized device retention.',
    },
];

const NODE_WIDTH = 152;
const NODE_HEIGHT = 68;
const GAP = 28;
const ARROW_LEN = 20;

const colorToStroke = { blue: '#3b82f6', rose: '#f43f5e', amber: '#f59e0b', sky: '#0ea5e9' };
const colorToFill = { blue: 'rgba(59,130,246,0.12)', rose: 'rgba(244,63,94,0.12)', amber: 'rgba(245,158,11,0.12)', sky: 'rgba(14,165,233,0.12)' };

function WorkflowFlowchart({ workflow }) {
    const steps = Array.isArray(workflow?.steps) ? workflow.steps : [];
    const stroke = colorToStroke[workflow.color] || colorToStroke.blue;
    const fill = colorToFill[workflow.color] || colorToFill.blue;
    const isByod = workflow.id === 'byod-compliance';
    const hasBranch = isByod && steps.some((s) => String(s.step) === '4a' || String(s.step) === '4b');

    let nodes = [];
    let arrows = [];
    let width = 400;
    let height = 200;

    if (hasBranch) {
        // Special Layout for BYOD with branch at step 4
        // linear contains 1, 2, 3, 4a, 5
        const linear = steps.filter((s) => String(s.step) !== '4b');
        const idx4a = linear.findIndex((s) => String(s.step) === '4a');
        const safeIdx = idx4a >= 0 ? idx4a : linear.length;

        const pre = linear.slice(0, safeIdx); // Steps 1, 2, 3
        const post = linear.slice(safeIdx); // Steps 4a, 5
        const step4b = steps.find((s) => String(s.step) === '4b');

        // Layout rows
        // Row 0: Linear pre-branch steps
        pre.forEach((s, i) => {
            const x = 40 + i * (NODE_WIDTH + GAP + ARROW_LEN);
            nodes.push({ ...s, x, y: 40 });
            if (i < pre.length - 1) {
                arrows.push({
                    from: [x + NODE_WIDTH, 40 + NODE_HEIGHT / 2],
                    to: [x + NODE_WIDTH + GAP + ARROW_LEN - 10, 40 + NODE_HEIGHT / 2]
                });
            }
        });

        const lastPreX = 40 + (pre.length - 1) * (NODE_WIDTH + GAP + ARROW_LEN);
        const centerX = lastPreX + NODE_WIDTH / 2;

        // Row 1: The branch (4a and 4b)
        const row1Y = 40 + NODE_HEIGHT + GAP + 20;
        const x4a = centerX - NODE_WIDTH - GAP;
        const x4b = centerX + GAP;

        nodes.push({ ...post[0], x: x4a, y: row1Y });
        nodes.push({ ...step4b, x: x4b, y: row1Y });

        // Arrows from Step 3 to 4a and 4b
        arrows.push({ from: [centerX, 40 + NODE_HEIGHT], to: [x4a + NODE_WIDTH / 2, row1Y], label: 'Compliant' });
        arrows.push({ from: [centerX, 40 + NODE_HEIGHT], to: [x4b + NODE_WIDTH / 2, row1Y], label: 'Reject' });

        // Row 2: Final step 5
        if (post[1]) {
            const row2Y = row1Y + NODE_HEIGHT + GAP + 20;
            const x5 = centerX - NODE_WIDTH / 2;
            nodes.push({ ...post[1], x: x5, y: row2Y });

            arrows.push({ from: [x4a + NODE_WIDTH / 2, row1Y + NODE_HEIGHT], to: [x5 + NODE_WIDTH / 2, row2Y] });
            arrows.push({ from: [x4b + NODE_WIDTH / 2, row1Y + NODE_HEIGHT], to: [x5 + NODE_WIDTH / 2, row2Y] });
        }

        // Calculate total bounds
        const minX = Math.min(...nodes.map(n => n.x));
        const maxX = Math.max(...nodes.map(n => n.x + NODE_WIDTH));
        const maxY = Math.max(...nodes.map(n => n.y + NODE_HEIGHT));

        width = maxX + 40;
        height = maxY + 40;
    } else {
        // Standard Linear Layout
        width = steps.length * (NODE_WIDTH + GAP + ARROW_LEN) - GAP - ARROW_LEN + 80;
        height = NODE_HEIGHT + 100;
        steps.forEach((s, i) => {
            const x = 40 + i * (NODE_WIDTH + GAP + ARROW_LEN);
            const y = 50;
            nodes.push({ ...s, x, y });
            if (i < steps.length - 1) {
                arrows.push({
                    from: [x + NODE_WIDTH, y + NODE_HEIGHT / 2],
                    to: [x + NODE_WIDTH + GAP + ARROW_LEN - 10, y + NODE_HEIGHT / 2],
                });
            }
        });
    }

    return (
        <div className="overflow-x-auto overflow-y-auto rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 p-4">
            <svg viewBox={`0 0 ${Number(width) || 400} ${Number(height) || 200}`} className="min-w-full" style={{ minHeight: 200 }}>
                <defs>
                    <marker id={`arrow-${workflow.id}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L9,3 z" fill={stroke} />
                    </marker>
                </defs>
                {arrows.map((ar, i) => {
                    const [x1, y1] = ar.from;
                    const [x2, y2] = ar.to;
                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const ax = (dx / len) * (len - 10) + x1;
                    const ay = (dy / len) * (len - 10) + y1;
                    return (
                        <g key={i}>
                            <line x1={x1} y1={y1} x2={ax} y2={ay} stroke={stroke} strokeWidth="2" markerEnd={`url(#arrow-${workflow.id})`} />
                            {ar.label && (
                                <text x={(x1 + x2) / 2} y={Math.min(y1, y2) - 6} fill="#94a3b8" fontSize="10" textAnchor="middle">{ar.label}</text>
                            )}
                        </g>
                    );
                })}
                {nodes.map((n, i) => (
                    <g key={i}>
                        <rect
                            x={n.x}
                            y={n.y}
                            width={NODE_WIDTH}
                            height={NODE_HEIGHT}
                            rx="8"
                            fill={fill}
                            stroke={stroke}
                            strokeWidth="1.5"
                        />
                        <text x={n.x + NODE_WIDTH / 2} y={n.y + 16} fill="#cbd5e1" fontSize="10" fontWeight="600" textAnchor="middle">{String(n.step)}</text>
                        <text x={n.x + NODE_WIDTH / 2} y={n.y + 30} fill="#94a3b8" fontSize="9" textAnchor="middle">{n.role}</text>
                        <text x={n.x + NODE_WIDTH / 2} y={n.y + 44} fill="#64748b" fontSize="8" textAnchor="middle">{n.state}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

export default function EnterpriseFeatures() {
    const [isAIStillOpen, setIsAIStillOpen] = useState(false);
    const [expandedWorkflow, setExpandedWorkflow] = useState(null);
    const [workflowView, setWorkflowView] = useState('list'); // 'list' | 'flowchart'
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'hierarchy'
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

    const features = [
        {
            title: "Smart Filters & Search",
            description: "Advanced asset filtering with category, department, and warranty status.",
            icon: Search,
            href: "/assets/search",
            color: "text-blue-400",
            bg: "bg-blue-400/10",
            border: "border-blue-400/20"
        },
        {
            title: "Saved Views",
            description: "Access and manage your custom saved views for asset lists.",
            icon: Eye,
            href: "/saved-views",
            color: "text-purple-400",
            bg: "bg-purple-400/10",
            border: "border-purple-400/20"
        },
        {
            title: "Asset Comparison",
            description: "Compare two assets side-by-side to analyze specifications.",
            icon: Split,
            href: "/assets/compare",
            color: "text-indigo-400",
            bg: "bg-indigo-400/10",
            border: "border-indigo-400/20"
        },
        {
            title: "Renewals Calendar",
            description: "Visual calendar view for upcoming asset and contract renewals.",
            icon: Calendar,
            href: "/renewals/calendar",
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
            border: "border-emerald-400/20"
        },

        {
            title: "Ticketing System",
            description: "Manage support tickets and service requests.",
            icon: Ticket,
            href: "/tickets",
            color: "text-rose-400",
            bg: "bg-rose-400/10",
            border: "border-rose-400/20"
        },
        {
            title: "User Inventory",
            description: "View assets and software assigned to specific users.",
            icon: Users,
            href: "/users",
            color: "text-cyan-400",
            bg: "bg-cyan-400/10",
            border: "border-cyan-400/20"
        },
        {
            title: "Asset Audit Hub",
            description: "Monitor external discovery and ingestion trails.",
            icon: ClipboardCheck,
            href: "/audit/overview",
            color: "text-amber-400",
            bg: "bg-amber-400/10",
            border: "border-amber-400/20"
        },
        {
            title: "CMDB Visualizer",
            description: "Deep relationship visualization and impact analysis for any infrastructure asset.",
            icon: Network,
            href: "/assets/cmdb-overview",
            color: "text-pink-400",
            bg: "bg-pink-400/10",
            border: "border-pink-400/20"
        },

        {
            title: "Asset Requests",
            description: "Centralized hub for approvals, procurement, and BYOD compliance.",
            icon: FileText,
            href: "/asset-requests",
            color: "text-orange-400",
            bg: "bg-orange-400/10",
            border: "border-orange-400/20"
        },
        {
            title: "Bulk Data Import",
            description: "Import real staff and asset data from CSV or Excel files.",
            icon: Database,
            href: "#",
            isAction: true,
            actionType: 'bulk-import',
            color: "text-blue-400",
            bg: "bg-blue-400/10",
            border: "border-blue-400/20"
        },
        {
            title: "AI Assistant",
            description: "Intelligent sidekick for asset queries.",
            icon: Bot,
            href: "#",
            isAction: true,
            actionType: 'ai-assistant',
            color: "text-sky-400",
            bg: "bg-sky-400/10",
            border: "border-sky-400/20"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8 relative">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                            Enterprise Features Portal
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">
                            Access the new enterprise-grade modules and tools.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-white dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-slate-900 dark:text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-200'}`}
                            >
                                Features Grid
                            </button>
                            <button
                                onClick={() => setViewMode('hierarchy')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'hierarchy' ? 'bg-purple-600 text-slate-900 dark:text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-200'}`}
                            >
                                Org Hierarchy
                            </button>
                        </div>
                        <button
                            onClick={() => setIsAIStillOpen(true)}
                            className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all hover:scale-105"
                        >
                            <Bot size={20} className="text-slate-900 dark:text-white" />
                            <span>AI Assistant</span>
                        </button>
                    </div>
                </header>

                {viewMode === 'hierarchy' ? (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="mb-8">
                            <OrganizationHierarchy />
                        </div>
                    </section>
                ) : (
                    <>
                        {/* Platform Overview - Workflow Understanding */}
                        <section className="mb-12">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <ClipboardCheck size={22} className="text-emerald-400" />
                                Platform Overview – Process Workflows
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-2xl">
                                Understand how each process flows end-to-end. View as a list or as flowcharts.
                            </p>
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => setWorkflowView('list')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${workflowView === 'list' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-400 border border-slate-600 hover:bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    List view
                                </button>
                                <button
                                    onClick={() => setWorkflowView('flowchart')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${workflowView === 'flowchart' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-400 border border-slate-600 hover:bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    Flowchart view
                                </button>
                            </div>
                            {workflowView === 'flowchart' ? (
                                <div className="space-y-8">
                                    {PLATFORM_WORKFLOWS.map((wf) => {
                                        const Icon = wf.icon;
                                        const colorMap = { blue: 'border-blue-500/30', rose: 'border-rose-500/30', amber: 'border-amber-500/30', sky: 'border-sky-500/30' };
                                        const iconColorMap = { blue: 'text-blue-400', rose: 'text-rose-400', amber: 'text-amber-400', sky: 'text-sky-400' };
                                        return (
                                            <div key={wf.id} className={`rounded-xl border ${colorMap[wf.color] || colorMap.blue} bg-white dark:bg-slate-900/30 overflow-hidden`}>
                                                <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-white/5">
                                                    <div className={`p-2 rounded-lg bg-white dark:bg-slate-900/50 ${iconColorMap[wf.color] || iconColorMap.blue}`}>
                                                        <Icon size={20} />
                                                    </div>
                                                    <span className="font-semibold text-slate-900 dark:text-slate-200">{wf.title}</span>
                                                </div>
                                                <div className="p-4">
                                                    <WorkflowFlowchart workflow={wf} />
                                                    {wf.note && <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-3">{wf.note}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {PLATFORM_WORKFLOWS.map((wf) => {
                                        const Icon = wf.icon;
                                        const isExpanded = expandedWorkflow === wf.id;
                                        const colorMap = { blue: 'border-blue-500/30 bg-blue-500/5', rose: 'border-rose-500/30 bg-rose-500/5', amber: 'border-amber-500/30 bg-amber-500/5', sky: 'border-sky-500/30 bg-sky-500/5' };
                                        const iconColorMap = { blue: 'text-blue-400', rose: 'text-rose-400', amber: 'text-amber-400', sky: 'text-sky-400' };
                                        return (
                                            <div
                                                key={wf.id}
                                                className={`rounded-xl border ${colorMap[wf.color] || colorMap.blue} overflow-hidden transition-all`}
                                            >
                                                <button
                                                    onClick={() => setExpandedWorkflow(isExpanded ? null : wf.id)}
                                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-100 dark:bg-white/5 hover:bg-slate-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg bg-white dark:bg-slate-900/50 ${iconColorMap[wf.color] || iconColorMap.blue}`}>
                                                            <Icon size={20} />
                                                        </div>
                                                        <span className="font-semibold text-slate-900 dark:text-slate-200">{wf.title}</span>
                                                    </div>
                                                    {isExpanded ? <ChevronUp size={20} className="text-slate-500 dark:text-slate-400" /> : <ChevronDown size={20} className="text-slate-500 dark:text-slate-400" />}
                                                </button>
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 pt-0 space-y-3">
                                                        {wf.steps.map((s) => (
                                                            <div key={s.step} className="flex gap-4 items-start pl-2 border-l-2 border-slate-700/50 py-1">
                                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-6">{s.step}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">{s.role}</span>
                                                                    <p className="text-slate-700 dark:text-slate-700 text-sm mt-0.5">{s.action}</p>
                                                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-mono mt-1">{s.state}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {wf.note && (
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 italic pl-8 pt-1">{wf.note}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {features.map((feature, idx) => (
                                feature.isAction ? (
                                    <div key={idx} onClick={() => {
                                        if (feature.actionType === 'ai-assistant') setIsAIStillOpen(true);
                                        if (feature.actionType === 'bulk-import') setIsBulkImportOpen(true);
                                    }} className={`h-full p-6 rounded-2xl border ${feature.border} ${feature.bg} hover:bg-opacity-20 transition-all duration-300 hover:scale-[1.02] cursor-pointer backdrop-blur-sm group`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-950/50 ${feature.color}`}>
                                                <feature.icon size={24} />
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100 group-hover:text-slate-900 dark:hover:text-white">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                ) : (
                                    <Link key={idx} href={feature.href} className="group">
                                        <div className={`h-full p-6 rounded-2xl border ${feature.border} ${feature.bg} hover:bg-opacity-20 transition-all duration-300 hover:scale-[1.02] cursor-pointer backdrop-blur-sm`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`p-3 rounded-xl bg-slate-100 dark:bg-slate-950/50 ${feature.color}`}>
                                                    <feature.icon size={24} />
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">OPEN</span>
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100 group-hover:text-slate-900 dark:hover:text-white">
                                                {feature.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </Link>
                                )
                            ))}
                        </div>

                        <div className="mt-12 p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5">
                            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                                Implementation Status
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {features.map((f, i) => (
                                    <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        {f.title}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* AI Sidebar */}
            <AIAssistantSidebar isOpen={isAIStillOpen} onClose={() => setIsAIStillOpen(false)} />

            {/* Bulk Import Modal */}
            <BulkImport isOpen={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} />
        </div>
    );
}
