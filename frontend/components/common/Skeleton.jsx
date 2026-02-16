/**
 * Reusable skeleton loader component - Tailwind only.
 * Use for loading states in tables, cards, and lists.
 */
export default function Skeleton({ className = '', width, height, variant = 'default' }) {
    const base = 'animate-pulse bg-slate-700 rounded';
    const variants = {
        default: base,
        line: `${base} h-4`,
        circle: `${base} rounded-full`,
    };
    const style = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={`${variants[variant] || base} ${className}`}
            style={Object.keys(style).length ? style : undefined}
        />
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
    return (
        <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-slate-400 border-b border-white/10">
                        <tr>
                            {Array.from({ length: cols }).map((_, i) => (
                                <th key={i} className="px-6 py-4">
                                    <Skeleton className="h-4 w-24" variant="line" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {Array.from({ length: rows }).map((_, ri) => (
                            <tr key={ri}>
                                {Array.from({ length: cols }).map((_, ci) => (
                                    <td key={ci} className="px-6 py-4">
                                        <Skeleton
                                            className={`h-4 ${ci === 0 ? 'w-8' : ci === cols - 1 ? 'w-20' : 'w-32'}`}
                                            variant="line"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="glass-card p-6 space-y-4">
            <div className="flex justify-between">
                <Skeleton className="h-4 w-24" variant="line" />
                <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" variant="line" />
            <Skeleton className="h-3 w-full" variant="line" />
        </div>
    );
}
