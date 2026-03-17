import SystemAdminDashboard from '@/components/dashboards/SystemAdminDashboard'

/**
 * Dedicated Requests page for System Admin.
 * URL: /dashboard/system-admin/requests
 */
export default function SystemAdminRequestsPage() {
    return <SystemAdminDashboard forceView="Requests" />
}
