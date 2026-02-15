import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import {
    Network, Server, Wifi, Database, Globe, ArrowLeft,
    Search, Activity, Zap, Layers, RefreshCcw, Maximize2,
    MoreHorizontal, Shield, Info
} from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/apiClient';

export default function NetworkTopology() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [graph, setGraph] = useState({ nodes: [], edges: [] });
    const [selectedNode, setSelectedNode] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const containerRef = useRef(null);

    useEffect(() => {
        const fetchNetworkData = async () => {
            setLoading(true);
            try {
                // Fetch assets, focuses on network/infrastructure
                const data = await apiClient.getAssets();
                const networkAssets = data.filter(a =>
                    ['Server', 'Network', 'Database', 'Cloud', 'Workstation'].includes(a.type) ||
                    a.segment === 'IT'
                );

                setAssets(networkAssets);
                generateGraph(networkAssets);
            } catch (err) {
                console.error('Failed to fetch network data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNetworkData();
    }, []);

    const generateGraph = (networkAssets) => {
        const nodes = [];
        const edges = [];

        // Dynamic large canvas center for max clarity
        const centerX = 800;
        const centerY = 600;

        // 1. Core Node (Backbone)
        nodes.push({
            id: 'core-backbone',
            name: 'Core Backbone',
            type: 'Network',
            status: 'Active',
            x: centerX,
            y: centerY,
            isCore: true,
            icon: Network,
            color: 'text-blue-400',
            glow: 'shadow-blue-500/50'
        });

        // 2. Group assets by type
        const groups = {};
        networkAssets.forEach(asset => {
            if (!groups[asset.type]) groups[asset.type] = [];
            groups[asset.type].push(asset);
        });

        const sortedTypes = Object.keys(groups);
        const totalNonCoreNodes = networkAssets.length;

        // Configuration for clarity
        const LABEL_RADIUS = 280;
        const INNER_RING_RADIUS = 400;
        const OUTER_RING_RADIUS = 550;

        let globalAssetCounter = 0;

        sortedTypes.forEach((type, typeIndex) => {
            const assetsInGroup = groups[type];

            // Calculate sector for this group
            const groupDensity = assetsInGroup.length / (totalNonCoreNodes || 1);
            const groupStartAngle = (globalAssetCounter / (totalNonCoreNodes || 1)) * 2 * Math.PI;
            const groupMidAngle = groupStartAngle + (groupDensity * Math.PI);

            // Type Label
            nodes.push({
                id: `type-label-${type}`,
                name: type.toUpperCase(),
                type: 'Label',
                x: centerX + LABEL_RADIUS * Math.cos(groupMidAngle),
                y: centerY + LABEL_RADIUS * Math.sin(groupMidAngle),
                isLabel: true
            });

            assetsInGroup.forEach((asset, assetIndex) => {
                // Alternating rings for dense groups
                const angle = (globalAssetCounter / (totalNonCoreNodes || 1)) * 2 * Math.PI;
                const isOuter = (assetIndex % 2 === 1);
                const radius = isOuter ? OUTER_RING_RADIUS : INNER_RING_RADIUS;

                // Add minor jitter within rings to prevent exact alignment overlaps
                const jitterAngle = (Math.random() - 0.5) * 0.02;
                const finalAngle = angle + jitterAngle;

                const x = centerX + radius * Math.cos(finalAngle);
                const y = centerY + radius * Math.sin(finalAngle);

                const nodeId = `asset-${asset.id}`;
                nodes.push({
                    id: nodeId,
                    realId: asset.id,
                    name: asset.name,
                    type: asset.type,
                    status: asset.status,
                    x,
                    y,
                    icon: getIconForType(asset.type),
                    details: asset
                });

                // Edge to backbone
                edges.push({
                    id: `edge-${nodeId}`,
                    source: 'core-backbone',
                    target: nodeId,
                    status: asset.status === 'Active' ? 'active' : 'warning'
                });

                globalAssetCounter++;
            });
        });

        setGraph({ nodes, edges });
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'Server': return Server;
            case 'Database': return Database;
            case 'Network': return Wifi;
            case 'Cloud': return Globe;
            default: return Server;
        }
    };

    const getNodeColor = (node) => {
        if (node.isCore) return 'border-blue-500 text-blue-400 bg-blue-500/10 scale-110';
        if (node.status === 'Active' || node.status === 'In Use') return 'border-emerald-500 text-emerald-400 hover:border-emerald-400';
        if (node.status === 'Warning') return 'border-amber-500 text-amber-400';
        if (node.status === 'Critical') return 'border-rose-500 text-rose-400';
        return 'border-slate-500 text-slate-400';
    };

    const filteredNodes = useMemo(() => {
        if (filterType === 'all') return graph.nodes;
        return graph.nodes.filter(n => n.isCore || n.type === filterType);
    }, [graph.nodes, filterType]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-b-2 border-blue-500 animate-spin"></div>
                    <Network size={32} className="absolute inset-0 m-auto text-blue-500 animate-pulse" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Analyzing Network Fabric</h2>
                    <p className="text-slate-500 text-sm font-mono">Mapping node dependencies & operational status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-auto relative">
            {/* --- BACKGROUND GRID --- */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}></div>

            {/* --- TOP HEADER --- */}
            <header className="z-20 border-b border-white/5 bg-slate-900/40 backdrop-blur-md px-8 py-4 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-6">
                    <Link href="/enterprise" className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-400 hover:text-white">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <Network size={18} />
                            </div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Infrastructure Topology</h1>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mt-1">Foundational Asset Map • v1.5</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-800/80 p-1 rounded-xl border border-white/5">
                        {['all', 'Server', 'Network', 'Database'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === type ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold border border-white/5 transition-all">
                        <RefreshCcw size={14} />
                        Re-Scan
                    </button>
                </div>
            </header>

            {/* --- MAIN CANVAS --- */}
            <main className="flex-1 relative overflow-auto flex min-h-[1200px] min-w-[1600px]" ref={containerRef}>
                {/* SVG Connections Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                        <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {graph.edges.map(edge => {
                        const source = graph.nodes.find(n => n.id === edge.source);
                        const target = graph.nodes.find(n => n.id === edge.target);
                        if (!source || !target) return null;

                        // Only show if both nodes are visible in filtered set
                        if (filterType !== 'all' && target.type !== filterType) return null;

                        return (
                            <g key={edge.id}>
                                <path
                                    d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                                    stroke={edge.status === 'warning' ? '#f59e0b' : '#3b82f6'}
                                    strokeWidth="1"
                                    strokeOpacity="0.3"
                                    fill="none"
                                />
                                {/* Pulsing Data Flow Element */}
                                <circle r="2" fill="#3b82f6" opacity="0.6">
                                    <animateMotion
                                        dur={`${3 + Math.random() * 4}s`}
                                        repeatCount="indefinite"
                                        path={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                                    />
                                    <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
                                </circle>
                            </g>
                        );
                    })}
                </svg>

                {/* Nodes Layer */}
                <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                    {filteredNodes.map(node => (
                        <div
                            key={node.id}
                            style={{ left: node.x, top: node.y }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                        >
                            {node.isLabel ? (
                                <div className="px-3 py-1 bg-slate-800/40 backdrop-blur-sm border border-white/5 rounded-full">
                                    <span className="text-[10px] font-black text-slate-500 tracking-[0.2em]">{node.name}</span>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setSelectedNode(node)}
                                    className={`group relative flex flex-col items-center cursor-pointer transition-all duration-500 hover:scale-110 ${selectedNode?.id === node.id ? 'z-50' : ''}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl bg-slate-950/80 backdrop-blur-md border-2 flex items-center justify-center transition-all duration-300 shadow-xl ${getNodeColor(node)} ${selectedNode?.id === node.id ? 'ring-4 ring-blue-500/20 shadow-blue-500/30' : ''}`}>
                                        <node.icon size={24} />

                                        {/* Connectivity Ping */}
                                        {node.status === 'Active' && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse"></div>
                                        )}
                                    </div>

                                    <div className="mt-2 text-center max-w-[120px]">
                                        <p className="text-[10px] font-bold text-white truncate px-2 py-0.5 rounded-full bg-slate-900/80 border border-white/5 whitespace-nowrap group-hover:bg-blue-600 transition-colors">
                                            {node.name}
                                        </p>
                                        <p className="text-[8px] text-slate-500 uppercase mt-0.5 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                            {node.type} • {node.status}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* --- SIDE PANELS --- */}

                {/* Insights Panel (Bottom Left) */}
                <div className="absolute bottom-8 left-8 w-80 z-30 animate-in slide-in-from-left-4 duration-700">
                    <div className="glass-panel p-6 border border-white/5 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Zap size={16} className="text-yellow-400" />
                                Network Health
                            </h3>
                            <button className="text-slate-500 hover:text-white transition-colors">
                                <Maximize2 size={14} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Uptime</p>
                                    <p className="text-lg font-mono text-emerald-400">99.98%</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Latency</p>
                                    <p className="text-lg font-mono text-blue-400">12ms</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">Active Nodes</span>
                                    <span className="text-white font-mono">{graph.nodes.filter(n => n.status === 'Active' || n.status === 'In Use').length}</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full w-[85%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Node Details Panel (Right) - Slides in when node selected */}
                {selectedNode && (
                    <div className="absolute top-8 right-8 w-80 z-40 animate-in slide-in-from-right-4 duration-500">
                        <div className="glass-panel p-6 border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex gap-4">
                                    <div className={`p-3 rounded-xl border ${getNodeColor(selectedNode)}`}>
                                        <selectedNode.icon size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">{selectedNode.name}</h4>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">{selectedNode.type}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"
                                >
                                    <ArrowLeft size={16} className="rotate-180" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metadata</label>
                                    <div className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Status</span>
                                            <span className={selectedNode.status === 'Active' ? 'text-emerald-400' : 'text-amber-400'}>{selectedNode.status}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Role</span>
                                            <span className="text-white font-mono whitespace-nowrap overflow-hidden text-ellipsis ml-4">{selectedNode.details?.model || 'Generic Node'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">IP Addr</span>
                                            <span className="text-white font-mono">10.0.1.{(Math.random() * 254).toFixed(0)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Link
                                        href={selectedNode.realId ? `/assets/${selectedNode.realId}` : '#'}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        Inspect
                                    </Link>
                                    <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition-all">
                                        Monitor
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Global Status Bar (Bottom) */}
                <div className="absolute bottom-8 right-8 z-30 hidden xl:flex gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-lg">
                        <Activity size={12} className="text-purple-400" />
                        <span className="text-[10px] font-mono text-slate-400">CPU Usage: <span className="text-white">42%</span></span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-lg">
                        <Shield size={12} className="text-emerald-400" />
                        <span className="text-[10px] font-mono text-slate-400">Traffic: <span className="text-white">Encrypted</span></span>
                    </div>
                </div>
            </main>
        </div>
    );
}
