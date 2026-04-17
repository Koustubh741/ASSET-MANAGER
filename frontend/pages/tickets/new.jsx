import Link from 'next/link';
import { 
    ArrowLeft, Save, Info, HelpCircle, X, Check, 
    Monitor, Users, Wallet, Scale, Shield, Store, 
    MapPin, Truck, Settings, Activity, Briefcase, Zap,
    Cpu, Globe, Layout, Layers, UserPlus,
    ShoppingBag, TrendingUp, Box, ShieldCheck, Calendar
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';
import { useAssetContext } from '@/contexts/AssetContext';

const deptGuide = [
    { name: 'ADMIN', role: 'General administration, office management, and facility support.' },
    { name: 'B&M', role: 'Buying & Merchandising - Product selection, pricing, and stock planning.' },
    { name: 'BD', role: 'Business Development - Partnerships, growth, and new market strategy.' },
    { name: 'F&A', role: 'Finance & Accounts - Invoicing, expenses, payroll, and auditing.' },
    { name: 'HR', role: 'Human Resources - Recruitment, employee relations, and training.' },
    { name: 'INVENTORY', role: 'Warehouse management, stock tracking, and replenishment.' },
    { name: 'IT', role: 'Tech support, computing infrastructure, and retail systems.' },
    { name: 'LEGAL & COMPANY SECRETARY', role: 'Compliance, contracts, and corporate governance.' },
    { name: 'LOSS PREVENTION', role: 'Security, audit control, and shrinkage management.' },
    { name: 'MARKETING', role: 'Branding, internal/external campaigns, and visual assets.' },
    { name: 'NSO', role: 'New Store Opening - Planning and execution for site launches.' },
    { name: 'PLANNING', role: 'Strategic organizational resource and timeline planning.' },
    { name: 'PROJECT', role: 'Special initiatives, infrastructure builds, and upgrades.' },
    { name: 'RETAIL', role: 'Core store operations and customer service management.' },
    { name: 'RETAIL OPERATION', role: 'Back-end operational support for store networks.' },
    { name: 'SCM', role: 'Supply Chain Management - Logistics and distribution.' }
];

const DEPT_ICONS = {
    'IT': Monitor,
    'HR': Users,
    'F&A': Wallet,
    'LEGAL & COMPANY SECRETARY': Scale,
    'LOSS PREVENTION': ShieldCheck,
    'RETAIL': Store,
    'RETAIL OPERATION': Settings,
    'NSO': MapPin,
    'SCM': Truck,
    'ADMIN': Briefcase,
    'MARKETING': Zap,
    'B&M': ShoppingBag,
    'BD': TrendingUp,
    'INVENTORY': Box,
    'PLANNING': Calendar,
    'PROJECT': Layers,
};

const getDeptIcon = (deptName) => {
    const key = String(deptName || 'DEFAULT').toUpperCase();
    // Prioritize exact match, then fall back to partial matches
    const IconComp = DEPT_ICONS[key] || DEPT_ICONS[Object.keys(DEPT_ICONS).find(k => key.includes(k))] || Info;
    return <IconComp size={18} />;
};

export default function NewTicketPage() {
    const router = useRouter();
    const { user, isStaff, isManagerial } = useRole();
    const { createTicket } = useAssetContext();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [assets, setAssets] = useState([]);
    const [groups, setGroups] = useState([]);
    const [showGuide, setShowGuide] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        priority: 'Medium',
        related_asset_id: '',
        description: '',
        assignment_group_id: '',
        assigned_to_id: ''
    });
    const [groupMembers, setGroupMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Phase 8: Grouping & Wizard State
    const [selectedDept, setSelectedDept] = useState(null);
    const [groupedDepts, setGroupedDepts] = useState({});

    // Phase 7 & 8: Dynamic Personnel Fetching
    useEffect(() => {
        const fetchMembers = async () => {
            if (!formData.assignment_group_id) {
                setGroupMembers([]);
                setFormData(prev => ({ ...prev, assigned_to_id: '' }));
                return;
            }
            setLoadingMembers(true);
            setFormData(prev => ({ ...prev, assigned_to_id: '' }));
            try {
                const members = await apiClient.getGroupMembers(formData.assignment_group_id);
                // Sort to put MANAGERS at the top
                const sorted = [...(members || [])].sort((a,b) => {
                    const aIsMgr = a.position === 'MANAGER' || (a.role === 'MANAGER');
                    const bIsMgr = b.position === 'MANAGER' || (b.role === 'MANAGER');
                    if (aIsMgr && !bIsMgr) return -1;
                    if (!aIsMgr && bIsMgr) return 1;
                    return 0;
                });
                setGroupMembers(sorted);
            } catch (error) {
                console.error('Failed to fetch group members:', error);
                setGroupMembers([]);
            } finally {
                setLoadingMembers(false);
            }
        };
        fetchMembers();
    }, [formData.assignment_group_id]);


    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                const isPrivileged = isStaff || isManagerial;
                const [assetsResponse, apiGroups] = await Promise.all([
                    isPrivileged ? apiClient.getAssets() : apiClient.getMyAssets(),
                    apiClient.getAssignmentGroups()
                ]);
                setAssets(isPrivileged ? (assetsResponse.data || []) : assetsResponse);
                setGroups(apiGroups);

                // Phase 8: Group groups by department - EXCLUDE deprecated departments
                const grouped = {};
                apiGroups
                    .filter(g => {
                        const dept = g.department_name || g.department || '';
                        return !dept.toUpperCase().includes('[DEPRECATED]');
                    })
                    .forEach(g => {
                        const dept = g.department_name || g.department || 'General';
                        if (!grouped[dept]) {
                            grouped[dept] = {
                                name: dept,
                                groups: [],
                                icon: getDeptIcon(dept)
                            };
                        }
                        grouped[dept].groups.push(g);
                    });
                setGroupedDepts(grouped);
            } catch (error) {
                console.error('Failed to load assets or groups:', error);
            }
        };
        fetchData();
    }, [user, isStaff, isManagerial]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        try {
            const ticketData = {
                subject: formData.subject,
                description: formData.description,
                priority: formData.priority,
                related_asset_id: formData.related_asset_id || null,
                assignment_group_id: formData.assignment_group_id || null,
                assigned_to_id: formData.assigned_to_id || null,
            };

            await createTicket(ticketData);
            setSubmitted(true);
        } catch (error) {
            console.error('Ticket submission error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen p-8 bg-app-bg text-app-text flex items-center justify-center relative overflow-hidden">
                <div className="text-center space-y-8 relative z-10 animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-success/10 border border-success/30 text-success rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(var(--color-success-rgb),0.2)]">
                        <Check size={40} className="drop-shadow-md" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-success tracking-tight">Transmission Success</h1>
                        <p className="text-app-text-muted mt-3 text-xs font-semibold uppercase tracking-widest">Incident logged & routed to support queue</p>
                    </div>
                    <Link href="/tickets" className="inline-block px-8 py-3 bg-app-surface hover:bg-primary/10 border border-app-border transition-all font-bold uppercase tracking-wider text-xs shadow-lg active:scale-95 rounded-card">
                        Return to Command Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const deptArray = Object.values(groupedDepts).sort((a,b) => a.name.localeCompare(b.name));

    return (
        <div className="min-h-screen p-4 md:p-8 bg-app-bg text-app-text relative overflow-x-hidden">
            <div className="max-w-4xl mx-auto space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <button onClick={() => router.back()} className="p-2.5 bg-app-surface hover:bg-app-surface-soft border border-app-border transition-all shadow-md active:scale-95 rounded-card group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform text-app-text-muted" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-app-text tracking-tight">Submit Incident</h1>
                            <p className="text-app-text-muted mt-1 text-xs font-semibold uppercase tracking-wider">Help Desk Request Creation</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="glass-panel p-6 md:p-8 rounded-card bg-app-surface border border-app-border space-y-10 shadow-xl relative w-full">
                    
                    {/* STAGE 1: SUBJECT */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</div>
                            <label className="text-[11px] font-bold text-app-text-muted uppercase tracking-wider block">Incident Subject</label>
                        </div>
                        <input
                            type="text"
                            required
                            className="w-full bg-app-surface-soft border border-app-border rounded-card px-4 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-base font-medium text-app-text transition-all shadow-inner"
                            placeholder="What is the issue? (e.g. Printer offline, cannot login...)"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        />
                    </div>

                    {/* STAGE 2: DEPARTMENT TOGGLES (Condition: Subject length > 3) */}
                    {formData.subject.trim().length > 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">2</div>
                                    <label className="text-[11px] font-bold text-app-text-muted uppercase tracking-wider block">Primary Department Routing</label>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setShowGuide(!showGuide)}
                                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition"
                                >
                                    <HelpCircle size={12} /> Routing Guide
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {deptArray.map(dept => {
                                    const isSelected = selectedDept?.name === dept.name;
                                    return (
                                        <button
                                            key={dept.name}
                                            type="button"
                                            onClick={() => {
                                                setSelectedDept(dept);
                                                // If only one group, select it automatically
                                                if (dept.groups.length === 1) {
                                                    setFormData(prev => ({ ...prev, assignment_group_id: dept.groups[0].id }));
                                                } else {
                                                    setFormData(prev => ({ ...prev, assignment_group_id: '' }));
                                                }
                                            }}
                                            className={`flex flex-col items-center justify-center p-5 rounded-card border transition-all space-y-3 group relative overflow-hidden ${
                                                isSelected 
                                                ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.15)] ring-1 ring-primary/50' 
                                                : 'bg-app-surface-soft border-app-border hover:border-app-border-hover hover:bg-app-surface'
                                            }`}
                                        >
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                                isSelected ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-app-surface-soft text-app-text-muted group-hover:scale-110'
                                            }`}>
                                                {dept.icon}
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider text-center leading-tight ${isSelected ? 'text-primary' : 'text-app-text-muted'}`}>
                                                {dept.name}
                                            </span>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2">
                                                    <div className="bg-primary text-white p-0.5 rounded-full shadow-sm">
                                                        <Check size={10} strokeWidth={4} />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STAGE 3: TEAM & PERSONNEL (Condition: Department Selected) */}
                    {selectedDept && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">3</div>
                                <label className="text-[11px] font-bold text-app-text-muted uppercase tracking-wider block">Specialized Team & Personnel Pulse</label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                {/* Team Selection (if multi-group) */}
                                <div className="space-y-3">
                                    <p className="text-[10px] text-app-text-muted font-bold uppercase tracking-widest">Select Assignment Team</p>
                                    {selectedDept.groups.length > 1 ? (
                                        <div className="flex flex-col gap-2">
                                            {selectedDept.groups.map(g => (
                                                <button
                                                    key={g.id}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, assignment_group_id: g.id }))}
                                                    className={`p-3 rounded-card border text-left flex items-center justify-between transition-all ${
                                                        formData.assignment_group_id === g.id 
                                                        ? 'bg-primary/5 border-primary/50 text-app-text' 
                                                        : 'bg-app-surface-soft border-app-border text-app-text-muted hover:border-app-border-hover'
                                                    }`}
                                                >
                                                    <span className="text-xs font-semibold">{g.name}</span>
                                                    {formData.assignment_group_id === g.id && <Check size={14} className="text-primary" />}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-app-surface-soft border border-app-border rounded-card flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-success" />
                                            <span className="text-xs font-semibold text-app-text">Auto-Selected: {selectedDept.groups[0].name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Personnel Display */}
                                {formData.assignment_group_id && (
                                    <div className="p-5 rounded-card bg-app-surface-soft border border-app-border relative min-h-[140px]">
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-app-border/50">
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-app-text-muted">Target Personnel Scan</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-success uppercase">Online</span>
                                                <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--color-success-rgb),0.5)]" />
                                            </div>
                                        </div>
                                        
                                        {loadingMembers ? (
                                            <div className="flex flex-col items-center justify-center py-6 gap-3">
                                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                <span className="text-[10px] text-app-text-muted font-medium uppercase tracking-tighter">Synchronizing files...</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {groupMembers.length > 0 ? (
                                                    groupMembers.map(member => {
                                                        const isMgr = member.position === 'MANAGER' || member.role === 'MANAGER';
                                                        const isSelected = formData.assigned_to_id === member.id;
                                                        return (
                                                            <button
                                                                key={member.id}
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({ ...prev, assigned_to_id: isSelected ? '' : member.id }))}
                                                                className={`flex items-center gap-3 w-full p-2 rounded-card border transition-all hover:bg-app-surface group/member ${
                                                                    isSelected 
                                                                    ? 'bg-primary/10 border-primary ring-1 ring-primary/30 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]' 
                                                                    : 'bg-app-surface-soft border-app-border'
                                                                }`}
                                                            >
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold shadow-inner transition-all ${
                                                                    isSelected ? 'bg-primary text-white scale-105' : 
                                                                    isMgr ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-app-surface border border-app-border text-app-text-muted'
                                                                }`}>
                                                                    {member.full_name?.split(' ').map(n => n[0]).join('') || '??'}
                                                                </div>
                                                                <div className="flex flex-col text-left flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-app-text'}`}>{member.full_name}</span>
                                                                        {isMgr && <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black tracking-tighter shadow-sm uppercase shrink-0">LEAD</span>}
                                                                    </div>
                                                                    <span className="text-[9px] text-app-text-muted uppercase font-medium truncate">{member.position || 'Specialist'}</span>
                                                                </div>
                                                                {isSelected && (
                                                                    <div className="bg-primary text-white p-1 rounded-full shadow-lg animate-in zoom-in duration-200">
                                                                        <Check size={10} strokeWidth={4} />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="flex flex-col gap-2 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <Activity size={14} className="text-warning" />
                                                            <p className="text-[11px] font-bold text-warning uppercase">Autonomous Dispatch</p>
                                                        </div>
                                                        <p className="text-[10px] text-app-text-muted leading-relaxed italic">System will broadcast incident to available agents in the {selectedDept.name} pool.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STAGE 4: FINAL DETAILS (Condition: Team Selected) */}
                    {formData.assignment_group_id && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">4</div>
                                <label className="text-[11px] font-bold text-app-text-muted uppercase tracking-wider block">Incident Specifications</label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-app-surface-soft p-6 rounded-card border border-app-border shadow-inner">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest pl-1">Criticality Level</label>
                                    <div className="flex gap-2">
                                        {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, priority: p })}
                                                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded border transition-all ${
                                                    formData.priority === p 
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                                    : 'bg-app-surface border-app-border text-app-text-muted hover:border-app-border-hover'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest pl-1">Target Asset Asset</label>
                                    <select
                                        className="w-full bg-app-surface border border-app-border rounded-card px-4 py-3 focus:outline-none focus:border-primary text-xs font-semibold text-app-text cursor-pointer transition-all appearance-none"
                                        value={formData.related_asset_id}
                                        onChange={(e) => setFormData({ ...formData, related_asset_id: e.target.value })}
                                    >
                                        <option value="">No Hardware Linked</option>
                                        {assets.map(a => (
                                            <option key={a.id} value={a.id}>{a.name} ({a.model})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between pl-1">
                                    <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Incident Intelligence</label>
                                    <span className="text-[9px] text-app-text-muted/60 font-bold uppercase tracking-tighter italic">Detailed telemetry required for dispatch</span>
                                </div>
                                <textarea
                                    rows={5}
                                    required
                                    className="w-full bg-app-surface-soft border border-app-border rounded-card px-5 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-sm font-medium text-app-text min-h-[140px] transition-all resize-none shadow-inner"
                                    placeholder="Provide detailed steps, error messages, or context about the issue..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end pt-8 border-t border-app-border/30">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-zenith px-12 py-4 flex items-center justify-center disabled:opacity-50 shadow-2xl transition-all active:scale-95 group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    <div className="flex items-center gap-3 relative z-10">
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Save size={20} className="group-hover:rotate-12 transition-transform" />
                                        )}
                                        <span className="text-sm font-black uppercase tracking-[0.15em]">{loading ? 'Transmitting...' : 'Initiate Ticket'}</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
