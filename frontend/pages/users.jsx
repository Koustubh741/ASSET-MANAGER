import Link from 'next/link';
import { ArrowLeft, User, Monitor, Disc, Ticket, Search, Mail, Check, X, ShieldAlert } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';

export default function UsersPage() {
    const { currentRole } = useRole();
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    const isAdmin = currentRole?.slug === 'ADMIN' || currentRole?.slug === 'SYSTEM_ADMIN';

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
                        userMap[u.full_name] = {
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
                        if (!userMap[userName]) {
                            userMap[userName] = {
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
                            if (userMap[userName].software_licenses) {
                                userMap[userName].software_licenses.push(asset);
                                userMap[userName].software_count += 1;
                            }
                        } else {
                            if (userMap[userName].assigned_assets) {
                                userMap[userName].assigned_assets.push(asset);
                                userMap[userName].assets_count += 1;
                            }
                        }
                    }
                });

                // 3. Discover/Update from Tickets
                apiTickets.forEach(ticket => {
                    const userName = ticket.requestor_id;
                    if (userName) {
                        if (!userMap[userName]) {
                            userMap[userName] = {
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
                        if (userMap[userName].tickets) {
                            userMap[userName].tickets.push(ticket);
                            userMap[userName].tickets_count += 1;
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

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading inventory...</div>;

    return (
        <div className="min-h-screen p-8 bg-slate-950 text-slate-100">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/enterprise-features" className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">User Inventory</h1>
                            <p className="text-slate-400 mt-1">Track assets and licenses by employee</p>
                        </div>
                    </div>
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
                                <div key={user.id} className="bg-slate-900 border border-white/10 p-4 rounded-xl flex justify-between items-center group hover:border-amber-500/30 transition-all">
                                    <div>
                                        <h3 className="font-bold text-slate-200">{user.full_name}</h3>
                                        <p className="text-xs text-slate-400">{user.email}</p>
                                        <p className="text-xs text-amber-500/80 mt-1 uppercase font-mono">{user.role}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(user.id)}
                                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                                            title="Approve"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeny(user.id)}
                                            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
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
                <div className="glass-panel p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center">
                    <Search className="text-slate-500 ml-2" size={20} />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        className="bg-transparent border-none outline-none text-white ml-4 flex-1"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="glass-panel p-6 rounded-2xl bg-slate-900 border border-white/10 hover:border-cyan-500/30 transition-all group">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-100">{user.name}</h3>
                                        <div className="flex flex-col">
                                            <p className="text-sm text-slate-400">{user.role}</p>
                                            {user.email && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                                    <Mail size={12} /> {user.email}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full border ${user.status?.toUpperCase() === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400'}`}>
                                    {user.status}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Monitor size={18} className="text-blue-400" />
                                        <span className="text-sm font-medium">Assets</span>
                                    </div>
                                    <span className="font-mono text-white font-bold">{user.assets_count}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Disc size={18} className="text-purple-400" />
                                        <span className="text-sm font-medium">Software</span>
                                    </div>
                                    <span className="font-mono text-white font-bold">{user.software_count}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Ticket size={18} className="text-rose-400" />
                                        <span className="text-sm font-medium">Tickets</span>
                                    </div>
                                    <span className="font-mono text-white font-bold">{user.tickets_count}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
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
                    <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-slate-100">{selectedUser.name}</h3>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
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
                                className="text-slate-400 hover:text-white"
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
                                        <Link href={`/assets/${asset.id}`} key={asset.id} className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all group">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-medium text-slate-200 group-hover:text-blue-300">{asset.name}</div>
                                                    <div className="text-xs text-slate-500 font-mono mt-1">{asset.id}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-slate-300">{asset.category}</div>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{asset.status}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    {selectedUser.assets_count === 0 && <div className="text-slate-500 italic">No assets assigned.</div>}
                                </div>
                            </div>

                            {/* 2. Software Licenses (Real Data) */}
                            <div>
                                <h4 className="flex items-center gap-2 text-purple-400 font-bold mb-4">
                                    <Disc size={18} /> Software Licenses ({selectedUser.software_count})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {selectedUser.software_licenses.map((license, i) => (
                                        <div key={license.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">L</div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-200">
                                                    {license.name}
                                                </div>
                                                <div className="text-xs text-slate-500">{license.model} • {license.status}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedUser.software_count === 0 && <div className="text-slate-500 italic">No software licenses assigned.</div>}
                                </div>
                            </div>

                            {/* 3. Recent Tickets (Real Data) */}
                            <div>
                                <h4 className="flex items-center gap-2 text-rose-400 font-bold mb-4">
                                    <Ticket size={18} /> Recent Tickets ({selectedUser.tickets_count})
                                </h4>
                                <div className="space-y-3">
                                    {selectedUser.tickets.map(ticket => (
                                        <div key={ticket.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                            <div>
                                                <div className="text-sm font-medium text-slate-200">
                                                    {ticket.subject}
                                                </div>
                                                <div className="text-xs text-slate-500">{ticket.id} • {ticket.status} • {new Date(ticket.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <Link href={`/tickets/${ticket.id}`} className="text-xs text-rose-400 hover:text-white font-bold bg-rose-500/10 px-3 py-1 rounded-lg">
                                                View
                                            </Link>
                                        </div>
                                    ))}
                                    {selectedUser.tickets_count === 0 && <div className="text-slate-500 italic">No recent tickets.</div>}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
