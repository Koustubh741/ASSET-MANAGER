import React, { useState, useEffect, useRef } from 'react';
import { Users, ChevronRight, ChevronDown, User, Shield, Briefcase, Zap, Activity, Database, Terminal } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const NeuralMatrix = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 transition-opacity duration-1000">
            <div className="absolute inset-0 pixel-grid-overlay opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
            <div className="flex flex-wrap gap-1 p-2">
                {Array.from({ length: 200 }).map((_, i) => (
                    <span key={i} className="matrix-text-ambient" style={{ animationDelay: `${Math.random() * 5}s` }}>
                        {Math.random() > 0.5 ? '0' : '1'}
                    </span>
                ))}
            </div>
        </div>
    );
};

const HierarchyNode = ({ node, level = 0, viewMode = 'users', isLast = false }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    const getRoleIcon = (role) => {
        if (viewMode === 'departments') return <Database size={14} className="text-primary glow-text-primary" />;
        switch (role?.toUpperCase()) {
            case 'ADMIN': return <Shield size={14} className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />;
            case 'MANAGER': return <Briefcase size={14} className="text-primary glow-text-primary" />;
            default: return <User size={14} className="text-app-text-muted" />;
        }
    };

    return (
        <div className="flex flex-col relative">
            {/* Horizontal Connector Line */}
            {level > 0 && (
                <div className="absolute left-[-24px] top-[26px] w-[24px] h-[1px] bg-gradient-to-r from-primary/40 to-primary/80" />
            )}

            <div
                className={`flex items-center gap-4 p-4 mb-3 min-w-[320px] backdrop-blur-xl transition-all duration-500 group cursor-pointer relative overflow-hidden fui-status-card
                    ${level === 0 ? 'border-primary/40 shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]' : 'border-white/5 hover:border-primary/40'}
                    self-start
                `}
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ marginLeft: `${level * 40}px` }}
            >
                {/* Edge Accents */}
                <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-primary opacity-40" />
                <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-primary opacity-40" />
                
                {/* Scanning Light Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-scanning-fast pointer-events-none" />

                {hasChildren ? (
                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                        <div className="w-5 h-5 flex items-center justify-center rounded-none border border-primary/20 bg-primary/5 text-primary">
                            <ChevronDown size={14} strokeWidth={3} />
                        </div>
                    </div>
                ) : (
                    <div className="w-5 h-5 flex items-center justify-center text-white/10">
                        <Activity size={12} />
                    </div>
                )}

                <div className={`w-10 h-10 flex items-center justify-center relative ${level === 0 ? 'bg-primary/20' : 'bg-white/5'}`}>
                    {getRoleIcon(node.role)}
                    {level === 0 && <div className="absolute inset-0 border border-primary animate-pulse" />}
                </div>

                <div className="flex-1">
                    <h4 className="text-sm font-black text-white/90 uppercase tracking-tighter group-hover:text-primary transition-colors">
                        {node.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <Terminal size={10} className="text-primary/40" />
                        <span className="text-[9px] font-mono text-app-text-muted uppercase tracking-[0.2em]">
                            {viewMode === 'users' 
                                ? `${node.position || node.role} // ${node.department || 'ROOT'}` 
                                : `NODE_ID: ${node.slug || '0xRET'} // DEP_UNIT`}
                        </span>
                    </div>
                </div>

                {hasChildren && (
                    <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase">
                        {node.children.length} SATELLITES
                    </div>
                )}

                {/* Status Indicator Glow */}
                <div className={`absolute right-0 top-0 w-1 h-full ${node.isActive !== false ? 'bg-primary shadow-[0_0_10px_var(--primary)]' : 'bg-rose-500'} opacity-20 group-hover:opacity-100 transition-opacity`} />
            </div>

            {hasChildren && isExpanded && (
                <div className="relative">
                    {/* Vertical Connector Path */}
                    <div
                        className="absolute left-[20px] top-[26px] bottom-6 w-[1px] bg-gradient-to-b from-primary via-primary/20 to-transparent"
                        style={{ marginLeft: `${level * 40}px` }}
                    />
                    {node.children.map((child, i) => (
                        <HierarchyNode 
                            key={child.id || i} 
                            node={child} 
                            level={level + 1} 
                            viewMode={viewMode}
                            isLast={i === node.children.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function OrganizationHierarchy() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('users'); // 'users' | 'departments'

    useEffect(() => {
        const fetchHierarchy = async () => {
            setLoading(true);
            try {
                const endpoint = viewMode === 'departments' ? '/departments/hierarchy' : '/users/hierarchy';
                const result = await apiClient.get(endpoint);
                setData(result);
            } catch (err) {
                console.error('Error fetching hierarchy:', err);
                setError(err.message);
                // Enhanced Fallback for Demonstration
                setData([
                    {
                        id: '1',
                        name: 'ZENITH_COMMAND_01',
                        role: 'ADMIN',
                        position: 'SYSTEM_HUB',
                        department: 'V2_RETAIL',
                        children: [
                            {
                                id: '2',
                                name: 'RETAIL_OPS_MANAGER',
                                role: 'MANAGER',
                                position: 'CLUSTER_LEAD',
                                department: 'RETAIL',
                                children: [
                                    { id: '4', name: 'STORE_ASSOC_A', role: 'END_USER', position: 'POS_TERMINAL', department: 'RET_FLR' },
                                    { id: '5', name: 'STORE_ASSOC_B', role: 'END_USER', position: 'LPO_UNIT', department: 'RET_FLR' }
                                ]
                            },
                            {
                                id: '3',
                                name: 'INFRA_SEC_SPECIALIST',
                                role: 'MANAGER',
                                position: 'TECH_LEAD',
                                department: 'IT',
                                children: [
                                    { id: '6', name: 'DBA_CORE', role: 'END_USER', position: 'MATRIX_NODE', department: 'BACKEND' }
                                ]
                            }
                        ]
                    }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchHierarchy();
    }, [viewMode]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-8 zenith-vacuum relative">
                <NeuralMatrix />
                <div className="relative">
                    <div className="w-16 h-16 border border-primary/20 flex items-center justify-center animate-spin-slow">
                        <Zap size={30} className="text-primary animate-pulse" />
                    </div>
                    <div className="absolute inset-[-10px] border border-primary animate-ping opacity-20" />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.6em] animate-pulse">Syncing_Neural_Hierarchy</p>
                    <div className="w-48 h-[2px] bg-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-primary animate-scanning-fast" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 relative p-12 min-h-screen bg-black/40 border border-white/5 backdrop-blur-3xl overflow-hidden">
            <NeuralMatrix />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-primary shadow-[0_0_15px_var(--primary)]" />
                        <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            System <span className="text-primary">Topology</span>
                        </h3>
                    </div>
                    <p className="text-[10px] font-mono text-app-text-muted uppercase tracking-[0.3em] flex items-center gap-2">
                        <Terminal size={12} className="text-primary" />
                        Visual_Bypassing_Departmental_Bridging_0x00FF
                    </p>
                </div>
                
                <div className="flex bg-[#0a0f1d] p-1.5 border border-white/10 relative">
                    <div className="absolute top-0 right-0 w-[2px] h-full bg-primary/20" />
                    <button 
                        onClick={() => setViewMode('users')} 
                        className={`flex items-center gap-3 px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative
                            ${viewMode === 'users' ? 'bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' : 'text-app-text-muted hover:text-white'}
                        `}
                    >
                        <Users size={14} /> Personnel
                    </button>
                    <button 
                        onClick={() => setViewMode('departments')} 
                        className={`flex items-center gap-3 px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative
                            ${viewMode === 'departments' ? 'bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' : 'text-app-text-muted hover:text-white'}
                        `}
                    >
                        <Database size={14} /> Sector_Nodes
                    </button>
                </div>
            </div>

            <div className="relative z-10 p-10 bg-black/20 border border-white/5 backdrop-blur-md min-h-[600px] overflow-auto custom-scrollbar-zenith">
                {data.length > 0 ? (
                    <div className="flex flex-col animate-in fade-in zoom-in duration-1000">
                        {data.map((root, i) => (
                            <HierarchyNode key={root.id || i} node={root} viewMode={viewMode} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-40">
                        <div className="w-20 h-20 flex items-center justify-center border border-rose-500/20 bg-rose-500/5 text-rose-500 mb-6">
                            <Activity size={40} className="animate-pulse" />
                        </div>
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.5em]">Warning: No_Topology_Data_Resolved</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .custom-scrollbar-zenith::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar-zenith::-webkit-scrollbar-thumb {
                    background: rgba(var(--primary-rgb), 0.2);
                }
                .custom-scrollbar-zenith::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                }
                @keyframes scanning-fast {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                .animate-scanning-fast {
                    animation: scanning-fast 1.5s ease-in-out infinite;
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 12s linear infinite;
                }
            `}</style>
        </div>
    );
}
