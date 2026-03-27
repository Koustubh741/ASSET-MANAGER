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
            const pending = await apiClient.getUsers({ status: 'PENDING' });
            setPendingUsers(pending || []);
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
                const [apiAssets, apiTickets] = await Promise.all([
                    apiClient.getAssets(),
                    apiClient.getTickets()
                ]);

                if (isAdmin) {
                    await fetchPendingUsers();
                }

                // Optional: Try to fetch real users, but fall back to discovery if 403
                let apiUsers = [];
                try {
                    apiUsers = await apiClient.getUsers();
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

    if (loading) return <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-app-text-muted">Loading inventory...</div>;

    return (
        <div className="min-h-screen p-8 bg-slate-100 dark:bg-slate-950 text-app-text">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/enterprise-features" className="p-2 rounded-xl hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface text-app-text-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">User Inventory</h1>
                            <p className="text-app-text-muted mt-1">Track assets and licenses by employee</p>
                        </div>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-app-text rounded-xl font-medium transition-colors"
                        >
                            <Plus size={18} />
                            Create User
                        </button>
                    )}
                </div>

                {/* Pending Approvals Section (Admin Only) */}
                {isAdmin && pendingUsers.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldAlert className="text-amber-400" size={24} />
                            <h2 className="text-xl font-bold text-amber-100">Pending Approvals ({pendingUsers.length})</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingUsers.map(user => (
                                <div key={user.id} className="bg-white dark:bg-slate-900 border border-app-border p-4 rounded-xl flex justify-between items-center group hover:border-amber-500/30 transition-all">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-slate-200">{user.full_name}</h3>
                                        <p className="text-xs text-app-text-muted">{user.email}</p>
                                        <p className="text-xs text-amber-500/80 mt-1 uppercase font-mono">{user.role}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(user.id)}
                                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                            title="Approve"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeny(user.id)}
                                            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-slate-900 dark:hover:text-white transition-colors"
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
                <div className="glass-panel p-4 rounded-2xl bg-app-surface-soft border border-app-border flex items-center">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="glass-panel p-6 rounded-2xl bg-white dark:bg-slate-900 border border-app-border hover:border-cyan-500/30 transition-all group">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-app-text">{user.name}</h3>
                                        <div className="flex flex-col">
                                            <p className="text-sm text-app-text-muted">{user.role}</p>
                                            {user.email && (
                                                <div className="flex items-center gap-1 text-xs text-app-text-muted mt-0.5">
                                                    <Mail size={12} /> {user.email}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full border ${user.status?.toUpperCase() === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-app-text-muted'}`}>
                                    {user.status}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-app-surface-soft rounded-xl">
                                    <div className="flex items-center gap-3 text-slate-700 dark:text-slate-700">
                                        <Monitor size={18} className="text-blue-400" />
                                        <span className="text-sm font-medium">Assets</span>
                                    </div>
                                    <span className="font-mono text-app-text font-bold">{user.assets_count}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-app-surface-soft rounded-xl">
                                    <div className="flex items-center gap-3 text-slate-700 dark:text-slate-700">
                                        <Disc size={18} className="text-purple-400" />
                                        <span className="text-sm font-medium">Software</span>
                                    </div>
                                    <span className="font-mono text-app-text font-bold">{user.software_count}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-app-surface-soft rounded-xl">
                                    <div className="flex items-center gap-3 text-slate-700 dark:text-slate-700">
                                        <Ticket size={18} className="text-rose-400" />
                                        <span className="text-sm font-medium">Tickets</span>
                                    </div>
                                    <span className="font-mono text-app-text font-bold">{user.tickets_count}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-app-border flex justify-end">
                                <button
                                    onClick={() => setSelectedUser(user)}
                                    className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                                >
                                    View Details &rarr;
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-app-border rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-app-border flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-app-text">{selectedUser.name}</h3>
                                    <div className="flex items-center gap-3 text-sm text-app-text-muted">
                                        <span>{selectedUser.role}</span>
                                        <span>•</span>
                                        <span>{selectedUser.status}</span>
                                        {selectedUser.email && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1"><Mail size={14} /> {selectedUser.email}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="text-app-text-muted hover:text-slate-900 dark:hover:text-white"
                            >
                                <ArrowLeft size={24} className="rotate-180" />
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="p-6 overflow-y-auto space-y-8">

                            {/* 1. Assigned Assets (Real Data) */}
                            <div>
                                <h4 className="flex items-center gap-2 text-blue-400 font-bold mb-4">
                                    <Monitor size={18} /> Assigned Assets ({selectedUser.assets_count})
                                </h4>
                                <div className="space-y-3">
                                    {selectedUser.assigned_assets.map(asset => (
                                        <Link href={`/assets/${asset.id}`} key={asset.id} className="block p-4 rounded-xl bg-app-surface-soft hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface border border-app-border hover:border-blue-500/30 transition-all group">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-slate-200 group-hover:text-blue-300">{asset.name}</div>
                                                    <div className="text-xs text-app-text-muted font-mono mt-1">{asset.id}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-slate-700 dark:text-slate-700">{asset.category}</div>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 text-app-text-muted border border-slate-700">{asset.status}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    {selectedUser.assets_count === 0 && <div className="text-app-text-muted italic">No assets assigned.</div>}
                                </div>
                            </div>

                            {/* 2. Software Licenses (Real Data) */}
                            <div>
                                <h4 className="flex items-center gap-2 text-purple-400 font-bold mb-4">
                                    <Disc size={18} /> Software Licenses ({selectedUser.software_count})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {selectedUser.software_licenses.map((license, i) => (
                                        <div key={license.id} className="p-3 rounded-xl bg-app-surface-soft border border-app-border flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">L</div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-slate-200">
                                                    {license.name}
                                                </div>
                                                <div className="text-xs text-app-text-muted">{license.model} • {license.status}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedUser.software_count === 0 && <div className="text-app-text-muted italic">No software licenses assigned.</div>}
                                </div>
                            </div>

                            {/* 3. Recent Tickets (Real Data) */}
                            <div>
                                <h4 className="flex items-center gap-2 text-rose-400 font-bold mb-4">
                                    <Ticket size={18} /> Recent Tickets ({selectedUser.tickets_count})
                                </h4>
                                <div className="space-y-3">
                                    {selectedUser.tickets.map(ticket => (
                                        <div key={ticket.id} className="flex items-center justify-between p-3 rounded-xl bg-app-surface-soft border border-app-border">
                                            <div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-slate-200">
                                                    {ticket.subject}
                                                </div>
                                                <div className="text-xs text-app-text-muted">{ticket.id} • {ticket.status} • {new Date(ticket.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <Link href={`/tickets/${ticket.id}`} className="text-xs text-rose-400 hover:text-slate-900 dark:hover:text-white font-bold bg-rose-500/10 px-3 py-1 rounded-lg">
                                                View
                                            </Link>
                                        </div>
                                    ))}
                                    {selectedUser.tickets_count === 0 && <div className="text-app-text-muted italic">No recent tickets.</div>}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-app-border rounded-2xl shadow-2xl">
                        <div className="p-6 border-b border-app-border flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-app-text">Create New User</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-app-text-muted hover:text-app-text transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-app-text-muted mb-2">Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-app-border rounded-lg text-app-text focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-app-text-muted mb-2">Password *</label>
                                <input
                                    type="password"
                                    required
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-app-border rounded-lg text-app-text focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="Enter password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-app-text-muted mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={createForm.full_name}
                                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-app-border rounded-lg text-app-text focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-app-text-muted mb-2">Role *</label>
                                    <select
                                        value={createForm.role}
                                        onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-app-border rounded-lg text-app-text focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                                <div>
                                    <label className="block text-sm font-medium text-app-text-muted mb-2">Status</label>
                                    <select
                                        value={createForm.status}
                                        onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-app-border rounded-lg text-app-text focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="DISABLED">Disabled</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-app-text-muted mb-2">Position</label>
                                    <select
                                        value={createForm.position}
                                        onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-app-border rounded-lg text-app-text focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="TEAM_MEMBER">Team Member</option>
                                        <option value="MANAGER">Manager</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-app-text-muted mb-2">Department</label>
                                    <input
                                        type="text"
                                        value={createForm.department}
                                        onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-app-border rounded-lg text-app-text focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="e.g. Procurement, Finance, IT"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-app-text-muted hover:text-app-text transition-colors"
                                    disabled={creating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-app-text rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
