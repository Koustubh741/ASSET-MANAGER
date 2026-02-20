import { useState } from 'react';
import SystemAdminDashboard from './SystemAdminDashboard';
import AssetOwnerDashboard from './AssetOwnerDashboard';
import InventoryManagerDashboard from './InventoryManagerDashboard';
import CustodianDashboard from './CustodianDashboard';
import { LayoutDashboard, UserSquare, PackageSearch, Truck } from 'lucide-react';

export default function AssetInventoryDashboard() {
    const [activeTab, setActiveTab] = useState('manager');

    const tabs = [
        { id: 'manager', label: 'Asset Manager', icon: LayoutDashboard, component: SystemAdminDashboard },
        { id: 'owner', label: 'Asset Owner', icon: UserSquare, component: AssetOwnerDashboard },
        { id: 'inventory', label: 'Inventory Manager', icon: PackageSearch, component: InventoryManagerDashboard },
        { id: 'custodian', label: 'Custodian', icon: Truck, component: CustodianDashboard },
    ];

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || SystemAdminDashboard;

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 bg-slate-900/50 light:bg-slate-100 p-1.5 rounded-xl border border-white/5 light:border-slate-200 backdrop-blur-sm w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-100'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ActiveComponent />
            </div>
        </div>
    );
}
