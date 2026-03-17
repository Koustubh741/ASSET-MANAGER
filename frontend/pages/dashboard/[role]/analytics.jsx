import SystemAdminAnalytics from '@/components/dashboards/SystemAdminAnalytics'
import { useRole } from '@/contexts/RoleContext'
import { AlertCircle } from 'lucide-react'

/**
 * Dedicated Analytics page for System Admin.
 * URL: /dashboard/system-admin/analytics
 */
export default function SystemAdminAnalyticsPage() {
    const { currentRole } = useRole();
    const isAdmin = currentRole?.slug === 'ADMIN' || currentRole?.slug === 'SYSTEM_ADMIN';

    if (!isAdmin) {
        return (
            <div className="flex h-[60vh] items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <div className="p-3 bg-rose-500/10 rounded-full w-fit mx-auto border border-rose-500/20">
                        <AlertCircle className="text-rose-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Permission Denied</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                        You do not have administrative privileges to view system-wide analytics and financial metrics.
                    </p>
                </div>
            </div>
        );
    }

    return <SystemAdminAnalytics />
}
