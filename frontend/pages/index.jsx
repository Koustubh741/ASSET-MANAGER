import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useRole } from '@/contexts/RoleContext'
import SystemAdminDashboard from '@/components/dashboards/SystemAdminDashboard'
import AssetInventoryDashboard from '@/components/dashboards/AssetInventoryDashboard'
import ITSupportDashboard from '@/components/dashboards/ITSupportDashboard'
import EndUserDashboard from '@/components/dashboards/EndUserDashboard'

export default function Dashboard() {
    const { currentRole } = useRole();
    const router = useRouter();

    // Finance and Procurement have dedicated portals with their own PortalLayout.
    // Redirect immediately so neither role ever sees the generic dashboard.
    useEffect(() => {
        if (currentRole?.label === 'Finance') {
            router.replace('/finance');
        } else if (currentRole?.label === 'Procurement Manager') {
            router.replace('/procurement');
        }
    }, [currentRole, router]);

    if (!currentRole) return null;

    if (currentRole.label === 'Finance') return null;
    if (currentRole.label === 'Procurement Manager') return null;

    if (currentRole.label === 'System Admin') return <SystemAdminDashboard />
    if (currentRole.label === 'Asset & Inventory Manager') return <AssetInventoryDashboard />
    if (currentRole.label === 'IT Management') return <ITSupportDashboard />
    if (currentRole.label === 'End User') return <EndUserDashboard />

    return <SystemAdminDashboard />
}
