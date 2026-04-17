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

// V2 RETAIL BESPOKE DASHBOARDS
import NSODashboard from '@/components/dashboards/NSODashboard'
import LossPreventionDashboard from '@/components/dashboards/LossPreventionDashboard'
import StoreOpsDashboard from '@/components/dashboards/StoreOpsDashboard'
import SCMDashboard from '@/components/dashboards/SCMDashboard'
import BMDashboard from '@/components/dashboards/BMDashboard'
import CorporateStrategyDashboard from '@/components/dashboards/CorporateStrategyDashboard'

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

    // Engineering / Cloud / IT
    if (deptSlug === 'engineering' || deptSlug === 'security' || deptSlug.includes('eng') || deptSlug.includes('dev') || deptSlug.includes('cloud') || deptSlug.includes('tech') || deptSlug === 'it') {
        return <EngineeringDashboard />;
    }

    // HR
    if (deptSlug === 'hr' || deptSlug.includes('hr') || deptSlug.includes('human')) {
        return <HRDashboard />;
    }

    // V2 RETAIL: NSO
    if (deptSlug === 'nso') {
        return <NSODashboard />;
    }

    // V2 RETAIL: LOSS PREVENTION
    if (deptSlug === 'loss prevention' || deptSlug.includes('cctv')) {
        return <LossPreventionDashboard />;
    }

    // V2 RETAIL: RETAIL & RETAIL OPERATION
    if (deptSlug === 'retail' || deptSlug === 'retail operation' || deptSlug.includes('store')) {
        return <StoreOpsDashboard />;
    }

    // V2 RETAIL: SCM
    if (deptSlug === 'scm' || deptSlug.includes('logistics') || deptSlug.includes('supply')) {
        return <SCMDashboard />;
    }

    // V2 RETAIL: B&M
    if (deptSlug === 'b&m' || deptSlug.includes('merchandis') || deptSlug.includes('buying')) {
        return <BMDashboard />;
    }

    // V2 RETAIL: BD, PLANNING, MARKETING, PROJECT
    if (deptSlug === 'bd' || deptSlug === 'planning' || deptSlug === 'marketing' || deptSlug === 'project') {
        return <CorporateStrategyDashboard />;
    }

    // V2 RETAIL: ADMIN / FACILITY
    if (deptSlug === 'admin' || deptSlug === 'operations' || deptSlug.includes('facil')) {
        return <OperationsDashboard />;
    }

    // V2 RETAIL: LEGAL & COMPANY SECRETARY
    if (deptSlug === 'legal & company secretary' || deptSlug === 'legal' || deptSlug.includes('leg') || deptSlug.includes('comp') || deptSlug.includes('audit')) {
        return <LegalDashboard />;
    }

    // PROCUREMENT
    if (deptSlug === 'procurement') {
        return <ProcurementManagerDashboard />;
    }

    // V2 RETAIL: INVENTORY
    if (deptSlug === 'inventory') {
        return <AssetInventoryDashboard />; // Maps natively to AssetInventory
    }

    // V2 RETAIL: F&A
    if (deptSlug === 'f&a' || deptSlug === 'finance') {
        return <FinanceDashboard />;
    }


    // 4. Default Fallback
    return <EndUserDashboard />
}

