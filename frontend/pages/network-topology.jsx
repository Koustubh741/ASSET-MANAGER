import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import {
    Network, Server, Wifi, Database, Globe, ArrowLeft,
    Search, Activity, Zap, Layers, RefreshCcw, Maximize2,
    MoreHorizontal, Shield, Info
} from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/apiClient';
import dynamic from 'next/dynamic';
import React from 'react';

// Import ForceGraph2D dynamically and wrap it to correctly forward refs in Next.js
const ForceGraph2D = dynamic(
    () => import('react-force-graph-2d').then(mod => {
        const FG = mod.default;
        return React.forwardRef((props, ref) => <FG ref={ref} {...props} />);
    }),
    { ssr: false }
);

export default function NetworkTopology() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [relationships, setRelationships] = useState([]);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [fleetHealth, setFleetHealth] = useState(100);
    const [selectedNode, setSelectedNode] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const containerRef = useRef(null);
    const fgRef = useRef();

    const fetchNetworkData = async () => {
        setLoading(true);
        try {
            // Fetch assets and all relationships in parallel
            const [assetsData, relsData, statsData] = await Promise.all([
                apiClient.getAssets(),
                apiClient.getAllRelationships(),
                apiClient.getAssetStats()
            ]);

            // Filter for network/infrastructure assets for initial view
            const networkAssets = assetsData.filter(a =>
                ['Server', 'Network', 'Database', 'Cloud', 'Workstation'].includes(a.type) ||
                a.segment === 'IT'
            );

            setAssets(networkAssets);
            setRelationships(relsData);
            if (statsData?.agent_stats?.average_health) {
                setFleetHealth(Math.round(statsData.agent_stats.average_health));
            }

            // Format for ForceGraph
            const nodes = networkAssets.map(asset => ({
                id: asset.id,
                name: asset.name,
                type: asset.type,
                status: asset.status,
                details: asset,
                icon: getIconForType(asset.type)
            }));

            // Map links from relationships
            const links = relsData
                .filter(rel =>
                    networkAssets.some(a => a.id === rel.source_asset_id) &&
                    networkAssets.some(a => a.id === rel.target_asset_id)
                )
                .map(rel => ({
                    source: rel.source_asset_id,
                    target: rel.target_asset_id,
                    type: rel.relationship_type,
                    criticality: rel.criticality
                }));

            setGraphData({ nodes, links });
        } catch (err) {
            console.error('Failed to fetch network data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNetworkData();
    }, []);

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
        if (node.status === 'Active' || node.status === 'In Use') return '#10b981'; // Emerald 500
        if (node.status === 'Warning') return '#f59e0b'; // Amber 500
        if (node.status === 'Critical') return '#f43f5e'; // Rose 500
        return '#64748b'; // Slate 500
    };

    const filteredData = useMemo(() => {
        if (filterType === 'all') return graphData;

        const filteredNodes = graphData.nodes.filter(n => n.type === filterType);
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = graphData.links.filter(l =>
            nodeIds.has(typeof l.source === 'object' ? l.source.id : l.source) &&
            nodeIds.has(typeof l.target === 'object' ? l.target.id : l.target)
        );

        return { nodes: filteredNodes, links: filteredLinks };
    }, [graphData, filterType]);

    // Root Fix: Adaptive canvas resizing via ResizeObserver
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                setDimensions({ width, height });
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-b-2 border-blue-500 animate-spin"></div>
                    <Network size={32} className="absolute inset-0 m-auto text-blue-500 animate-pulse" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-app-text mb-2">Analyzing Network Fabric</h2>
                    <p className="text-app-text-muted text-sm font-mono">Mapping node dependencies & operational status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-100 dark:bg-slate-950 text-app-text flex flex-col overflow-hidden relative">
            {/* --- BACKGROUND GRID --- */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}></div>

            {/* --- TOP HEADER --- */}
            <header className="z-20 border-b border-app-border bg-white dark:bg-slate-900/40 backdrop-blur-md px-8 py-4 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-6">
                    <Link href="/enterprise" className="p-2.5 rounded-xl bg-app-surface-soft border border-app-border hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-all text-app-text-muted hover:text-app-text">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <Network size={18} />
                            </div>
                            <h1 className="text-xl font-bold text-app-text tracking-tight">Infrastructure Topology</h1>
                        </div>
                        <p className="text-[10px] text-app-text-muted uppercase tracking-[0.2em] font-bold mt-1">Foundational Asset Map • v2.0</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-app-border">
                        {['all', 'Server', 'Network', 'Database'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === type ? 'bg-blue-600 text-app-text shadow-lg shadow-blue-500/20' : 'text-app-text-muted hover:text-app-text'}`}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchNetworkData}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-xl text-xs font-bold border border-app-border transition-all"
                    >
                        <RefreshCcw size={14} />
                        Refresh
                    </button>
                </div>
            </header>

            {/* --- MAIN CANVAS --- */}
            <main className="flex-1 relative overflow-hidden" ref={containerRef}>
                <ForceGraph2D
                    ref={fgRef}
                        graphData={filteredData}
                        width={dimensions.width}
                        height={dimensions.height}
                        backgroundColor="rgba(0,0,0,0)"
                        nodeRelSize={8}
                        nodeColor={n => getNodeColor(n)}
                        linkColor={() => 'rgba(59, 130, 246, 0.2)'}
                        linkWidth={1}
                        linkDirectionalParticles={2}
                        linkDirectionalParticleSpeed={0.005}
                        nodeCanvasObject={(node, ctx, globalScale) => {
                            const label = node.name;
                            const fontSize = 12 / globalScale;
                            ctx.font = `${fontSize}px Inter, sans-serif`;

                            // Draw Circle background
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, 14 / globalScale, 0, 2 * Math.PI, false);
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
                            ctx.fill();
                            ctx.strokeStyle = getNodeColor(node);
                            ctx.lineWidth = 2 / globalScale;
                            ctx.stroke();

                            // Draw Icon (placeholder for now, drawing SVG on canvas is complex)
                            ctx.fillStyle = getNodeColor(node);
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('●', node.x, node.y); // Center dot

                            // Draw Label
                            if (globalScale > 1.5) {
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                                ctx.fillText(label, node.x, node.y + (20 / globalScale));
                            }
                        }}
                        nodeCanvasObjectMode={() => 'after'}
                        onNodeClick={node => setSelectedNode(node)}
                        cooldownTicks={100}
                        onEngineStop={() => {
                            if (fgRef.current && typeof fgRef.current.zoomToFit === 'function') {
                                fgRef.current.zoomToFit(400, 50);
                            }
                        }}
                />

                {/* --- SIDE PANELS --- */}

                {/* Insights Panel (Bottom Left) */}
                <div className="absolute bottom-8 left-8 w-80 z-30 animate-in slide-in-from-left-4 duration-700">
                    <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl p-6 border border-app-border rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-app-text flex items-center gap-2">
                                <Zap size={16} className="text-yellow-400" />
                                Network Health
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-app-surface-soft border border-app-border">
                                    <p className="text-[10px] text-app-text-muted uppercase font-bold">Nodes</p>
                                    <p className="text-lg font-mono text-emerald-400">{graphData.nodes.length}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-app-surface-soft border border-app-border">
                                    <p className="text-[10px] text-app-text-muted uppercase font-bold">Relational Links</p>
                                    <p className="text-lg font-mono text-blue-400">{graphData.links.length}</p>
                                </div>
                            </div>

                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-app-text-muted">Fleet Health</span>
                                    <span className={`font-mono ${fleetHealth < 90 ? 'text-amber-400' : 'text-emerald-400'}`}>{fleetHealth}%</span>
                                </div>
                                <div className="w-full bg-slate-50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${fleetHealth < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                        style={{ width: `${fleetHealth}%` }}
                                    ></div>
                                </div>

                                <div className="flex items-center justify-between text-xs pt-2">
                                    <span className="text-app-text-muted">System Density</span>
                                    <span className="text-app-text font-mono">{graphData.nodes.length > 0 ? (Math.round((graphData.links.length / graphData.nodes.length) * 100) / 100) : 0}</span>
                                </div>
                        </div>
                    </div>
                </div>

                {/* Node Details Panel (Right) - Slides in when node selected */}
                {selectedNode && (
                    <div className="absolute top-8 right-8 w-80 z-40 animate-in slide-in-from-right-4 duration-500">
                        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-2xl p-6 border border-app-border rounded-2xl shadow-2xl">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex gap-4">
                                    <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
                                        <Server size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-app-text">{selectedNode.name}</h4>
                                        <p className="text-[10px] text-app-text-muted uppercase font-bold">{selectedNode.type}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="p-1.5 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-lg text-app-text-muted hover:text-app-text transition-all"
                                >
                                    <ArrowLeft size={16} className="rotate-180" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest">Metadata</label>
                                    <div className="space-y-2 bg-app-surface-soft rounded-xl p-3 border border-app-border">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-app-text-muted">Status</span>
                                            <span className={selectedNode.status === 'Active' || selectedNode.status === 'In Use' ? 'text-emerald-400' : 'text-amber-400'}>{selectedNode.status}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-app-text-muted">Model</span>
                                            <span className="text-app-text font-mono whitespace-nowrap overflow-hidden text-ellipsis ml-4">{selectedNode.details?.model || 'Generic Node'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-app-text-muted">Vendor</span>
                                            <span className="text-app-text font-mono">{selectedNode.details?.vendor || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Link
                                        href={selectedNode.id ? `/assets/${selectedNode.id}` : '#'}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-app-text text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        Inspect
                                    </Link>
                                    <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted text-xs font-bold border border-app-border transition-all">
                                        Monitor
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Global Status Bar (Bottom) */}
                <div className="absolute bottom-8 right-8 z-30 hidden xl:flex gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-app-border rounded-xl shadow-lg">
                        <Activity size={12} className="text-purple-400" />
                        <span className="text-[10px] font-mono text-app-text-muted">Live Traffic Mapping <span className="text-emerald-400 ml-2">● Online</span></span>
                    </div>
                </div>
            </main>
        </div>
    );
}
