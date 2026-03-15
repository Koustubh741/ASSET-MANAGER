import { useState, useEffect } from 'react';
import { X, Save, Eye, Trash2, Share2, MoreHorizontal } from 'lucide-react';

export default function SavedViewsDrawer({ isOpen, onClose, currentFilters, onLoadView }) {
    const [viewName, setViewName] = useState('');
    const [savedViews, setSavedViews] = useState([]);

    useEffect(() => {
        // Load from localStorage or Mock
        const loadViews = () => {
            const stored = localStorage.getItem('asset_saved_views');
            if (stored) {
                setSavedViews(JSON.parse(stored));
            } else {
                // Mock Defaults
                setSavedViews([
                    { id: 1, name: 'Expiring Warranties (IT)', filters: { department: 'IT', warranty: 'Expiring Soon' }, created: '2023-11-01' },
                    { id: 2, name: 'Unassigned Laptops', filters: { category: 'Laptop', status: 'In Stock' }, created: '2023-11-10' },
                    { id: 3, name: 'Engineering High Value', filters: { department: 'Engineering', category: 'All' }, created: '2023-11-15' }
                ]);
            }
        };
        if (isOpen) loadViews();
    }, [isOpen]);

    const handleSave = () => {
        if (!viewName) return;
        const newView = {
            id: Date.now(),
            name: viewName,
            filters: currentFilters || {},
            created: new Date().toISOString().split('T')[0]
        };
        const updated = [newView, ...savedViews];
        setSavedViews(updated);
        localStorage.setItem('asset_saved_views', JSON.stringify(updated));
        setViewName('');
    };

    const handleDelete = (id) => {
        const updated = savedViews.filter(v => v.id !== id);
        setSavedViews(updated);
        localStorage.setItem('asset_saved_views', JSON.stringify(updated));
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-slate-900/50">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Views</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
                            <X size={20} />
                        </button>
                    </div>

                    {/* New View Form */}
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/30">
                        <h3 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wide">Save Current View</h3>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={viewName}
                                onChange={(e) => setViewName(e.target.value)}
                                placeholder="Enter view name..."
                                className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-900 dark:text-white"
                            />
                            <button
                                onClick={handleSave}
                                disabled={!viewName}
                                className="bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Save size={18} />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">My Views</h3>
                        {savedViews.map(view => (
                            <div key={view.id} className="group bg-slate-100 dark:bg-white/5 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:border-white/20 rounded-xl p-4 transition-all duration-200">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-slate-900 dark:text-slate-200">{view.name}</h4>
                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDelete(view.id)}
                                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-400/10"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-400 rounded-lg hover:bg-blue-400/10">
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {Object.entries(view.filters).map(([key, val]) => (
                                        val !== 'All' && val !== '' && (
                                            <span key={key} className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                                                {key}: {val}
                                            </span>
                                        )
                                    ))}
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{view.created}</span>
                                    <button
                                        onClick={() => {
                                            onLoadView && onLoadView(view.filters);
                                            onClose();
                                        }}
                                        className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                                    >
                                        <span>Apply View</span>
                                        <Eye size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
