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
        isAdmin, 
        isITStaff, 
        isAssetStaff, 
        isFinanceStaff, 
        isProcurementStaff, 
        isManagerial, 
        isStaff 
    } = useRole();

    const dashboardPath = useMemo(() => 
        ROLE_DASHBOARD_MAP[currentRole?.slug] || '/dashboard/end-user'
    , [currentRole]);

    const filteredNavItems = useMemo(() => {
        const items = ALL_NAV_ITEMS.map(item => {
            // Special mapping for Dashboard label
            if (item.label === 'Dashboard') return { ...item, href: dashboardPath };
            
            // System Admin: "Procurement" and "Finance" go to specialized read-only paths
            if (isAdmin) {
                if (item.label === 'Procurement') return { ...item, href: '/dashboard/system-admin/procurement' };
                if (item.label === 'Finance') return { ...item, href: '/dashboard/system-admin/finance' };
            }
            return item;
        });

        if (isAdmin) return items;

        return items.filter(item => {
            const basicItems = ['Dashboard', 'Assets', 'Software', 'Support & Tickets'];
            if (basicItems.includes(item.label)) {
                if (item.label === 'Dashboard' && (currentRole?.slug === 'CEO' || currentRole?.slug === 'CFO')) return false;
                return true;
            }

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
