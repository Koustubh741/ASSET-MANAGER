import Link from 'next/link'
import { MoreVertical, Eye, Edit, UserPlus } from 'lucide-react'

export default function AssetTable({ assets }) {
    const safeAssets = Array.isArray(assets) ? assets : [];

    const getStatusColor = (status) => {
        const s = status != null ? String(status) : '';
        switch (s) {
            case 'In Use': return 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
            case 'Active': return 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' // Treat Active as In Use
            case 'In Stock': return 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
            case 'Repair': return 'bg-orange-500/10 text-orange-400 ring-orange-500/20'
            case 'Retired': return 'bg-slate-500/10 text-slate-400 ring-slate-500/20'
            case 'Discovered': return 'bg-purple-500/10 text-purple-400 ring-purple-500/20'
            default: return 'bg-slate-500/10 text-slate-400 ring-slate-500/20'
        }
    }

    return (
        <div className="overflow-hidden rounded-xl border border-white/10 light:border-slate-200 shadow-xl backdrop-blur-sm bg-white/5 light:bg-white">
            <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-300 light:bg-slate-100 light:text-slate-600 font-medium border-b border-white/5 light:border-slate-200 uppercase tracking-wider text-xs">
                    <tr>
                        <th className="px-6 py-4">Asset Name</th>
                        <th className="px-6 py-4">Segment</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Cost</th>
                        <th className="px-6 py-4">Assigned To</th>
                        <th className="px-6 py-4">Assigned By</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 light:divide-slate-200">
                    {safeAssets.map((asset, index) => {
                        const assetId = asset?.id ?? asset?.serial_number ?? `asset-${index}`;
                        return (
                        <tr key={assetId} className="hover:bg-white/5 light:hover:bg-slate-50 transition-colors duration-200">
                            <td className="px-6 py-4">
                                <div className="font-semibold text-slate-100 light:text-slate-800">{asset?.name ?? 'Unnamed'}</div>
                                <div className="text-slate-400 light:text-slate-600 text-xs font-mono mt-0.5 opacity-70">{asset?.serial_number ?? '—'}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-300 light:text-slate-700">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ${asset.segment === 'NON-IT'
                                    ? 'bg-purple-400/10 text-purple-300 ring-purple-400/20'
                                    : 'bg-blue-400/10 text-blue-300 ring-blue-400/20'
                                    }`}>
                                    {asset.segment || 'IT'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-300 light:text-slate-700 font-medium">{asset.type}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${getStatusColor(asset?.status)}`}>
                                    {asset?.status === 'Active' ? 'In Use' : (asset?.status ?? '—')}
                                </span>
                                {asset.warranty_expiry && new Date(asset.warranty_expiry) <= new Date(new Date().setDate(new Date().getDate() + 30)) && new Date(asset.warranty_expiry) >= new Date() && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30" title="Warranty Expiring">
                                        WAR
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-slate-300 font-mono">
                                ₹{asset.cost ? asset.cost.toLocaleString() : '0'}
                            </td>
                            <td className="px-6 py-4 text-slate-300">
                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-300 border border-indigo-500/30">
                                        {asset.assigned_to?.charAt(0).toUpperCase() || 'A'}
                                    </div>
                                    <span className="truncate max-w-[120px]">{asset.assigned_to || 'Asset Team'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-300 light:text-slate-700 font-mono text-xs">
                                {asset.assigned_by || 'Admin'}
                            </td>
                            <td className="px-6 py-4 text-slate-300 light:text-slate-700 text-xs">{asset.location}</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end space-x-1">
                                    <Link href={`/assets/${assetId}`} className="p-2 hover:bg-white/10 light:hover:bg-slate-100 rounded-lg text-slate-400 light:text-slate-600 hover:text-blue-300 light:hover:text-blue-600 transition-colors">
                                        <Eye size={16} />
                                    </Link>
                                    <Link href={`/assets/${assetId}?edit=true`} className="p-2 hover:bg-white/10 light:hover:bg-slate-100 rounded-lg text-slate-400 light:text-slate-600 hover:text-emerald-300 light:hover:text-emerald-600 transition-colors">
                                        <Edit size={16} />
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
