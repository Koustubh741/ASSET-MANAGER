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
                apiClient.getAssets().then(r => r.data || []),
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
        if (node.status === 'Active' || node.status === 'In Use') return 'var(--color-kinetic-secondary)';
        if (node.status === 'Warning') return 'var(--color-kinetic-gold)';
        if (node.status === 'Critical') return 'var(--color-kinetic-rose)';
        return 'var(--text-muted)';
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
            <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center space-y-8">
                <div className="relative">
                    <div className="w-24 h-24 rounded-none border-b-2 border-app-primary animate-spin"></div>
                    <Network size={32} className="absolute inset-0 m-auto text-app-primary animate-pulse" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-app-text mb-2">Analyzing Network Fabric</h2>
                    <p className="text-app-text-muted text-sm font-mono">Mapping node dependencies & operational status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-app-bg text-app-text flex flex-col overflow-hidden relative font-['Outfit']">
            {/* --- BACKGROUND GRID --- */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle, var(--color-kinetic-primary) 1px, transparent 1px)',
                backgroundSize: '48px 48px'
            }}></div>

            {/* --- TOP HEADER --- */}
            <header className="z-20 border-b border-app-border bg-app-obsidian/80 backdrop-blur-xl px-8 py-5 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-6">
                    <Link href="/enterprise" className="p-2.5 rounded-none bg-app-surface-soft border border-app-border hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface transition-all text-app-text-muted hover:text-app-text">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-none bg-app-primary/10 border border-app-primary/20 flex items-center justify-center text-app-primary shadow-[0_0_15px_rgba(var(--color-kinetic-primary-rgb),0.2)]">
                                <Network size={20} />
                            </div>
                            <h1 className="text-2xl font-black text-app-text tracking-tighter uppercase font-['Space_Grotesk']">Network Topology</h1>
                        </div>
                        <p className="text-[10px] text-app-text-muted uppercase tracking-[0.2em] font-bold mt-1">Foundational Asset Map • v2.0</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-app-surface-soft p-1 rounded-none border border-app-border shadow-inner">
                        {['all', 'Server', 'Network', 'Database'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-app-primary text-app-void shadow-lg shadow-app-primary/20' : 'text-app-text-muted hover:text-app-text'}`}
                            >
                                {type === 'all' ? 'ALL NODES' : type.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchNetworkData}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 rounded-none text-xs font-bold border border-app-border transition-all"
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
                        linkColor={() => 'rgba(var(--color-kinetic-primary-rgb), 0.2)'}
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
                <div className="absolute bottom-10 left-10 w-80 z-30 animate-in slide-in-from-left-6 duration-1000">
                    <div className="bg-app-obsidian/80 backdrop-blur-3xl p-8 border border-app-border rounded-none shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black text-app-text uppercase tracking-[0.3em] flex items-center gap-3">
                                <Zap size={14} className="text-app-gold animate-pulse" />
                                Operational Telemetry
                            </h3>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-none bg-app-void border border-app-border">
                                    <p className="text-[9px] text-app-text-muted uppercase font-black tracking-widest mb-1">Active Nodes</p>
                                    <p className="text-2xl font-black text-app-secondary font-mono">{graphData.nodes.length}</p>
                                </div>
                                <div className="p-4 rounded-none bg-app-void border border-app-border">
                                    <p className="text-[9px] text-app-text-muted uppercase font-black tracking-widest mb-1">Synapse Links</p>
                                    <p className="text-2xl font-black text-app-primary font-mono">{graphData.links.length}</p>
                                </div>
                            </div>

                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-app-text-muted">Fleet Resonance</span>
                                    <span className={`font-mono ${fleetHealth < 90 ? 'text-app-gold' : 'text-app-secondary'}`}>{fleetHealth}%</span>
                                </div>
                                <div className="w-full bg-app-void h-2 rounded-none border border-app-border overflow-hidden p-[2px]">
                                    <div 
                                        className={`h-full transition-all duration-[2000ms] ${fleetHealth < 90 ? 'bg-app-gold' : 'bg-app-secondary'}`} 
                                        style={{ width: `${fleetHealth}%`, boxShadow: `0 0 15px rgba(var(--color-kinetic-${fleetHealth < 90 ? 'gold' : 'secondary'}-rgb), 0.5)` }}
                                    ></div>
                                </div>

                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest pt-2">
                                    <span className="text-app-text-muted">System Entropy</span>
                                    <span className="text-app-text font-mono">{graphData.nodes.length > 0 ? (Math.round((graphData.links.length / graphData.nodes.length) * 100) / 100) : 0} G-U</span>
                                </div>
                        </div>
                    </div>
                </div>

                {/* Node Details Panel (Right) - Slides in when node selected */}
                {selectedNode && (
                    <div className="absolute top-10 right-10 w-96 z-40 animate-in slide-in-from-right-8 duration-1000">
                        <div className="bg-app-obsidian/90 backdrop-blur-3xl p-8 border border-app-border rounded-none shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-app-primary shadow-[0_0_20px_rgba(var(--color-kinetic-primary-rgb),0.8)]"></div>
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex gap-5">
                                    <div className="w-14 h-14 rounded-none border border-app-primary/30 bg-app-primary/10 flex items-center justify-center text-app-primary shadow-[0_0_20px_rgba(var(--color-kinetic-primary-rgb),0.2)]">
                                        <Server size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-app-text tracking-tighter uppercase font-['Space_Grotesk']">{selectedNode.name}</h4>
                                        <p className="text-[10px] text-app-primary uppercase font-black tracking-[0.2em] mt-1">{selectedNode.type} MODULE</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="p-2 bg-app-void hover:bg-app-primary hover:text-app-void border border-app-border transition-all duration-300"
                                >
                                    <ArrowLeft size={16} className="rotate-180" />
                                </button>
                            </div>                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[9px] font-black text-app-text-muted uppercase tracking-[0.4em]">Node Intelligence</label>
                                    <div className="space-y-3 bg-app-void rounded-none p-5 border border-app-border">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-app-text-muted">OPERATIONAL STATUS</span>
                                            <span className={selectedNode.status === 'Active' || selectedNode.status === 'In Use' ? 'text-app-secondary' : 'text-app-gold'}>{selectedNode.status.toUpperCase()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-app-text-muted">NODE MODEL</span>
                                            <span className="text-app-text font-mono">{selectedNode.details?.model || 'GENERIC'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-app-text-muted">HARDWARE VENDOR</span>
                                            <span className="text-app-text font-mono">{selectedNode.details?.vendor || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Link
                                        href={selectedNode.id ? `/assets/${selectedNode.id}` : '#'}
                                        className="flex items-center justify-center gap-3 py-4 rounded-none bg-app-primary hover:bg-app-text text-app-void text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(var(--color-kinetic-primary-rgb),0.3)]"
                                    >
                                        Inspect Node
                                    </Link>
                                    <button className="flex items-center justify-center gap-3 py-4 rounded-none bg-app-void hover:bg-app-obsidian text-app-text text-[10px] font-black uppercase tracking-widest border border-app-border transition-all">
                                        Monitor Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Global Status Bar (Bottom) */}
                <div className="absolute bottom-10 right-10 z-30 hidden xl:flex gap-4">
                    <div className="flex items-center gap-3 px-5 py-3 bg-app-obsidian/80 backdrop-blur-3xl border border-app-border rounded-none shadow-2xl">
                        <Activity size={14} className="text-app-rose animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">Neural Mesh Active <span className="text-app-secondary ml-3 font-mono tracking-normal">● v5.0 SECURE</span></span>
                    </div>
                </div>
            </main>
        </div>
    );
}
