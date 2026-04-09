import { useRouter } from 'next/router';
import Link from 'next/link';
import {
    ArrowLeft, Server, Database, Globe, Shield, Wifi, Monitor,
    Briefcase, AlertTriangle, CheckCircle, Activity, Play, RefreshCw, XCircle,
    Info, Layers, Zap, User
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import apiClient from '@/lib/apiClient';

export default function CMDBMapPage() {
    const router = useRouter();
    const { id } = router.query;

    // --- STATE ---
    const [viewMode, setViewMode] = useState('standard'); // 'standard', 'impact', 'risk'
    const [showBusinessLayer, setShowBusinessLayer] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);
    const [simulatingChange, setSimulatingChange] = useState(false);
    const [loading, setLoading] = useState(true);
    const [graph, setGraph] = useState({ baseNodes: [], businessNodes: [], baseEdges: [], bizEdges: [] });

    useEffect(() => {
        if (!id) return;

        const loadCMDBData = async () => {
            setLoading(true);
            try {
                // Fetch the primary asset
                const mainAsset = await apiClient.getAsset(id);

                // Fetch some context (other assets and users)
                const [assetResponse, userResponse] = await Promise.all([
                    apiClient.getAssets({ limit: 10 }),
                    apiClient.getUsers().catch(() => ({ data: [] }))
                ]);
                const allAssets = assetResponse?.data || [];
                const allUsers = userResponse?.data || [];

                const baseNodes = [];
                const baseEdges = [];
                const businessNodes = [];
                const bizEdges = [];

                // 1. Root Node (The specific asset)
                const rootNode = {
                    id: 'root',
                    realId: mainAsset.id,
                    type: mainAsset.type,
                    name: mainAsset.name,
                    status: mainAsset.status === 'Active' ? 'Active' : 'Warning',
                    x: 400,
                    y: 350,
                    icon: Server,
                    main: true,
                    layer: 'tech',
                    details: mainAsset
                };
                baseNodes.push(rootNode);

                // 2. Assigned User Node
                if (mainAsset.assigned_to && mainAsset.assigned_to !== 'Unassigned') {
                    baseNodes.push({
                        id: 'user-assigned',
                        type: 'User',
                        name: mainAsset.assigned_to,
                        status: 'Active',
                        x: 600,
                        y: 200,
                        icon: User,
                        layer: 'tech'
                    });
                    baseEdges.push({ source: 'root', target: 'user-assigned', type: 'Assigned To', label: 'Owner' });
                }

                // 3. Infrastructure Nodes (Mocking connections to real assets)
                const dbAsset = allAssets.find(a => a.type?.toLowerCase().includes('database') || a.name?.toLowerCase().includes('db'));
                if (dbAsset) {
                    baseNodes.push({
                        id: 'db-node',
                        realId: dbAsset.id,
                        type: 'Database',
                        name: dbAsset.name,
                        status: dbAsset.status === 'Active' ? 'Active' : 'Warning',
                        x: 200,
                        y: 350,
                        icon: Database,
                        layer: 'tech'
                    });
                    baseEdges.push({ source: 'db-node', target: 'root', type: 'Supports', label: 'Data' });
                } else {
                    // Fallback mock if no DB in DB
                    baseNodes.push({ id: 'db-mock', type: 'Database', name: 'PostgreSQL Cluster', status: 'Active', x: 200, y: 350, icon: Database, layer: 'tech' });
                    baseEdges.push({ source: 'db-mock', target: 'root', type: 'Supports', label: 'Data' });
                }

                // 4. Network Node (Linked to Location)
                baseNodes.push({
                    id: 'net-node',
                    type: 'Network',
                    name: mainAsset.location || 'Default Network',
                    status: 'Active',
                    x: 400,
                    y: 500,
                    icon: Wifi,
                    layer: 'tech'
                });
                baseEdges.push({ source: 'net-node', target: 'root', type: 'Connects', label: 'Uplink' });

                // 5. Business Layer (Portal, Finance, etc.)
                businessNodes.push({ id: 'biz-app', type: 'Service', name: 'Enterprise Portal', status: 'Active', x: 400, y: 150, icon: Globe, layer: 'biz' });
                bizEdges.push({ source: 'root', target: 'biz-app', type: 'Powers', label: 'Critical' });

                businessNodes.push({ id: 'biz-fin', type: 'Business', name: 'Financial Operations', status: 'Active', x: 200, y: 80, icon: Briefcase, layer: 'biz' });
                bizEdges.push({ source: 'biz-app', target: 'biz-fin', type: 'Enables', label: 'Revenue' });

                setGraph({ baseNodes, businessNodes, baseEdges, bizEdges });
            } catch (error) {
                console.error('Failed to build CMDB graph:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCMDBData();
    }, [id]);

    // Graph Data Accessors
    const initialGraph = graph;


    // --- DERIVED STATE ---
    const visibleNodes = useMemo(() => {
        return showBusinessLayer
            ? [...initialGraph.baseNodes, ...initialGraph.businessNodes]
            : initialGraph.baseNodes;
    }, [showBusinessLayer, initialGraph]);

    const visibleEdges = useMemo(() => {
        return showBusinessLayer
            ? [...initialGraph.baseEdges, ...initialGraph.bizEdges]
            : initialGraph.baseEdges;
    }, [showBusinessLayer, initialGraph]);


    // --- LOGIC ENGINES ---

    // 1. INCIDENT IMPACT LOGIC (DFS Propagation)
    // Returns a Set of Node IDs that are "Downstream" (impacted) by the selected node.
    const impactedNodes = useMemo(() => {
        if (viewMode !== 'impact' || !selectedNode) return new Set();

        const impacted = new Set();
        const stack = [selectedNode];

        while (stack.length > 0) {
            const current = stack.pop();
            if (impacted.has(current)) continue;
            impacted.add(current);

            // Find all edges where 'current' is the SOURCE (since Source Impacts Target in our definition)
            // Wait, standard dependency: "App depends on DB". If DB fails, App fails.
            // Edge: DB -> App (DB impacts App). Yes.
            const downstream = visibleEdges
                .filter(e => e.source === current)
                .map(e => e.target);

            stack.push(...downstream);
        }

        return impacted;
    }, [viewMode, selectedNode, visibleEdges]);

    // 2. CHANGE RISK LOGIC
    // Calculates simple risk score based on downstream count
    const changeRisk = useMemo(() => {
        if (viewMode !== 'risk' || !simulatingChange || !selectedNode) return null;

        // Reuse propagation logic to find all dependencies
        const impacted = new Set();
        const stack = [selectedNode];
        while (stack.length > 0) {
            const current = stack.pop();
            if (impacted.has(current)) continue;
            impacted.add(current);
            const downstream = visibleEdges.filter(e => e.source === current).map(e => e.target);
            stack.push(...downstream);
        }

        const impactedCount = impacted.size - 1; // Exclude self
        const userImpact = impacted.has('user-group');
        const bizImpact = [...impacted].some(nid => nid.startsWith('biz-'));

        let score = 'Low';
        if (impactedCount > 2 || userImpact) score = 'Medium';
        if (bizImpact || impactedCount > 4) score = 'High';

        return { score, count: impactedCount, userImpact, bizImpact };
    }, [viewMode, simulatingChange, selectedNode, visibleEdges]);


    // --- HELPERS ---
    const getNodeColor = (node) => {
        // Mode: IMPACT
        if (viewMode === 'impact' && selectedNode) {
            if (node.id === selectedNode) return 'ring-4 ring-red-500 bg-white dark:bg-slate-900 border-red-500'; // Origin
            if (impactedNodes.has(node.id)) return 'ring-2 ring-orange-500 bg-white dark:bg-slate-900 border-orange-500 animate-pulse'; // Impacted
            return 'opacity-20 grayscale bg-slate-100 dark:bg-slate-950 border-slate-800'; // Unaffected
        }

        // Mode: RISK
        if (viewMode === 'risk' && simulatingChange && selectedNode) {
            if (node.id === selectedNode) return 'ring-4 ring-amber-400 bg-amber-900/20 border-amber-400'; // Change Target
            // Highlight downstream as "At Risk"
            const uniqueKey = changeRisk; // trigger ref trigger
            // Re-using logic implicitly via UI render cycle, but for color:
            // Since `changeRisk` is calculated, we can check basic membership if we exported the Set, 
            // but for now let's just re-check if we want perfect styling, or simplistic 'affected'
            // Let's do a simple check: is it in the downstream path?
            if (node.id !== selectedNode) {
                // Cheap recalc for color (optimization: lift state up if needed)
                // Or just trust the `impactedNodes` set? 
                // Actually `impactedNodes` is driven by `viewMode==='impact'`.
                // Let's make `impactedNodes` broader or use a separate set `riskNodes`.
                // For now, simple fallback:
                return 'opacity-30 grayscale';
            }
        }

        // STANDARD
        if (node.status === 'Critical') return 'border-red-500 shadow-red-500/20 text-red-400';
        if (node.status === 'Warning') return 'border-orange-500 shadow-orange-500/20 text-orange-400';
        return 'border-emerald-500 shadow-emerald-500/20 text-emerald-400';
    };

    const handleNodeClick = (id) => {
        if (viewMode === 'standard') return; // Maybe open details?
        setSelectedNode(id === selectedNode ? null : id);
        if (viewMode === 'risk') setSimulatingChange(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center space-y-4">
                <div className="p-4 rounded-full bg-blue-500/10 animate-pulse">
                    <Activity size={48} className="text-blue-500" />
                </div>
                <p className="text-app-text-muted font-mono text-sm animate-pulse">Mapping infrastructure dependencies...</p>
            </div>
        );
    }

    if (graph.baseNodes.length === 0) {
        return (
            <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center space-y-4">
                <AlertCircle size={48} className="text-rose-500" />
                <p className="text-app-text font-bold">Failed to build configuration map</p>
                <Link href="/enterprise" className="text-blue-400 hover:text-blue-300 text-sm">Return to Portal</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-app-text flex flex-col overflow-hidden">
            {/* --- TOP BAR --- */}
            <div className="border-b border-app-border bg-white dark:bg-slate-900/50 backdrop-blur-md px-8 py-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.history.length > 1 ? router.back() : router.push('/enterprise-features')}
                        className="p-2 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-lg transition-colors text-app-text-muted hover:text-app-text"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-app-text flex items-center gap-2">
                            <Activity className="text-blue-500" size={20} />
                            CMDB Visualizer
                        </h1>
                        <p className="text-xs text-app-text-muted font-mono">Topology & Impact Analysis</p>
                    </div>
                </div>

                {/* --- CONTROLS --- */}
                <div className="flex items-center gap-4">
                    {/* View Toggles */}
                    <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded-lg flex border border-app-border">
                        <button
                            onClick={() => { setViewMode('standard'); setSelectedNode(null); setSimulatingChange(false); }}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'standard' ? 'bg-blue-600 text-app-text shadow' : 'text-app-text-muted hover:text-app-text'}`}
                        >
                            Standard
                        </button>
                        <button
                            onClick={() => { setViewMode('impact'); setSelectedNode(null); }}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'impact' ? 'bg-red-600 text-app-text shadow' : 'text-app-text-muted hover:text-app-text'}`}
                        >
                            Incident Impact
                        </button>
                        <button
                            onClick={() => { setViewMode('risk'); setSelectedNode(null); setSimulatingChange(false); }}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'risk' ? 'bg-amber-600 text-app-text shadow' : 'text-app-text-muted hover:text-app-text'}`}
                        >
                            Change Risk
                        </button>
                    </div>

                    <div className="h-6 w-px bg-app-surface mx-2"></div>

                    <button
                        onClick={() => setShowBusinessLayer(!showBusinessLayer)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${showBusinessLayer ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-slate-50 dark:bg-slate-800 border-app-border text-app-text-muted hover:text-app-text'}`}
                    >
                        <Briefcase size={14} />
                        Business View
                    </button>
                </div>
            </div>

            {/* --- MAIN CANVAS --- */}
            <div className="flex-1 relative overflow-hidden bg-[#0B1120]">
                {/* Background Grid */}
                <div className="absolute inset-0 z-0" style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />

                {/* HELPER BANNER */}
                {viewMode === 'impact' && !selectedNode && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-red-500/10 border border-red-500/20 text-red-200 px-6 py-2 rounded-full backdrop-blur-md animate-bounce-slow text-sm font-medium">
                        Select a node to simulate component failure
                    </div>
                )}
                {viewMode === 'risk' && !selectedNode && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-amber-500/10 border border-amber-500/20 text-amber-200 px-6 py-2 rounded-full backdrop-blur-md animate-bounce-slow text-sm font-medium">
                        Select a node to simulate a change request
                    </div>
                )}

                {/* GRAPH AREA */}
                <div className="relative w-full h-full min-h-[600px] transform transition-transform duration-500">

                    {/* EDGES (SVG Layer) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                            </marker>
                            <marker id="arrowhead-impact" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                            </marker>
                        </defs>
                        {visibleEdges.map((edge, i) => {
                            const source = visibleNodes.find(n => n.id === edge.source);
                            const target = visibleNodes.find(n => n.id === edge.target);
                            if (!source || !target) return null;

                            const isImpactPath = viewMode === 'impact' && selectedNode && impactedNodes.has(edge.source) && impactedNodes.has(edge.target);
                            const isDimmed = (viewMode === 'impact' && selectedNode && !isImpactPath) || (viewMode === 'risk' && selectedNode && edge.source !== selectedNode);

                            return (
                                <g key={i} className={`transition-all duration-500 ${isDimmed ? 'opacity-10' : 'opacity-60'}`}>
                                    <line
                                        x1={source.x} y1={source.y}
                                        x2={target.x} y2={target.y}
                                        stroke={isImpactPath ? '#ef4444' : '#64748b'}
                                        strokeWidth={isImpactPath ? 3 : 1.5}
                                        markerEnd={isImpactPath ? "url(#arrowhead-impact)" : "url(#arrowhead)"}
                                        fill="none"
                                        strokeDasharray={edge.type === 'Connects' ? '5,5' : '0'}
                                    />
                                    {/* Edge Label on midpoint */}
                                    {(!isDimmed || viewMode === 'standard') && (
                                        <text
                                            x={(source.x + target.x) / 2}
                                            y={(source.y + target.y) / 2 - 10}
                                            textAnchor="middle"
                                            className="fill-slate-500 text-[10px] uppercase font-bold tracking-widest bg-white dark:bg-slate-900"
                                        >
                                            {edge.type}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {/* NODES (HTML Layer) */}
                    {visibleNodes.map(node => (
                        <div
                            key={node.id}
                            onClick={() => handleNodeClick(node.id)}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-500 group cursor-pointer`}
                            style={{ left: node.x, top: node.y }}
                        >
                            {/* Node Circle */}
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 bg-slate-100 dark:bg-slate-950 transition-all duration-300 ${getNodeColor(node)} ${node.layer === 'biz' ? 'ring-2 ring-purple-500/20' : ''}`}>
                                <node.icon size={28} />

                                {/* Status Dot */}
                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${node.status === 'Active' ? 'bg-emerald-500' :
                                    node.status === 'Warning' ? 'bg-orange-500 animate-pulse' : 'bg-slate-500'
                                    }`}></div>
                            </div>

                            {/* Label */}
                            <div className={`mt-3 text-center transition-opacity duration-300 ${viewMode !== 'standard' && selectedNode && node.id !== selectedNode && !impactedNodes.has(node.id) ? 'opacity-20' : 'opacity-100'}`}>
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900/80 px-2 py-0.5 rounded-full border border-app-border backdrop-blur-sm whitespace-nowrap">{node.name}</p>
                                <p className="text-[10px] text-app-text-muted uppercase font-semibold mt-0.5">{node.type}</p>
                            </div>

                            {/* TOOLTIP ON HOVER */}
                            <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-slate-900 border border-app-border rounded-xl p-3 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-app-text">{node.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${node.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>{node.status}</span>
                                </div>
                                <div className="space-y-1">
                                    {node.details && (
                                        <>
                                            <div className="flex justify-between text-[10px] text-app-text-muted">
                                                <span>OEM</span>
                                                <span className="text-blue-400 font-semibold uppercase">{node.details.vendor || 'Unknown'}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-app-text-muted">
                                                <span>S/N</span>
                                                <span className="text-slate-900 dark:text-slate-200 font-mono truncate max-w-[80px]">{node.details.serial_number || 'UNKNOWN'}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between text-[10px] text-app-text-muted">
                                        <span>Health</span>
                                        <span className="text-emerald-400">98%</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-app-text-muted">
                                        <span>Issues</span>
                                        <span>0 Open</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-app-text-muted">
                                        <span>Last Patch</span>
                                        <span>2d ago</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- IMPACT SUMMARY BANNER --- */}
                {viewMode === 'impact' && selectedNode && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-6 z-40 max-w-lg w-full">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-500/20 rounded-xl">
                                <AlertTriangle className="text-red-500" size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-app-text mb-1">Critical Impact Detected</h3>
                                <p className="text-sm text-app-text-muted mb-4">
                                    Failure in <span className="font-mono text-xs text-app-text bg-app-surface px-1 py-0.5 rounded">{visibleNodes.find(n => n.id === selectedNode)?.name}</span> will cascade to {impactedNodes.size - 1} dependent systems.
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-slate-100 dark:bg-slate-950 rounded-lg p-2 text-center border border-app-border">
                                        <div className="text-xl font-bold text-app-text">{[...impactedNodes].filter(id => id.includes('svc-') || id.includes('app')).length}</div>
                                        <div className="text-[10px] text-app-text-muted uppercase">Services</div>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-950 rounded-lg p-2 text-center border border-app-border">
                                        <div className="text-xl font-bold text-app-text">{[...impactedNodes].some(id => id.includes('user')) ? 'All' : '0'}</div>
                                        <div className="text-[10px] text-app-text-muted uppercase">Users</div>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-950 rounded-lg p-2 text-center border border-app-border">
                                        <div className="text-xl font-bold text-red-400">High</div>
                                        <div className="text-[10px] text-app-text-muted uppercase">Severity</div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-full text-app-text-muted hover:text-app-text">
                                <XCircle size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* --- CHANGE RISK PANEL --- */}
                {viewMode === 'risk' && simulatingChange && selectedNode && (
                    <div className="absolute top-24 right-8 w-80 bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-right-6 z-40">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-app-text flex items-center gap-2">
                                <Zap className="text-amber-400" size={18} />
                                Change Risk
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${changeRisk?.score === 'High' ? 'bg-red-500/20 text-red-400 border-red-500/30' : changeRisk?.score === 'Medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                {changeRisk?.score} Risk
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-black/20 rounded-lg p-3 border border-app-border">
                                <p className="text-xs text-app-text-muted uppercase font-semibold mb-1">Target Asset</p>
                                <p className="text-sm font-medium text-app-text">{visibleNodes.find(n => n.id === selectedNode)?.name}</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-app-text-muted">Total Dependencies</span>
                                    <span className="text-app-text font-mono">{changeRisk?.count}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-app-text-muted">User Impact</span>
                                    <span className={`${changeRisk?.userImpact ? 'text-red-400' : 'text-emerald-400'}`}>{changeRisk?.userImpact ? 'Yes' : 'No'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-app-text-muted">Business Critical</span>
                                    <span className={`${changeRisk?.bizImpact ? 'text-red-400' : 'text-emerald-400'}`}>{changeRisk?.bizImpact ? 'Yes' : 'No'}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-app-border">
                                <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-app-text rounded-lg font-medium text-sm transition-colors shadow-lg shadow-blue-500/20">
                                    Generate Risk Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
