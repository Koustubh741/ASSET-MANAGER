import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Collapsible dashboard section for cleaner layout across all roles.
 * @param {string} title
 * @param {React.ReactNode} children
 * @param {boolean} defaultOpen
 * @param {React.ReactNode} badge - Optional count or label
 * @param {string} icon - Optional icon component name for consistency (not used here; parent can pass icon in title)
 */
export default function DashboardSection({ title, children, defaultOpen = true, badge }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="glass-panel overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full p-4 border-b border-white/5 bg-white/5 flex items-center justify-between text-left hover:bg-white/[0.07] transition-colors"
            >
                <div className="flex items-center gap-2">
                    {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                    <span className="font-bold text-white">{title}</span>
                    {badge != null && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {badge}
                        </span>
                    )}
                </div>
            </button>
            {open && <div className="p-4">{children}</div>}
        </div>
    );
}
