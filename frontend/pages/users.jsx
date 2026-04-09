import Link from 'next/link';
import { ArrowLeft, User, Monitor, Disc, Ticket, Search, Mail, Check, X, ShieldAlert, Plus } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';

export default function UsersPage() {
    const { isAdmin } = useRole();
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'END_USER',
        status: 'ACTIVE',
        position: 'TEAM_MEMBER',
        department: ''
    });
    const [creating, setCreating] = useState(false);



    const fetchPendingUsers = async () => {
        if (!isAdmin) return;
        try {
            const response = await apiClient.getUsers({ status: 'PENDING' });
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
                department: ''
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
                // Fetch all necessary data
                const [assetResponse, ticketResponse] = await Promise.all([
                    apiClient.getAssets(),
                    apiClient.getTickets()
                ]);
                const apiAssets = assetResponse.data || [];
                const apiTickets = ticketResponse.data || [];

                if (isAdmin) {
                    await fetchPendingUsers();
                }

                // Optional: Try to fetch real users, but fall back to discovery if 403
                let apiUsers = [];
                try {
                    const userResponse = await apiClient.getUsers();
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

                        // Check if it's already in the map (e.g. by email)
                        const existingKey = Object.keys(userMap).find(k =>
                            k === userName || userMap[k].name === userName || userMap[k].email === userName
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
                            k === userName || userMap[k].name === userName || userMap[k].email === userName
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
        u.email?.toLowerCase().includes(search.toLowerCase())
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
                <div className="fixed inset-0 bg-app-void/90 backdrop-blur-3xl z-150 flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="w-full max-w-2xl bg-app-obsidian border border-app-border rounded-none shadow-[0_0_100px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-hidden flex flex-col relative">
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
                <div className="fixed inset-0 bg-app-void/90 backdrop-blur-3xl z-150 flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="w-full max-w-2xl bg-app-obsidian border border-app-border rounded-none shadow-[0_0_100px_rgba(0,0,0,0.8)] relative">
                        <div className="kinetic-scan-line" />
                        <div className="p-8 border-b border-app-border flex items-center justify-between bg-app-void">
                            <div>
                                <h2 className="text-3xl font-black text-app-text uppercase italic tracking-tighter italic">Provision <span className="text-app-primary">Agent</span></h2>
                                <p className="text-[10px] text-app-text-muted font-black uppercase tracking-[0.3em] mt-1 opacity-40">Identity Genesis Protocol v4.0</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-3 bg-app-void hover:bg-app-rose hover:text-app-void text-app-text-muted border border-app-border transition-all active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.2em] block">Neural_Link_Matrix (Email)</label>
                                    <input
                                        type="email"
                                        required
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        className="w-full px-5 py-4 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-mono transition-all text-sm"
                                        placeholder="agent_id@kinetic-ops.int"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.2em] block">Encryption_Key (Password)</label>
                                    <input
                                        type="password"
                                        required
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        className="w-full px-5 py-4 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-mono transition-all text-sm"
                                        placeholder="••••••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.2em] block">Personnel_Alias (Full Name)</label>
                                <input
                                    type="text"
                                    required
                                    value={createForm.full_name}
                                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                                    className="w-full px-5 py-4 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-black uppercase italic tracking-tight transition-all text-sm"
                                    placeholder="DESIGNATION_REQUIRED"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.2em] block">Clearance_Level (Role)</label>
                                    <select
                                        value={createForm.role}
                                        onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                                        className="w-full px-5 py-4 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-black uppercase tracking-widest text-xs transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="END_USER">End User</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="IT_MANAGEMENT">IT Management</option>
                                        <option value="ASSET_MANAGER">Asset Manager</option>
                                        <option value="ASSET_INVENTORY_MANAGER">Asset & Inventory Manager</option>
                                        <option value="PROCUREMENT">Procurement Manager</option>
                                        <option value="FINANCE">Finance</option>
                                        <option value="ADMIN">Admin</option>
                                        <option value="SYSTEM_ADMIN">System Admin</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.2em] block">Deployment_Status</label>
                                    <select
                                        value={createForm.status}
                                        onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                                        className="w-full px-5 py-4 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-black uppercase tracking-widest text-xs transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="DISABLED">Disabled</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.2em] block">Operational_Rank</label>
                                    <select
                                        value={createForm.position}
                                        onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
                                        className="w-full px-5 py-4 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-black uppercase tracking-widest text-xs transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="TEAM_MEMBER">Team Member</option>
                                        <option value="MANAGER">Manager</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-app-primary uppercase tracking-[0.2em] block">Vector_Department</label>
                                    <input
                                        type="text"
                                        value={createForm.department}
                                        onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                                        className="w-full px-5 py-4 bg-app-void border border-app-border rounded-none text-app-text focus:outline-none focus:border-app-primary font-black uppercase tracking-widest transition-all text-[11px]"
                                        placeholder="e.g. PROCUREMENT"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-6 pt-8 border-t border-app-border">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-2 text-[10px] font-black text-app-text-muted hover:text-app-rose uppercase tracking-[0.3em] transition-all"
                                    disabled={creating}
                                >
                                    Abort_Provisioning
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-10 py-4 bg-app-primary text-app-void hover:bg-app-primary-dark transition-all shadow-xl shadow-app-primary/20 font-black uppercase tracking-[0.2em] text-[12px] group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                    {creating ? 'PROVISIONING_ACTIVE...' : 'PROVISION_AGENT_IDENTITY'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
