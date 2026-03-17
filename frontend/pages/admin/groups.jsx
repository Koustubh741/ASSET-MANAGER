import { useState, useEffect } from 'react';
import { ArrowLeft, Users, UserPlus, Trash2, Info, Plus } from 'lucide-react';
import router from 'next/router';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/components/common/Toast';

export default function AssignmentGroupsAdmin() {
    const toast = useToast();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newGroup, setNewGroup] = useState({ name: '', department: '', description: '' });

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const data = await apiClient.getAssignmentGroups();
                setGroups(data);
            } catch (error) {
                toast.error('Failed to fetch groups');
            } finally {
                setLoading(false);
            }
        };
        fetchGroups();
    }, []);

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            const created = await apiClient.createAssignmentGroup(newGroup);
            setGroups([...groups, created]);
            setIsAddModalOpen(false);
            setNewGroup({ name: '', department: '', description: '' });
            toast.success('Group created successfully');
        } catch (error) {
            toast.error('Failed to create group');
        }
    };

    const handleDeleteGroup = async (id) => {
        if (!confirm('Are you sure you want to delete this group?')) return;
        try {
            await apiClient.deleteAssignmentGroup(id);
            setGroups(groups.filter(g => g.id !== id));
            toast.success('Group deleted');
        } catch (error) {
            toast.error('Failed to delete group');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen p-8 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Assignment Groups</h1>
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20"
                    >
                        Create Group
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <div key={group.id} className="p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl space-y-4 relative group">
                            <button 
                                onClick={() => handleDeleteGroup(group.id)}
                                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={16} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase leading-none">{group.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{group.department || 'General'}</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{group.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 space-y-6">
                        <h2 className="text-xl font-black uppercase italic text-slate-900 dark:text-white">Create New Group</h2>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <input
                                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm"
                                placeholder="Group Name"
                                value={newGroup.name}
                                onChange={e => setNewGroup({...newGroup, name: e.target.value})}
                                required
                            />
                            <input
                                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm"
                                placeholder="Department"
                                value={newGroup.department}
                                onChange={e => setNewGroup({...newGroup, department: e.target.value})}
                            />
                            <textarea
                                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-sm h-32"
                                placeholder="Description"
                                value={newGroup.description}
                                onChange={e => setNewGroup({...newGroup, description: e.target.value})}
                            />
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold uppercase text-xs">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
