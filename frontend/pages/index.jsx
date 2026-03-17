import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useRole } from '@/contexts/RoleContext'
import SystemAdminDashboard from '@/components/dashboards/SystemAdminDashboard'
import AssetInventoryDashboard from '@/components/dashboards/AssetInventoryDashboard'
import ITSupportDashboard from '@/components/dashboards/ITSupportDashboard'
import ITStaffDashboard from '@/components/dashboards/ITStaffDashboard'
import EndUserDashboard from '@/components/dashboards/EndUserDashboard'
import FinanceDashboard from '@/components/dashboards/FinanceDashboard'
import ProcurementManagerDashboard from '@/components/dashboards/ProcurementManagerDashboard'

export default function Dashboard() {
    const { currentRole, user } = useRole();
    const router = useRouter();

    if (!currentRole) return null;

    if (currentRole.slug === 'FINANCE') return <FinanceDashboard />
    if (currentRole.slug === 'PROCUREMENT') return <ProcurementManagerDashboard />

    if (currentRole.slug === 'ADMIN') return <SystemAdminDashboard />
    if (currentRole.slug === 'ASSET_MANAGER') return <AssetInventoryDashboard />

    // IT Routing: Manager vs Technician
    if (currentRole.slug === 'IT_MANAGEMENT' || currentRole.slug === 'IT_SUPPORT') {
        const title = String(user?.position || '').toLowerCase();
        const isTechnician = currentRole.slug === 'IT_SUPPORT' || 
                             title === 'team_member' || 
                             title.includes('support') || 
                             title.includes('specialist');
        return isTechnician ? <ITStaffDashboard /> : <ITSupportDashboard />;
    }

    if (currentRole.slug === 'END_USER') return <EndUserDashboard />

    return <EndUserDashboard />
}
