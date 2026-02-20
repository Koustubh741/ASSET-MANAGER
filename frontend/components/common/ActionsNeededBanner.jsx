import { ChevronRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * Reusable "Actions needed" banner for all role dashboards.
 * Renders a compact strip of items that need attention (e.g. pending approvals, open tickets).
 * @param {Array<{ label: string, count: number, href?: string, onClick?: () => void, icon?: React.ComponentType, variant?: 'primary'|'warning'|'info'|'success' }>} items
 * @param {string} title - Optional title (e.g. "Actions needed")
 */
export default function ActionsNeededBanner({ items = [], title = 'Actions needed' }) {
    if (!items || items.length === 0) return null;

    const itemsWithCount = items.filter((i) => (i.count ?? 0) > 0);
    if (itemsWithCount.length === 0) return null;

    const variantStyles = {
        primary: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20',
        warning: 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20',
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20',
        success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20',
    };

    return (
        <div className="mb-6 p-4 rounded-xl bg-slate-800/60 border border-white/10 light:bg-slate-100 light:border-slate-200 backdrop-blur-sm flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-slate-300 light:text-slate-700 font-semibold text-sm shrink-0">
                <AlertCircle size={18} className="text-amber-400" />
                {title}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {itemsWithCount.map((item, idx) => {
                    const Icon = item.icon;
                    const style = variantStyles[item.variant || 'primary'];
                    const content = (
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${style}`}>
                            {Icon && <Icon size={14} />}
                            <span>{item.label}</span>
                            <span className="font-bold opacity-90">{item.count}</span>
                            {(item.href || item.onClick) && <ChevronRight size={14} className="opacity-70" />}
                        </span>
                    );
                    if (item.href) {
                        return (
                            <Link key={idx} href={item.href} className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-lg">
                                {content}
                            </Link>
                        );
                    }
                    if (item.onClick) {
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={item.onClick}
                                className="focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-lg"
                            >
                                {content}
                            </button>
                        );
                    }
                    return <span key={idx}>{content}</span>;
                })}
            </div>
        </div>
    );
}
