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
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-white light:text-slate-800">Custodian Operations</h1>
                <p className="text-slate-400">Physical inventory management and logistics</p>
            </header>

            <ActionsNeededBanner
                title="Actions needed"
                items={[
                    ...(inspectionPending.length > 0 ? [{ label: 'Pending inspections', count: inspectionPending.length, icon: ClipboardCheck, variant: 'warning' }] : []),
                    ...(deliveryQueue.length > 0 ? [{ label: 'Inbound shipments', count: deliveryQueue.length, icon: Truck, variant: 'primary' }] : []),
                ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
                            <Box size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white light:text-slate-800">850</h3>
                            <p className="text-xs text-slate-400">Assets in Custody</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-amber-500/20 text-amber-400">
                            <ClipboardCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white light:text-slate-800">12</h3>
                            <p className="text-xs text-slate-400">Pending Inspections</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-teal-500/20 text-teal-400">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white light:text-slate-800">5</h3>
                            <p className="text-xs text-slate-400">Inbound Shipments</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-rose-500/20 text-rose-400">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white light:text-slate-800">3</h3>
                            <p className="text-xs text-slate-400">Location Mismatches</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Deliveries */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4">Inbound Tracking</h3>
                    <div className="space-y-4">
                        {deliveryQueue.map(order => (
                            <div key={order.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">PO</div>
                                    <div>
                                        <p className="text-white font-medium">{order.vendor}</p>
                                        <p className="text-xs text-slate-400">{order.items} Items • {order.id}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs border ${order.status === 'Arrived at Gate' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-blue-500/30 text-blue-400 bg-blue-500/10'}`}>
                                    {order.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inspection Queue */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-white light:text-slate-800 mb-4">Inspection Queue</h3>
                    <table className="w-full text-sm text-left">
                        <thead className="text-slate-500 border-b border-white/10 light:border-slate-200">
                            <tr>
                                <th className="pb-2">Asset Type</th>
                                <th className="pb-2">Serial</th>
                                <th className="pb-2">Dock</th>
                                <th className="pb-2">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 light:text-slate-700">
                            {inspectionPending.map(item => (
                                <tr key={item.id} className="border-b border-white/5 light:border-slate-200 last:border-0">
                                    <td className="py-3">{item.type}</td>
                                    <td className="py-3 font-mono text-xs">{item.serial}</td>
                                    <td className="py-3">{item.location}</td>
                                    <td className="py-3">
                                        <button className="text-blue-400 hover:underline">Inspect</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
