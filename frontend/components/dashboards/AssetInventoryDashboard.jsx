import { useState } from 'react';
import SystemAdminDashboard from './SystemAdminDashboard';
import AssetOwnerDashboard from './AssetOwnerDashboard';
import InventoryManagerDashboard from './InventoryManagerDashboard';
import CustodianDashboard from './CustodianDashboard';
import { LayoutDashboard, UserSquare, PackageSearch, Truck } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

export default function AssetInventoryDashboard() {
    const { currentRole } = useRole();
    const isAdmin = currentRole?.slug === 'ADMIN' || currentRole?.slug === 'SYSTEM_ADMIN';
    const [activeTab, setActiveTab] = useState('inventory');

    const allTabs = [
        { id: 'manager', label: 'Executive Overview', icon: LayoutDashboard, component: SystemAdminDashboard, roles: ['ADMIN'] },
        { id: 'inventory', label: 'Inventory Manager', icon: PackageSearch, component: InventoryManagerDashboard, roles: ['ADMIN', 'ASSET_MANAGER'] },
        { id: 'owner', label: 'Asset Owner', icon: UserSquare, component: AssetOwnerDashboard, roles: ['ADMIN', 'ASSET_MANAGER', 'END_USER', 'IT_MANAGEMENT', 'FINANCE', 'PROCUREMENT'] },
        { id: 'custodian', label: 'Custodian', icon: Truck, component: CustodianDashboard, roles: ['ADMIN'] },
    ];

    const tabs = allTabs.filter(tab => tab.roles.includes(currentRole?.slug));
    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || (tabs[0]?.component || AssetOwnerDashboard);

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 bg-white/40 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-md w-fit shadow-sm">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                            ? 'bg-blue-600 text-slate-900 dark:text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-100 dark:bg-white/5'
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
