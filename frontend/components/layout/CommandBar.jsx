import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Search, Command, Layout, LifeBuoy, PlusCircle, Settings, User } from 'lucide-react';

const ACTIONS = [
    { id: 'dash', label: 'Go to Dashboard', icon: Layout, route: '/dashboard' },
    { id: 'assets', label: 'Inventory Management', icon: Command, route: '/assets' },
    { id: 'tickets', label: 'Support Center', icon: LifeBuoy, route: '/tickets' },
    { id: 'add-asset', label: 'Register New Asset', icon: PlusCircle, route: '/assets/add' },
    { id: 'profile', label: 'View Profile', icon: User, route: '/profile' },
    { id: 'settings', label: 'System Settings', icon: Settings, route: '/settings' },
];

export default function CommandBar() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const router = useRouter();

    const handleKeyDown = useCallback((e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsOpen(prev => !prev);
        }
        if (e.key === 'Escape') setIsOpen(false);
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const filteredActions = ACTIONS.filter(action => 
        action.label.toLowerCase().includes(query.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <div className="absolute inset-0 bg-app-bg/60 backdrop-blur-md pointer-events-auto" onClick={() => setIsOpen(false)} />
            
            <div className="w-full max-w-2xl glass-zenith shadow-2xl pointer-events-auto animate-digitize border-primary/20 bg-app-surface/95 overflow-hidden">
                <div className="relative flex items-center p-4 border-b border-app-border/40">
                    <Search className="absolute left-6 text-app-text-muted" size={20} />
                    <input
                        autoFocus
                        placeholder="Type a command or search..."
                        className="w-full bg-transparent pl-12 pr-4 py-2 text-lg font-bold outline-none placeholder:text-app-text-muted/40"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-none border border-app-border bg-app-surface-soft text-[10px] font-black uppercase tracking-widest text-app-text-muted">
                        <span>ESC</span>
                    </div>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {filteredActions.length > 0 ? (
                        <div className="space-y-1">
                            {filteredActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.id}
                                        onClick={() => {
                                            router.push(action.route);
                                            setIsOpen(false);
                                        }}
                                        className="w-full flex items-center justify-between p-4 rounded-none transition-all group hover:bg-primary/10 border border-transparent hover:border-primary/20"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 rounded-none bg-app-surface-soft text-app-text-muted group-hover:text-primary group-hover:bg-primary/20 transition-colors">
                                                <Icon size={18} />
                                            </div>
                                            <span className="font-bold text-sm tracking-tight text-app-text group-hover:translate-x-1 transition-transform uppercase">
                                                {action.label}
                                            </span>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-black uppercase text-primary tracking-widest">
                                            <span>Execute</span>
                                            <Command size={12} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-app-text-muted">
                            <p className="text-sm font-medium italic opacity-60">No matching commands found...</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-app-surface-soft/50 border-t border-app-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-app-text-muted tracking-widest">
                            <span className="px-1.5 py-0.5 rounded border border-app-border bg-white/5 whitespace-nowrap">↑↓</span>
                            <span>Navigate</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-app-text-muted tracking-widest">
                            <span className="px-1.5 py-0.5 rounded border border-app-border bg-white/5 whitespace-nowrap">Enter</span>
                            <span>Open</span>
                        </div>
                    </div>
                    <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Retail Zenith Command</span>
                </div>
            </div>
        </div>
    );
}
