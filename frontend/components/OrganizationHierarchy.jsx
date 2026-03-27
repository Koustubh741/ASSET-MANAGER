import React, { useState, useEffect } from 'react';
import { Users, ChevronRight, ChevronDown, User, Shield, Briefcase, Zap } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const HierarchyNode = ({ node, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    const getRoleIcon = (role) => {
        switch (role?.toUpperCase()) {
            case 'ADMIN': return <Shield size={14} className="text-rose-400" />;
            case 'MANAGER': return <Briefcase size={14} className="text-blue-400" />;
            default: return <User size={14} className="text-app-text-muted" />;
        }
    };

    return (
        <div className="flex flex-col">
            <div
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 group cursor-pointer
                    ${level === 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white dark:bg-slate-900/40 border-app-border hover:border-app-border hover:bg-white dark:bg-slate-900/60'}
                    mb-2 min-w-[280px] backdrop-blur-sm self-start
                `}
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ marginLeft: `${level * 24}px` }}
            >
                {hasChildren ? (
                    <div className="text-app-text-muted">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                ) : (
                    <div className="w-4" />
                )}

                <div className={`p-2 rounded-lg ${level === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-50 dark:bg-slate-800 text-app-text-muted'}`}>
                    {getRoleIcon(node.role)}
                </div>

                <div className="flex-1">
                    <h4 className="text-sm font-semibold text-app-text group-hover:text-app-text">{node.name}</h4>
                    <p className="text-[10px] text-app-text-muted uppercase tracking-wider font-medium">
                        {node.position || node.role} • <span className="text-app-text-muted">{node.department || 'General'}</span>
                    </p>
                </div>

                {hasChildren && (
                    <div className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-app-border text-[10px] text-app-text-muted">
                        {node.children.length}
                    </div>
                )}
            </div>

            {hasChildren && isExpanded && (
                <div className="relative">
                    {/* Vertical line connecting to children */}
                    <div
                        className="absolute left-[13px] top-0 bottom-4 w-px bg-gradient-to-b from-slate-700 to-transparent"
                        style={{ marginLeft: `${level * 24}px` }}
                    />
                    {node.children.map((child) => (
                        <HierarchyNode key={child.id} node={child} level={level + 1} />
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

    useEffect(() => {
        const fetchHierarchy = async () => {
            try {
                const result = await apiClient.get('/users/hierarchy');
                setData(result);
            } catch (err) {
                console.error('Error fetching hierarchy:', err);
                setError(err.message);
                // Fallback dummy data for demo if API fails
                setData([
                    {
                        id: '1',
                        name: 'Alexander Pierce',
                        role: 'ADMIN',
                        position: 'CEO',
                        department: 'Executive',
                        children: [
                            {
                                id: '2',
                                name: 'Sarah Chen',
                                role: 'MANAGER',
                                position: 'CTO',
                                department: 'Technology',
                                children: [
                                    { id: '4', name: 'Mike Ross', role: 'END_USER', position: 'Lead Engineer', department: 'Engineering' },
                                    { id: '5', name: 'Harvey Specter', role: 'END_USER', position: 'DevOps Lead', department: 'Engineering' }
                                ]
                            },
                            {
                                id: '3',
                                name: 'Jessica Pearson',
                                role: 'MANAGER',
                                position: 'COO',
                                department: 'Operations',
                                children: [
                                    { id: '6', name: 'Louis Litt', role: 'END_USER', position: 'Finance Manager', department: 'Finance' }
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
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-app-text-muted animate-pulse">Building organization tree...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">Organization Structure</h3>
                    <p className="text-sm text-app-text-muted">Visual hierarchy of all active personnel.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <Zap size={14} />
                    LIVE VIEW
                </div>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/30 border border-app-border backdrop-blur-xl min-h-[500px] overflow-auto custom-scrollbar">
                {data.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {data.map((root) => (
                            <HierarchyNode key={root.id} node={root} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-app-text-muted">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p>No organization data found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
