import { useState, useEffect } from 'react';
import { Search, Filter, Save, X, Calendar, Briefcase, Tag, AlertTriangle, User } from 'lucide-react';

export default function SmartFiltersBar({ onFilterChange, onSaveView, className = "", initialFilters }) {
    const [filters, setFilters] = useState({
        search: '',
        status: 'All',
        category: 'All',
        department: 'All',
        warranty: 'All'
    });

    // Update internal state when initialFilters changes (e.g. from URL)
    useEffect(() => {
        if (initialFilters) {
            setFilters(prev => ({ ...prev, ...initialFilters }));
        }
    }, [initialFilters]);

    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        const reset = {
            search: '',
            status: 'All',
            category: 'All',
            department: 'All',
            warranty: 'All'
        };
        setFilters(reset);
        onFilterChange(reset);
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Main Bar */}
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input */}
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-500 dark:text-slate-400 dark:text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 sm:text-sm backdrop-blur-sm transition-all"
                        placeholder="Search assets by name, ID, or serial..."
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                    />
                </div>

                {/* Primary Filters (Visible) */}
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 font-sans">
                    <select
                        value={filters.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 bg-white border-slate-300 text-slate-700 py-2.5 px-4 pr-8 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                        <option value="All">All Status</option>
                        <option value="In Use">In Use</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Repair">Repair</option>
                        <option value="Retired">Retired</option>
                    </select>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border transition-all ${isExpanded
                            ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                            : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10'
                            }`}
                    >
                        <Filter size={16} />
                        <span className="text-sm font-medium">More Filters</span>
                    </button>

                    <button
                        onClick={() => onSaveView && onSaveView(filters)}
                        className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-all"
                    >
                        <Save size={16} />
                        <span className="text-sm font-medium hidden sm:inline">Save View</span>
                    </button>

                    {(filters.search || filters.status !== 'All' || filters.category !== 'All' || filters.department !== 'All' || filters.warranty !== 'All') && (
                        <button
                            onClick={clearFilters}
                            className="p-2.5 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Clear Filters"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-white/5 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 flex items-center space-x-2">
                            <Tag size={12} /> <span>Category</span>
                        </label>
                        <select
                            value={filters.category}
                            onChange={(e) => handleChange('category', e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 bg-white border-slate-300 text-slate-900 rounded-lg py-2 px-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="All">All Categories</option>
                            <option value="Laptop">Laptops</option>
                            <option value="Desktop">Desktops</option>
                            <option value="Monitor">Monitors</option>
                            <option value="Server">Servers</option>
                            <option value="Peripheral">Peripherals</option>
                            <option value="Software">Software</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 flex items-center space-x-2">
                            <Briefcase size={12} /> <span>Department</span>
                        </label>
                        <select
                            value={filters.department}
                            onChange={(e) => handleChange('department', e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 bg-white border-slate-300 text-slate-900 rounded-lg py-2 px-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="All">All Departments</option>
                            <option value="IT">IT Support</option>
                            <option value="HR">Human Resources</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Sales">Sales</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Finance">Finance</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 flex items-center space-x-2">
                            <AlertTriangle size={12} /> <span>Warranty Status</span>
                        </label>
                        <select
                            value={filters.warranty}
                            onChange={(e) => handleChange('warranty', e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 bg-white border-slate-300 text-slate-900 rounded-lg py-2 px-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="All">Any Status</option>
                            <option value="Active">Active Warranty</option>
                            <option value="Expiring Soon">Expiring (30 Days)</option>
                            <option value="Expired">Expired</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 flex items-center space-x-2">
                            <User size={12} /> <span>Assignment</span>
                        </label>
                        <select
                            value={filters.assignment || 'All'}
                            onChange={(e) => handleChange('assignment', e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 bg-white border-slate-300 text-slate-900 rounded-lg py-2 px-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="All">All Assets</option>
                            <option value="Assigned">Assigned Only</option>
                            <option value="Unassigned">Unassigned Only</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
