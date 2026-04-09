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

// NEW DEPARTMENTAL DASHBOARDS
import EngineeringDashboard from '@/components/dashboards/EngineeringDashboard'
import HRDashboard from '@/components/dashboards/HRDashboard'
import OperationsDashboard from '@/components/dashboards/OperationsDashboard'
import LegalDashboard from '@/components/dashboards/LegalDashboard'
import BusinessOpsDashboard from '@/components/dashboards/BusinessOpsDashboard'
import SupportPortalDashboard from '@/components/dashboards/SupportPortalDashboard'

export default function Dashboard() {
    const { currentRole, user, isAuthenticated, isLoading, isAdmin, isFinanceStaff, isProcurementStaff, isAssetStaff, isITStaff, isManagerial } = useRole();
    const router = useRouter();

    // AUTH GUARD: If not authenticated and not loading, don't render dashboards.
    // AuthGuard.jsx will handle the redirect, but this prevents "Alex Johnson" blink.
    if (isLoading) return null;
    if (!isAuthenticated) return null;
    if (!currentRole) return null;

    // 1. High-Level Role Routing First
    if (isAdmin) return <SystemAdminDashboard />
    if (isFinanceStaff) return <FinanceDashboard />
    if (isProcurementStaff) return <ProcurementManagerDashboard />
    if (isAssetStaff) return <AssetInventoryDashboard />

    // 2. IT Routing: Manager vs Technician
    if (isITStaff) {
        const title = String(user?.position || '').toLowerCase();
        const isTechnician = (isITStaff && !isManagerial) || 
                             title === 'team_member' || 
                             title.includes('support') || 
                             title.includes('specialist');
        return isTechnician ? <ITStaffDashboard /> : <ITSupportDashboard />;
    }

    // 2.5 Non-IT SUPPORT Staff Routing
    // If the user has a SUPPORT role but is NOT in IT, they get the generalized Support Portal
    if (currentRole?.slug === 'SUPPORT') {
        return <SupportPortalDashboard />;
    }

    // 3. Departmental "Root Fix" Routing
    // This catches END_USER and MANAGER roles and directs them to their specialized portal
    const deptSlug = user?.dept_obj?.slug || (user?.department || '').toLowerCase();

    // Engineering / Cloud / IT (Non-Support)
    if (deptSlug === 'engineering' || deptSlug === 'security' || deptSlug.includes('eng') || deptSlug.includes('dev') || deptSlug.includes('cloud') || deptSlug.includes('tech')) {
        return <EngineeringDashboard />;
    }

    // Human Resources
    if (deptSlug === 'hr' || deptSlug.includes('hr') || deptSlug.includes('human')) {
        return <HRDashboard />;
    }

    // Operations / Logistics / Facilities
    if (deptSlug === 'operations' || deptSlug.includes('op') || deptSlug.includes('log') || deptSlug.includes('facil')) {
        return <OperationsDashboard />;
    }

    // Legal / Compliance / Audit / GRC
    if (deptSlug === 'legal' || deptSlug.includes('leg') || deptSlug.includes('comp') || deptSlug.includes('audit')) {
        return <LegalDashboard />;
    }

    // Sales / Marketing / Product / Business
    if (deptSlug === 'sales' || deptSlug === 'product' || deptSlug === 'customer_success' || deptSlug.includes('sale') || deptSlug.includes('mark') || deptSlug.includes('prod') || deptSlug.includes('biz')) {
        return <BusinessOpsDashboard />;
    }

    // Procurement
    if (deptSlug === 'procurement') {
        return <ProcurementManagerDashboard />;
    }

    // Finance
    if (deptSlug === 'finance') {
        return <FinanceDashboard />;
    }


    // 4. Default Fallback
    return <EndUserDashboard />
}

