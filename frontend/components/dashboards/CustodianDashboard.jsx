import { Box, ClipboardCheck, MapPin, Truck } from 'lucide-react';
import ActionsNeededBanner from '@/components/common/ActionsNeededBanner';

export default function CustodianDashboard() {
    const deliveryQueue = [
        { id: 'ORD-5521', items: 12, vendor: 'Dell Enterprise', status: 'Arrived at Gate' },
        { id: 'ORD-5524', items: 5, vendor: 'Apple Inc', status: 'In Transit' }
    ];

    const inspectionPending = [
        { id: 'AST-992', type: 'Laptop', serial: 'SN-992837', location: 'Dock A' },
        { id: 'AST-112', type: 'Monitor', serial: 'SN-112344', location: 'Dock B' }
    ];

    return (
        <div className="space-y-6 neural-compact">
            <header>
                <h1 className="text-xl font-black text-app-text tracking-tight">Custodian Operations</h1>
                <p className="text-app-text-muted mt-1 font-medium">Physical inventory management and logistics</p>
            </header>

            <ActionsNeededBanner
                title="Actions needed"
                items={[
                    ...(inspectionPending.length > 0 ? [{ label: 'Pending inspections', count: inspectionPending.length, icon: ClipboardCheck, variant: 'warning' }] : []),
                    ...(deliveryQueue.length > 0 ? [{ label: 'Inbound shipments', count: deliveryQueue.length, icon: Truck, variant: 'primary' }] : []),
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-6 border border-app-border hover:shadow-lg transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
                            <Box size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-app-text">850</h3>
                            <p className="text-[10px] uppercase font-black tracking-widest text-app-text-muted">Assets in Custody</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 border border-app-border hover:shadow-lg transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                            <ClipboardCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-app-text">12</h3>
                            <p className="text-[10px] uppercase font-black tracking-widest text-app-text-muted">Pending Inspections</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 border border-app-border hover:shadow-lg transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-app-text">5</h3>
                            <p className="text-[10px] uppercase font-black tracking-widest text-app-text-muted">Inbound Shipments</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 border border-app-border hover:shadow-lg transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-app-text">3</h3>
                            <p className="text-[10px] uppercase font-black tracking-widest text-app-text-muted">Location Mismatches</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Deliveries */}
                <div className="glass-panel p-6 border border-app-border shadow-sm">
                    <h3 className="text-lg font-black text-app-text mb-6 uppercase tracking-widest flex items-center gap-2">
                        <Truck className="text-blue-500" size={20} />
                        Inbound Tracking
                    </h3>
                    <div className="space-y-4">
                        {deliveryQueue.map(order => (
                            <div key={order.id} className="bg-app-surface-soft p-5 rounded-2xl border border-app-border flex items-center justify-between hover:shadow-md transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs shadow-sm dark:shadow-inner">PO</div>
                                    <div>
                                        <p className="text-app-text font-black text-sm uppercase tracking-tight">{order.vendor}</p>
                                        <p className="text-[10px] font-mono font-bold text-app-text-muted mt-0.5">{order.items} Units • REF: {order.id}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${order.status === 'Arrived at Gate' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10'}`}>
                                    {order.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inspection Queue */}
                <div className="glass-panel p-6 border border-app-border shadow-sm">
                    <h3 className="text-lg font-black text-app-text mb-6 uppercase tracking-widest flex items-center gap-2">
                        <ClipboardCheck className="text-amber-500" size={20} />
                        Inspection Queue
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-app-surface-soft text-[10px] font-black uppercase tracking-widest text-app-text-muted border-b border-app-border">
                                <tr>
                                    <th className="p-3">Asset Classification</th>
                                    <th className="p-3">Technical ID</th>
                                    <th className="p-3">Dock Assign</th>
                                    <th className="p-3 text-right">Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {inspectionPending.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-app-surface-soft transition-colors group">
                                        <td className="p-3">
                                            <div className="text-app-text font-black text-sm uppercase tracking-tight">{item.type}</div>
                                            <div className="text-[10px] text-app-text-muted font-medium">Physical verification required</div>
                                        </td>
                                        <td className="p-3 font-mono text-[10px] font-black text-app-text-muted uppercase">{item.serial}</td>
                                        <td className="p-3">
                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-app-text-muted font-black text-[10px] uppercase tracking-widest">{item.location}</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button className="bg-indigo-600 hover:bg-indigo-500 text-app-text text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                                                Inspect
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
