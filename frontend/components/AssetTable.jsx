import Link from 'next/link'
import { MoreVertical, Eye, Edit, UserPlus } from 'lucide-react'

export default function AssetTable({ assets }) {
    const safeAssets = Array.isArray(assets) ? assets : [];

    const getStatusColor = (status) => {
        const s = status != null ? String(status) : '';
        switch (s) {
            case 'In Use': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            case 'Active': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            case 'In Stock': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            case 'Repair': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            case 'Retired': return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
            case 'Discovered': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            default: return 'bg-white/5 text-slate-400 border border-white/10'
        }
    }

    return (
        <div className="glass-panel overflow-x-auto relative shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
            <table className="w-full text-left text-sm">
                <thead className="bg-app-surface-soft text-[11px] uppercase font-bold tracking-wider text-app-text-muted border-b border-app-border">
                    <tr>
                        <th className="px-6 py-4">Asset Name</th>
                        <th className="px-6 py-4">OEM Name</th>
                        <th className="px-6 py-4">Serial No.</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Cost</th>
                        <th className="px-6 py-4">Assigned To</th>
                        <th className="px-6 py-4">Assigned By</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                    {safeAssets.map((asset, index) => {
                        const assetId = asset?.id ?? asset?.serial_number ?? `asset-${index}`;
                        const isIT = (asset.segment === 'IT');
                        return (
                            <tr key={assetId} className="hover:bg-primary/5 transition-colors duration-200 group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-app-text group-hover:text-primary transition-colors">{asset?.name ?? 'Unnamed'}</div>
                                </td>
                                <td className="px-6 py-4 text-app-text-muted font-medium">
                                    {asset?.vendor || 'Unknown'}
                                </td>
                                <td className="px-6 py-4 text-app-text-muted font-mono text-xs">
                                    {asset?.serial_number ?? '—'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${isIT
                                        ? 'bg-primary/10 text-primary border border-primary/20'
                                        : 'bg-secondary/10 text-secondary border border-secondary/20'
                                        }`}>
                                        {asset.segment || 'IT'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-app-text-muted font-medium">{asset.type}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusColor(asset?.status)}`}>
                                        {asset?.status === 'Active' ? 'In Use' : (asset?.status ?? '—')}
                                    </span>
                                    {asset.warranty_expiry && new Date(asset.warranty_expiry) <= new Date(new Date().setDate(new Date().getDate() + 30)) && new Date(asset.warranty_expiry) >= new Date() && (
                                        <span className="ml-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30" title="Warranty Expiring">
                                            WAR
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-app-text-muted font-mono text-xs">
                                    ₹{asset.cost ? asset.cost.toLocaleString() : '0'}
                                </td>
                                <td className="px-6 py-4 text-app-text-muted">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-5 h-5 bg-white/5 flex items-center justify-center text-[9px] font-bold text-white border border-white/10">
                                            {asset.assigned_to?.charAt(0).toUpperCase() || 'A'}
                                        </div>
                                        <span className="truncate max-w-[120px] text-xs font-medium">{asset.assigned_to || 'Asset Team'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-app-text-muted font-mono text-[10px]">
                                    {asset.assigned_by || 'Admin'}
                                </td>
                                <td className="px-6 py-4 text-app-text-muted text-xs font-medium">{asset.location}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link href={`/assets/${assetId}`} className="p-1.5 bg-app-surface-soft border border-app-border hover:border-primary/50 text-app-text-muted hover:text-primary transition-all">
                                            <Eye size={14} />
                                        </Link>
                                        <Link href={`/assets/${assetId}?edit=true`} className="p-1.5 bg-app-surface-soft border border-app-border hover:border-secondary/50 text-app-text-muted hover:text-secondary transition-all">
                                            <Edit size={14} />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    )
}
