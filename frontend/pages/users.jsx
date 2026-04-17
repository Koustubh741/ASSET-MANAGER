import { PERSONA_MAP } from '../config/v2_persona_map';
import Link from 'next/link';
import { ArrowLeft, User, Monitor, Disc, Ticket, Search, Mail, Check, X, ShieldAlert, Plus, Headphones, Crown, Building2, MapPin, ChevronDown } from 'lucide-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';

// ── V2 Retail Position Config ──────────────────────────────────────
const POSITION_OPTIONS = [
    {
        value: 'TEAM_MEMBER',
        role: 'END_USER',
        label: 'Staff',
        desc: 'Asset requests, ticket submission & personal asset view',
        Icon: User,
        color: 'border-blue-500/40 bg-blue-500/5 text-blue-400',
        activeColor: 'border-blue-500 bg-blue-500/15 text-blue-300 shadow-lg shadow-blue-500/10',
        badge: 'bg-blue-500/20 text-blue-300'
    },
    {
        value: 'SUPPORT_STAFF',
        role: 'SUPPORT',
        label: 'Support Staff',
        desc: 'Ticket management, IT support workflows & group assignments',
        Icon: Headphones,
        color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400',
        activeColor: 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-500/10',
        badge: 'bg-emerald-500/20 text-emerald-300'
    },
    {
        value: 'MANAGER',
        role: 'MANAGER',
        label: 'Manager',
        desc: 'Departmental approvals, team oversight & full request control',
        Icon: Crown,
        color: 'border-amber-500/40 bg-amber-500/5 text-amber-400',
        activeColor: 'border-amber-500 bg-amber-500/15 text-amber-300 shadow-lg shadow-amber-500/10',
        badge: 'bg-amber-500/20 text-amber-300'
    }
];

const V2_RETAIL_DEPTS = [
    'ADMIN', 'B&M', 'BD', 'F&A', 'HR', 'INVENTORY', 'IT',
    'LEGAL & COMPANY SECRETARY', 'LOSS PREVENTION', 'MARKETING',
    'NSO', 'PLANNING', 'PROJECT', 'RETAIL', 'RETAIL OPERATION', 'SCM'
];

