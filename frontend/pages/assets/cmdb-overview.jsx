import { useRouter } from 'next/router';
import Link from 'next/link';
import {
    ArrowLeft, Server, Database, Globe, Shield, Wifi, Monitor,
    Briefcase, Activity, Zap, Network, Search, Plus
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import apiClient from '@/lib/apiClient';

export default function CMDBOverviewPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [graph, setGraph] = useState({ nodes: [], edges: [] });
    const [viewMode, setViewMode] = useState('topology'); // 'topology', 'depth'

    useEffect(() => {
        const loadGlobalCMDB = async () => {
            setLoading(true);
            try {
                // Fetch critical assets (Servers, Switches, DBs)
                const data = await apiClient.getAssets();
                setAssets(data);

                // Filter for "Infrastructure" assets to build a core map
                const infra = data.filter(a =>
                    ['Server', 'Network', 'Database', 'Cloud'].includes(a.type) ||
                    a.name.toLowerCase().includes('core') ||
                    a.name.toLowerCase().includes('primary')
                ).slice(0, 12); // Limit for performance/clutter

                const nodes = [];
                const edges = [];

                // Center Point: Enterprise Portal
                nodes.push({
                    id: 'core-portal',
                    type: 'Service',
                    name: 'Enterprise Portal',
                    status: 'Active',
                    x: 400,
                    y: 300,
                    icon: Globe,
                    layer: 'biz',
                    glow: 'shadow-blue-500/50'
                });

                // Arrange infra in a circle around the center
                infra.forEach((asset, i) => {
                    const angle = (i / infra.length) * 2 * Math.PI;
                    const radius = 220;
                    const x = 400 + radius * Math.cos(angle);
                    const y = 300 + radius * Math.sin(angle);

                    const nodeId = `asset-${asset.id}`;
                    nodes.push({
                        id: nodeId,
                        realId: asset.id,
                        name: asset.name,
                        type: asset.type,
                        status: asset.status,
                        x,
                        y,
                        icon: asset.type === 'Database' ? Database :
                            asset.type === 'Network' ? Wifi : Server,
                        layer: 'tech',
                        details: asset
                    });

                    // Logic-based connections
                    if (asset.type === 'Database' || asset.type === 'Server') {
                        edges.push({ source: nodeId, target: 'core-portal', type: 'Supports', label: 'Data' });
                    } else if (asset.type === 'Network') {
                        edges.push({ source: 'core-portal', target: nodeId, type: 'Connects', label: 'Uplink' });
                    }
                });

                setGraph({ nodes, edges });
            } catch (error) {
                console.error('Failed to load CMDB overview:', error);
            } finally {
                setLoading(false);
            }
        };

        loadGlobalCMDB();
    }, []);

    const getNodeColor = (node) => {
        if (node.layer === 'biz') return 'border-blue-500 shadow-blue-500/20 text-blue-400';
        if (node.status === 'Critical') return 'border-red-500 shadow-red-500/20 text-red-400';
        if (node.status === 'Warning') return 'border-orange-500 shadow-orange-500/20 text-orange-400';
        return 'border-emerald-500 shadow-emerald-500/20 text-emerald-400';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center space-y-4">
                <div className="p-4 rounded-full bg-blue-500/10 animate-pulse">
                    <Network size={48} className="text-blue-500" />
                </div>
                <p className="text-app-text-muted font-mono text-sm animate-pulse">Visualizing Enterprise Infrastructure...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-app-text flex flex-col overflow-hidden font-sans">
            {/* --- TOP BAR --- */}
            <div className="border-b border-app-border bg-white dark:bg-slate-900/50 backdrop-blur-md px-8 py-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <Link href="/enterprise" className="p-2 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-lg transition-colors text-app-text-muted hover:text-app-text">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-app-text flex items-center gap-2">
                            <Network className="text-pink-400" size={20} />
                            Global CMDB Topology
                        </h1>
                        <p className="text-xs text-app-text-muted font-mono uppercase tracking-widest">Enterprise Core Infrastructure Map</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-app-border mr-4">
                        <button
                            onClick={() => setViewMode('topology')}
                            className={`px-4 py-1.5 rounded-md text-xs font-semibold ${viewMode === 'topology' ? 'bg-blue-600 text-app-text' : 'text-app-text-muted hover:text-app-text'}`}
                        >
                            Topology
                        </button>
                    </div>
                    <Link href="/assets/search" className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-lg text-xs font-bold border border-app-border transition-all">
                        <Search size={14} />
                        Find Asset
                    </Link>
                </div>
            </div>

            {/* --- CANVAS --- */}
            <div className="flex-1 relative bg-[#0B1120] overflow-hidden">
                {/* Grid */}
                <div className="absolute inset-0 z-0" style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                }} />

                <div className="relative w-full h-full max-w-7xl mx-auto">
                    {/* SVG Edges */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <defs>
                            <marker id="arrow" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#334155" />
                            </marker>
                        </defs>
                        {graph.edges.map((edge, i) => {
                            const source = graph.nodes.find(n => n.id === edge.source);
                            const target = graph.nodes.find(n => n.id === edge.target);
                            if (!source || !target) return null;
                            return (
                                <line
                                    key={i}
                                    x1={source.x} y1={source.y}
                                    x2={target.x} y2={target.y}
                                    stroke="#334155"
                                    strokeWidth="1"
                                    markerEnd="url(#arrow)"
                                />
                            );
                        })}
                    </svg>

                    {/* Nodes */}
                    {graph.nodes.map(node => (
                        <div
                            key={node.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-700"
                            style={{ left: node.x, top: node.y }}
                        >
                            <Link href={node.realId ? `/assets/${node.realId}/cmdb` : '#'}>
                                <div className={`group flex flex-col items-center cursor-pointer`}>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 bg-slate-100 dark:bg-slate-950 transition-all duration-300 hover:scale-110 ${getNodeColor(node)}`}>
                                        <node.icon size={24} />

                                        {/* Glow effect for biz nodes */}
                                        {node.layer === 'biz' && (
                                            <div className="absolute inset-0 rounded-2xl bg-blue-500/10 animate-pulse -z-10 shadow-[0_0_30px_rgba(59,130,246,0.3)]"></div>
                                        )}
                                    </div>
                                    <div className="mt-3 text-center">
                                        <span className="text-[10px] font-bold text-app-text bg-white dark:bg-slate-900 border border-app-border px-2 py-0.5 rounded-full whitespace-nowrap opacity-100 group-hover:bg-blue-600 transition-colors">
                                            {node.name}
                                        </span>
                                        <p className="text-[8px] text-app-text-muted uppercase mt-0.5">{node.type}</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Info Panel */}
                <div className="absolute bottom-8 left-8 p-6 bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-app-border rounded-2xl max-w-xs z-30">
                    <h3 className="text-sm font-bold text-app-text mb-2 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-400" />
                        Infrastructure Insights
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                            <span className="text-app-text-muted">Connected Assets</span>
                            <span className="text-app-text font-mono">{graph.nodes.length - 1}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-app-text-muted">Core Services</span>
                            <span className="text-blue-400 font-mono">1 Active</span>
                        </div>
                        <p className="text-[10px] text-app-text-muted mt-4 border-t border-app-border pt-4">
                            Click on any infrastructure node to drill down into its specific dependency and impact map.
                        </p>
                    </div>
                </div>

                {/* Legend */}
                <div className="absolute top-24 left-8 space-y-2 z-30">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900/50 rounded-lg border border-app-border">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-[10px] text-app-text-muted uppercase font-bold">Business Service</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900/50 rounded-lg border border-app-border">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] text-app-text-muted uppercase font-bold">Critical Infra</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
