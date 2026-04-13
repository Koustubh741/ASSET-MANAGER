import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { useRole } from '../contexts/RoleContext';
import { ALL_NAV_ITEMS, ROLE_DASHBOARD_MAP } from '../config/navigation';

/**
 * Custom hook to manage role-based navigation logic.
 */
export const useNavigation = () => {
    const router = useRouter();
    const { 
        currentRole, 
        user,
        isAdmin, 
        isITStaff, 
        isAssetStaff, 
        isFinanceStaff, 
        isProcurementStaff, 
        isManagerial, 
        isStaff 
    } = useRole();

    const dashboardPath = useMemo(() => 
        ROLE_DASHBOARD_MAP[currentRole?.slug] || '/'
    , [currentRole]);

    const filteredNavItems = useMemo(() => {
        const items = ALL_NAV_ITEMS.map(item => {
            // Special mapping for Dashboard label
            if (item.label === 'Dashboard') return { ...item, href: dashboardPath };
            
            // System Admin: "Logistics Hub" and "Financial Governance" go to specialized read-only paths
            if (isAdmin) {
                if (item.label === 'Logistics Hub') return { ...item, href: '/dashboard/system-admin/procurement' };
                if (item.label === 'Financial Governance') return { ...item, href: '/dashboard/system-admin/finance' };
            }

            // Support/Manager: "Unit Command Hub" routes directly to their specific department portal
            if (item.label === 'Unit Command Hub' && !isAdmin) {
                const deptSlug = user?.dept_obj?.slug || (user?.department ? user.department.toLowerCase().replace(/\s+/g, '_') : null);
                if (deptSlug) {
                    return { ...item, href: `/unit-command/${deptSlug}` };
                }
            }
            
            return item;
        });

        if (isAdmin) return items;

        return items.filter(item => {
            const basicItems = ['Dashboard', 'Assets', 'Software', 'Support & Tickets', 'Unit Command Hub'];
            if (basicItems.includes(item.label)) {
                if (item.label === 'Dashboard' && (currentRole?.slug === 'CEO' || currentRole?.slug === 'CFO')) return false;
                // ROOT FIX: Prevent 'Unit Command Hub' and 'Support Queue' redundancy for Managers.
                // Managers should use the dedicated 'Support Queue' dashboard for operational oversight.
                if (item.label === 'Unit Command Hub' && isManagerial) return false;
                return true;
            }

            if (item.label === 'Support Queue' && isManagerial) return true;
            if (item.label === 'Strategic Hub' && isManagerial) return true;
            if (item.label === 'Patch Management' && isITStaff) return true;

            const opsItems = ['RFID Management', 'Barcode Scan', 'Gate Pass'];
            if (opsItems.includes(item.label) && isAssetStaff) return true;

            if (item.label === 'Workflows' && (isITStaff || isFinanceStaff || isProcurementStaff || isManagerial)) return true;
            if (item.label === 'Disposal' && (isAssetStaff || isFinanceStaff || isProcurementStaff || isManagerial)) return true;

            if (['Enterprise', 'Topology', 'Renewals'].includes(item.label) && (isStaff || isManagerial)) return true;
            if (['Analytics', 'Top Performers', 'Ticket Automation', 'SLA Center'].includes(item.label) && (isITStaff || isAssetStaff || isManagerial)) return true;

            return false;
        });
    }, [isAdmin, isITStaff, isAssetStaff, isFinanceStaff, isProcurementStaff, isManagerial, isStaff, currentRole, dashboardPath]);

    return {
        navItems: filteredNavItems,
        dashboardPath
    };
};