const LOC_TYPES = [
    { value: '', label: '— Select Location Type —' },
    { value: 'HQ', label: 'HQ (Head Office)' },
    { value: 'STORE', label: 'Store' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
];


const GENERIC_PERSONAS = [
    { value: 'SENIOR_EXECUTIVE', label: 'Senior Executive' },
    { value: 'EXECUTIVE', label: 'Executive' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ASSISTANT_MANAGER', label: 'Assistant Manager' },
    { value: 'JUNIOR_EXECUTIVE', label: 'Junior Executive' },
    { value: 'SUPPORT_LEAD', label: 'Support Lead' }
];
// ────────────────────────────────────────────────────────────────────

export default function UsersPage() {
    const { isAdmin } = useRole();
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [retailDepts, setRetailDepts] = useState([]);
    const [createForm, setCreateForm] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'END_USER',
        status: 'ACTIVE',
        position: 'TEAM_MEMBER',
        department_id: '',
        loc_type: '',
        persona: ''
    });
    const [creating, setCreating] = useState(false);

    // Functional Persona Search State (for modal)
    const [personaSearch, setPersonaSearch] = useState('');
    const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
    const personaDropdownRef = useRef(null);




    // Fetch v2 retail departments when create modal is opened
    useEffect(() => {
        if (!showCreateModal) return;
        const fetchDepts = async () => {
            try {
                const res = await apiClient.getDepartments();
                const all = res?.data || res || [];
                // Keep only v2 retail depts
                const v2 = all.filter(d => V2_RETAIL_DEPTS.includes(d.name));
                // Sort by canonical order
                v2.sort((a, b) => V2_RETAIL_DEPTS.indexOf(a.name) - V2_RETAIL_DEPTS.indexOf(b.name));
                setRetailDepts(v2);
            } catch (e) {
                console.error('Failed to load departments:', e);
                // Fallback: build dummy objects from name list
                setRetailDepts(V2_RETAIL_DEPTS.map(n => ({ id: n, name: n })));
            }
        };
        fetchDepts();
    }, [showCreateModal]);

    // Click outside listener for searchable dropdowns
    useEffect(() => {
        function handleClickOutside(event) {
            if (personaDropdownRef.current && !personaDropdownRef.current.contains(event.target)) {
                setIsPersonaDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [personaDropdownRef]);

    const filteredPersonas = useMemo(() => {
        const list = PERSONA_MAP[createForm.department_id] || GENERIC_PERSONAS;
        if (!personaSearch) return list;
        return list.filter(p => 
            p.label.toLowerCase().includes(personaSearch.toLowerCase()) ||
            p.value.toLowerCase().includes(personaSearch.toLowerCase())
        );
    }, [createForm.department_id, personaSearch]);


    const fetchPendingUsers = async () => {
        if (!isAdmin) return;
        try {
            const response = await apiClient.getUsers({ status: 'PENDING', size: 0 });
            const pending = response.data || [];
            setPendingUsers(pending);
        } catch (e) {
            console.error("Failed to fetch pending users:", e);
        }
    };

    const handleApprove = async (userId) => {
        try {
            await apiClient.activateUser(userId);
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            // Refresh main list to show newly active user
            window.location.reload();
        } catch (e) {
            console.error("Failed to approve user:", e);
            alert("Failed to approve user: " + e.message);
        }
    };

    const handleDeny = async (userId) => {
        if (!confirm("Are you sure you want to deny this user?")) return;
        try {
            await apiClient.denyUser(userId);
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e) {
            console.error("Failed to deny user:", e);
            alert("Failed to deny user: " + e.message);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!createForm.email || !createForm.password || !createForm.full_name) {
            alert("Please fill in email, password, and full name");
            return;
        }
        setCreating(true);
        try {
            await apiClient.createUser(createForm);
            alert("User created successfully!");
            setShowCreateModal(false);
            setCreateForm({
                email: '',
                password: '',
                full_name: '',
                role: 'END_USER',
                status: 'ACTIVE',
                position: 'TEAM_MEMBER',
                department_id: '',
                loc_type: '',
                persona: ''
            });
            window.location.reload();
        } catch (e) {
            console.error("Failed to create user:", e);
            alert("Failed to create user: " + (e.message || 'Unknown error'));
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [assetResponse, ticketResponse] = await Promise.all([
                    apiClient.getAssets({ size: 0 }),
                    apiClient.getTickets(0, 0)
                ]);
                const apiAssets = assetResponse.data || [];
                const apiTickets = ticketResponse.data || [];
                let apiUsers = [];

                if (isAdmin) {
                    await fetchPendingUsers();
                }

                // Optional: Try to fetch real users, but fall back to discovery if 403
                try {
                    const userResponse = await apiClient.getUsers({ size: 0 });
                    apiUsers = userResponse.data || [];
                } catch (e) {
                    // console.warn('Could not fetch user list directly, using discovery from assets/tickets');
                }

                const userMap = {};

                // 1. Initialize from User List (if available)
                if (apiUsers && Array.isArray(apiUsers)) {
                    apiUsers.forEach(u => {
                        const key = u.email || u.id || u.full_name;
                        userMap[key] = {
                            id: u.id,
                            name: u.full_name,
                            role: u.role || 'Employee',
                            status: u.status || 'Active',
                            email: u.email,
                            assets_count: 0,
                            assigned_assets: [],
                            software_licenses: [],
                            software_count: 0,
                            tickets_count: 0,
                            tickets: []
                        };
                    });
                }

                // 2. Discover/Update from Assets
                apiAssets.forEach(asset => {
                    const userName = asset.assigned_to;
                    if (userName && userName !== 'Unassigned') {
                        // Try to find by name (legacy/discovery behavior) if not already mapped by email
                        // This identifies that asset.assigned_to might be a name or an email
                        let key = userName;

                        // Check if it's already in the map (e.g. by email or id)
                        const existingKey = Object.keys(userMap).find(k =>
                            k === userName || userMap[k].id === userName || userMap[k].name === userName || userMap[k].email === userName
                        );

                        if (existingKey) {
                            key = existingKey;
                        } else {
                            userMap[key] = {
                                id: userName,
                                name: userName,
                                role: 'Employee',
                                status: 'Active', // Assumed active if they have assets
                                assets_count: 0,
                                assigned_assets: [],
                                software_licenses: [],
                                software_count: 0,
                                tickets_count: 0,
                                tickets: []
                            };
                        }

                        if (asset.type?.toUpperCase() === 'SOFTWARE' || asset.type?.toUpperCase() === 'LICENSE') {
                            if (userMap[key].software_licenses) {
                                userMap[key].software_licenses.push(asset);
                                userMap[key].software_count += 1;
                            }
                        } else {
                            if (userMap[key].assigned_assets) {
                                userMap[key].assigned_assets.push(asset);
                                userMap[key].assets_count += 1;
                            }
                        }
                    }
                });

                // 3. Discover/Update from Tickets
                apiTickets.forEach(ticket => {
                    const userName = ticket.requestor_id;
                    if (userName) {
                        const existingKey = Object.keys(userMap).find(k =>
                            k === userName || userMap[k].id === userName || userMap[k].name === userName || userMap[k].email === userName
                        );

                        const key = existingKey || userName;

                        if (!userMap[key]) {
                            userMap[key] = {
                                id: userName,
                                name: userName,
                                role: 'Employee',
                                status: 'Active',
                                assets_count: 0,
                                assigned_assets: [],
                                software_licenses: [],
                                software_count: 0,
                                tickets_count: 0,
                                tickets: []
                            };
                        }
                        if (userMap[key].tickets) {
                            userMap[key].tickets.push(ticket);
                            userMap[key].tickets_count += 1;
                        }
                    }
                });

                setUsers(Object.values(userMap));
            } catch (error) {
                console.error('Failed to load user inventory data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [isAdmin]);

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.role?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.persona?.toLowerCase().includes(search.toLowerCase()) ||
        u.department?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="min-h-screen bg-app-void flex items-center justify-center text-app-text-muted font-black uppercase tracking-[0.2em] animate-pulse italic">Scanning Neural Personnel Matrix...</div>;

    return (
        <div className="min-h-screen p-8 bg-app-void text-app-text relative overflow-hidden">
            <div className="kinetic-scan-line" />
            <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/enterprise-features" className="p-3 bg-app-void hover:bg-app-primary hover:text-app-void border border-app-border hover:border-transparent transition-all shadow-xl active:scale-95 group">
                            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-black text-app-text uppercase italic tracking-tighter leading-none">Personnel <span className="text-app-primary">Inventory</span></h1>
                            <p className="text-app-text-muted mt-3 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Section 09 // Asset Allocation & Authorization Matrix</p>
                        </div>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-3 px-6 py-3 bg-app-primary text-app-void hover:bg-app-primary-dark rounded-none font-black uppercase tracking-widest text-[11px] shadow-xl shadow-app-primary/10 transition-all active:scale-95 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                            Provision Agent
                        </button>
                    )}
                </div>

                {/* Pending Approvals Section (Admin Only) */}
                {isAdmin && pendingUsers.length > 0 && (
                    <div className="bg-app-gold/10 border-l-4 border-app-gold p-8 mb-12 shadow-2xl animate-in fade-in slide-in-from-top-8 duration-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 font-mono text-[8px] opacity-10">AUTH_QUEUE_CRITICAL</div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-app-gold flex items-center justify-center text-app-void">
                                <ShieldAlert size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-app-gold uppercase italic tracking-tighter">Authorization Queue ({pendingUsers.length})</h2>
                                <p className="text-[10px] text-app-gold/60 font-black uppercase tracking-[0.2em]">Awaiting Identity Validation</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingUsers.map(user => (
                                <div key={user.id} className="bg-app-obsidian border border-app-border p-6 rounded-none flex justify-between items-center group hover:border-app-gold/40 transition-all shadow-xl">
                                    <div>
                                        <h3 className="font-black text-app-text uppercase italic tracking-tight">{user.full_name}</h3>
                                        <p className="text-[10px] text-app-text-muted font-mono opacity-50">{user.email}</p>
                                        <p className="text-[9px] text-app-gold font-black uppercase tracking-[0.2em] mt-2 border border-app-gold/20 px-2 py-0.5 inline-block">{user.role}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(user.id)}
                                            className="p-2 rounded-none bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            title="Approve"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeny(user.id)}
                                            className="p-2 rounded-none bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            title="Deny"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                <div className="glass-panel p-4 rounded-none bg-app-surface-soft border border-app-border flex items-center">
                    <Search className="text-app-text-muted ml-2" size={20} />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        className="bg-transparent border-none outline-none text-app-text ml-4 flex-1"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="glass-panel p-8 rounded-none bg-app-obsidian border border-app-border hover:border-app-primary/40 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 font-mono text-[8px] opacity-5">PERSONNEL_NODE_{user.id.slice(0, 4)}</div>
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-none bg-app-primary/5 border border-app-primary/20 text-app-primary flex items-center justify-center group-hover:bg-app-primary group-hover:text-app-void transition-all duration-500 relative">
                                        <User size={28} />
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-app-secondary border border-app-void" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-app-text uppercase tracking-tighter italic leading-none">{user.name}</h3>
                                        <div className="flex flex-col mt-2">
                                            <p className="text-[10px] font-black text-app-primary uppercase tracking-[0.2em]">{user.role}</p>
                                            {user.email && (
                                                <div className="flex items-center gap-2 text-[10px] font-mono text-app-text-muted mt-1 opacity-50">
                                                    <Mail size={12} /> {user.email}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black px-3 py-1 rounded-none border uppercase tracking-widest ${user.status?.toUpperCase() === 'ACTIVE' ? 'bg-app-secondary/10 text-app-secondary border-app-secondary/20' : 'bg-app-void text-app-text-muted border-app-border'}`}>
                                    {user.status}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-app-void border border-app-border rounded-none hover:bg-app-primary/[0.03] transition-colors group/stat">
                                    <div className="flex items-center gap-4">
                                        <Monitor size={18} className="text-app-primary opacity-40 group-hover/stat:opacity-100 transition-opacity" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Allocated Assets</span>
                                    </div>
                                    <span className="text-lg font-black text-app-text italic leading-none">{user.assets_count}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-app-void border border-app-border rounded-none hover:bg-app-secondary/[0.03] transition-colors group/stat">
                                    <div className="flex items-center gap-4">
                                        <Disc size={18} className="text-app-secondary opacity-40 group-hover/stat:opacity-100 transition-opacity" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Neural Licenses</span>
                                    </div>
                                    <span className="text-lg font-black text-app-text italic leading-none">{user.software_count}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-app-void border border-app-border rounded-none hover:bg-app-rose/[0.03] transition-colors group/stat">
                                    <div className="flex items-center gap-4">
                                        <Ticket size={18} className="text-app-rose opacity-40 group-hover/stat:opacity-100 transition-opacity" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Incident Stream</span>
                                    </div>
                                    <span className="text-lg font-black text-app-text italic leading-none">{user.tickets_count}</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-app-border flex justify-between items-center">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-6 h-6 border-2 border-app-obsidian bg-app-primary/20 rounded-none" />
                                    ))}
                                    <div className="w-6 h-6 border-2 border-app-obsidian bg-app-surface flex items-center justify-center text-[8px] font-black text-app-text-muted">+</div>
                                </div>
                                <button
                                    onClick={() => setSelectedUser(user)}
                                    className="text-[10px] font-black text-app-primary hover:text-app-primary-light uppercase tracking-[0.2em] italic group-hover:translate-x-1 transition-all flex items-center gap-2"
                                >
                                    Access Profile <ArrowLeft size={14} className="rotate-180" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-slate-950/99 backdrop-blur-3xl z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="w-full max-w-4xl bg-app-obsidian border border-app-border rounded-none shadow-[0_0_150px_rgba(0,0,0,1)] max-h-[90vh] overflow-hidden flex flex-col relative">
                        <div className="kinetic-scan-line" />

                        {/* Modal Header */}
                        <div className="p-8 border-b border-app-border flex items-center justify-between bg-app-void z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-none bg-app-primary flex items-center justify-center text-app-void shadow-lg shadow-app-primary/20">
                                    <User size={28} />
                                </div>
                                <div>
                                    <h3 className="font-black text-2xl text-app-text uppercase italic tracking-tighter leading-none">{selectedUser.name}</h3>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[10px] font-black text-app-primary uppercase tracking-widest">{selectedUser.role}</span>
                                        <span className="text-app-text-muted opacity-20">•</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${selectedUser.status?.toUpperCase() === 'ACTIVE' ? 'text-app-secondary' : 'text-app-text-muted'}`}>{selectedUser.status}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="p-3 bg-app-void hover:bg-app-rose hover:text-app-void text-app-text-muted border border-app-border transition-all active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="p-6 overflow-y-auto space-y-8">

                            {/* 1. Assigned Assets (Real Data) */}
                            <div className="space-y-6">
                                <h4 className="flex items-center gap-3 text-app-primary font-black uppercase tracking-widest text-xs border-l-2 border-app-primary pl-3">
                                    Allocated Assets ({selectedUser.assets_count})
                                </h4>
                                <div className="space-y-3">
                                    {selectedUser.assigned_assets.map(asset => (
                                        <Link href={`/assets/${asset.id}`} key={asset.id} className="block p-5 bg-app-void border border-app-border hover:border-app-primary/30 transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-app-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex justify-between items-center relative z-10">
                                                <div>
                                                    <div className="font-black text-app-text uppercase italic group-hover:text-app-primary transition-colors">{asset.name}</div>
                                                    <div className="text-[10px] text-app-text-muted font-mono mt-1 opacity-50">{asset.id}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{asset.category}</div>
                                                    <span className="text-[9px] font-black px-2 py-0.5 bg-app-obsidian text-app-text-muted border border-app-border uppercase tracking-widest mt-1 inline-block">{asset.status}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    {selectedUser.assets_count === 0 && <div className="text-[10px] font-black text-app-text-muted uppercase italic opacity-30 mt-2">No active assets allocated.</div>}
                                </div>
                            </div>

                            {/* 2. Software Licenses (Real Data) */}
                            <div className="space-y-6">
                                <h4 className="flex items-center gap-3 text-app-secondary font-black uppercase tracking-widest text-xs border-l-2 border-app-secondary pl-3">
                                    Neural Nexus ({selectedUser.software_count})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedUser.software_licenses.map((license, i) => (
                                        <div key={license.id} className="p-4 bg-app-void border border-app-border flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                                            <div className="w-10 h-10 bg-app-secondary flex items-center justify-center text-app-void font-black italic shadow-lg shadow-app-secondary/10">L</div>
                                            <div>
                                                <div className="text-[11px] font-black text-app-text uppercase italic tracking-tight">
                                                    {license.name}
                                                </div>
                                                <div className="text-[9px] text-app-text-muted font-black uppercase tracking-widest opacity-40 mt-1">{license.model} // {license.status}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedUser.software_count === 0 && <div className="text-[10px] font-black text-app-text-muted uppercase italic opacity-30 mt-2 col-span-2">No neural licenses mapped.</div>}
                                </div>
                            </div>

                            {/* 3. Recent Tickets (Real Data) */}
                            <div className="space-y-6">
                                <h4 className="flex items-center gap-3 text-app-rose font-black uppercase tracking-widest text-xs border-l-2 border-app-rose pl-3">
                                    Incident Stream ({selectedUser.tickets_count})
                                </h4>
                                <div className="space-y-3">
                                    {selectedUser.tickets.map(ticket => (
                                        <div key={ticket.id} className="flex items-center justify-between p-4 bg-app-void border border-app-border">
                                            <div>
                                                <div className="text-[11px] font-black text-app-text uppercase italic tracking-tight leading-none mb-1">
                                                    {ticket.subject}
                                                </div>
                                                <div className="text-[9px] text-app-text-muted font-mono uppercase opacity-40">{ticket.id} // {ticket.status} // {new Date(ticket.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <Link href={`/tickets/${ticket.id}`} className="text-[9px] font-black text-app-rose hover:bg-app-rose hover:text-app-void border border-app-rose/20 bg-app-rose/5 px-4 py-1.5 transition-all shadow-xl shadow-app-rose/5 uppercase tracking-widest">
                                                Interrogate
                                            </Link>
                                        </div>
                                    ))}
                                    {selectedUser.tickets_count === 0 && <div className="text-[10px] font-black text-app-text-muted uppercase italic opacity-30 mt-2">No active incident logs.</div>}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-950/99 backdrop-blur-3xl z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="w-full max-w-4xl bg-app-obsidian border border-app-border rounded-none shadow-[0_0_150px_rgba(0,0,0,1)] relative max-h-[95vh] flex flex-col">
                        <div className="kinetic-scan-line" />

                        {/* Header */}
                        <div className="p-6 border-b border-app-border flex items-center justify-between bg-app-void shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-app-text uppercase italic tracking-tighter">Create <span className="text-app-primary">Account</span></h2>
                                <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.3em] mt-1 opacity-40">v2 Retail — Identity Provisioning</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-3 bg-app-void hover:bg-app-rose hover:text-app-void text-app-text-muted border border-app-border transition-all active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable form body */}
                        <div className="overflow-y-auto flex-1">
                        <form id="create-user-form" onSubmit={handleCreateUser} className="p-6 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                        <Mail size={11} /> Credential Identity
                                    </label>
                                    <input
                                        id="create-user-email"
                                        type="email"
                                        required
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        className="w-full px-4 py-3.5 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-mono transition-all text-[12px] placeholder:opacity-20"
                                        placeholder="user@system.terminal"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                        <ShieldAlert size={11} /> Encryption Key
                                    </label>
                                    <input
                                        id="create-user-password"
                                        type="password"
                                        required
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        className="w-full px-4 py-3.5 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-mono transition-all text-[12px] placeholder:opacity-20"
                                        placeholder="••••••••••••"
                                    />
                                </div>
                            </div>

                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                    <User size={11} /> Personnel Legal Alias
                                </label>
                                <input
                                    id="create-user-name"
                                    type="text"
                                    required
                                    value={createForm.full_name}
                                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-black uppercase italic tracking-widest transition-all text-[12px] placeholder:opacity-20"
                                    placeholder="Enter full legal name..."
                                />
                            </div>

                            {/* ── Position Toggle (v2 Retail) ── */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.2em]">Position & Access Level</label>
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-none"
                                        style={{
                                            background: POSITION_OPTIONS.find(p => p.value === createForm.position)?.value === 'TEAM_MEMBER' ? 'rgba(59,130,246,0.15)' :
                                                        POSITION_OPTIONS.find(p => p.value === createForm.position)?.value === 'SUPPORT_STAFF' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: POSITION_OPTIONS.find(p => p.value === createForm.position)?.value === 'TEAM_MEMBER' ? '#93c5fd' :
                                                   POSITION_OPTIONS.find(p => p.value === createForm.position)?.value === 'SUPPORT_STAFF' ? '#6ee7b7' : '#fcd34d',
                                        }}
                                    >
                                        Role: {createForm.role.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {POSITION_OPTIONS.map((opt) => {
                                        const isActive = createForm.position === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                id={`position-${opt.value}`}
                                                onClick={() => setCreateForm({ ...createForm, position: opt.value, role: opt.role })}
                                                className={`flex flex-col items-start p-4 border-2 rounded-none transition-all duration-200 text-left group relative overflow-hidden ${
                                                    isActive ? opt.activeColor : 'border-app-border bg-app-void hover:border-app-border/60 text-app-text-muted'
                                                }`}
                                            >
                                                {isActive && (
                                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
                                                        style={{ background: opt.value === 'TEAM_MEMBER' ? '#3b82f6' : opt.value === 'SUPPORT_STAFF' ? '#10b981' : '#f59e0b' }}
                                                    />
                                                )}
                                                <opt.Icon size={20} className={`mb-2.5 ${isActive ? '' : 'opacity-40 group-hover:opacity-70 transition-opacity'}`} />
                                                <span className="text-[11px] font-black uppercase tracking-wider leading-none mb-1.5">{opt.label}</span>
                                                <span className="text-[9px] leading-snug opacity-60">{opt.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                        <Building2 size={11} /> Dept Neural Link
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="create-user-department"
                                            value={createForm.department_id}
                                            onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })}
                                            className="w-full px-4 py-3.5 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-black uppercase tracking-[0.2em] text-[11px] transition-all appearance-none cursor-pointer pr-9"
                                        >
                                            <option value="">— SELECT DEPT —</option>
                                            {retailDepts.length > 0
                                                ? retailDepts.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))
                                                : V2_RETAIL_DEPTS.map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))
                                            }
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                        <MapPin size={11} /> Geo-Spatial Type
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="create-user-loctype"
                                            value={createForm.loc_type}
                                            onChange={(e) => setCreateForm({ ...createForm, loc_type: e.target.value })}
                                            className="w-full px-4 py-3.5 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-black uppercase tracking-[0.2em] text-[11px] transition-all appearance-none cursor-pointer pr-9"
                                        >
                                            {LOC_TYPES.map(lt => (
                                                <option key={lt.value} value={lt.value}>{lt.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Functional Persona */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.2em] block">Functional Persona</label>
                                <div className="relative" ref={personaDropdownRef}>
                                    <div className="relative group">
                                        <Search size={14} className={`absolute left-3 top-3.5 transition-all ${isPersonaDropdownOpen ? 'text-app-primary' : 'text-app-primary/40'}`} />
                                        <input
                                            type="text"
                                            id="create-user-persona-search"
                                            autoComplete="off"
                                            placeholder={createForm.persona ? (PERSONA_MAP[createForm.department_id]?.find(p => p.value === createForm.persona)?.label || createForm.persona) : "Search Designations..."}
                                            value={personaSearch}
                                            onChange={(e) => {
                                                setPersonaSearch(e.target.value);
                                                setIsPersonaDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsPersonaDropdownOpen(true)}
                                            className="w-full bg-app-void border border-app-border rounded-none py-3 pl-10 pr-4 text-[11px] font-black uppercase tracking-widest text-app-text focus:outline-none focus:border-app-primary transition-all placeholder:text-app-text-muted/30"
                                        />
                                        {personaSearch && (
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setPersonaSearch('');
                                                    setCreateForm(prev => ({ ...prev, persona: '' }));
                                                }}
                                                className="absolute right-3 top-3.5 text-app-text-muted hover:text-app-primary transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {isPersonaDropdownOpen && (
                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-app-obsidian border border-app-primary/30 shadow-2xl max-h-60 overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-200">
                                            <div className="p-2 border-b border-app-border/20 bg-app-primary/5">
                                                <span className="text-[9px] font-black text-app-primary/60 uppercase tracking-tighter">Matches: {filteredPersonas.length} nodes found</span>
                                            </div>
                                            {filteredPersonas.length > 0 ? (
                                                filteredPersonas.map(p => (
                                                    <button
                                                        key={p.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setCreateForm(prev => ({ ...prev, persona: p.value }));
                                                            setPersonaSearch('');
                                                            setIsPersonaDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-app-primary/10 border-l-2 ${createForm.persona === p.value ? 'border-app-primary bg-app-primary/5 text-app-primary' : 'border-transparent text-app-text-muted hover:text-app-text'}`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span>{p.label}</span>
                                                            {createForm.persona === p.value && <Check size={12} />}
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-8 text-center">
                                                    <span className="text-[10px] uppercase font-black text-app-rose/60 tracking-widest">Unauthorized: Designation Not Found</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status */}
                            {/* Status */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-app-primary uppercase italic tracking-[0.4em] flex items-center gap-2.5">
                                    <ShieldAlert size={12} /> Account Authorization Status
                                </label>
                                <div className="flex gap-5">
                                    {['ACTIVE', 'PENDING', 'DISABLED'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setCreateForm({ ...createForm, status: s })}
                                            className={`flex-1 py-4 px-6 text-[11px] font-black uppercase tracking-[0.2em] border rounded-none transition-all duration-300 flex items-center justify-center gap-3 ${
                                                createForm.status === s
                                                    ? s === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                                                    : s === 'PENDING' ? 'bg-amber-500/10 border-amber-500/60 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
                                                    : 'bg-rose-500/10 border-rose-500/60 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
                                                    : 'bg-app-void border-app-border text-app-text-muted hover:border-app-border/50 hover:bg-app-surface-soft/10'
                                            }`}
                                        >
                                            {createForm.status === s && (
                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                                    s === 'ACTIVE' ? 'bg-emerald-400' : s === 'PENDING' ? 'bg-amber-400' : 'bg-rose-400'
                                                }`} />
                                            )}
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-4 pt-4 border-t border-app-border">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-2.5 text-[10px] font-black text-app-text-muted hover:text-app-rose uppercase tracking-[0.3em] transition-all"
                                    disabled={creating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-8 py-3 bg-app-primary text-app-void hover:bg-app-primary-dark transition-all shadow-xl shadow-app-primary/20 font-black uppercase tracking-[0.2em] text-[11px] group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                    {creating ? 'Creating Account...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
