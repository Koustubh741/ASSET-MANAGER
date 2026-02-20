import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useRole } from '@/contexts/RoleContext';
import apiClient from '@/lib/apiClient';

const ROLE_DASHBOARD_MAP = {
    'System Admin': '/dashboard/system-admin',
    'Asset & Inventory Manager': '/dashboard/asset-inventory-manager',
    'Procurement Manager': '/procurement',
    'Finance': '/finance',
    'IT Management': '/dashboard/it-management',
    'End User': '/dashboard/end-user'
};

export default function AuthGuard({ children }) {
    const { isAuthenticated, currentRole, ROLES, isLoading } = useRole();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [setupStatusLoaded, setSetupStatusLoaded] = useState(false);
    const [setupCompleted, setSetupCompleted] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !currentRole) return;
        const isSystemAdmin = currentRole.label === 'System Admin';
        if (!isSystemAdmin) {
            setSetupStatusLoaded(true);
            setSetupCompleted(true);
            return;
        }
        let cancelled = false;
        apiClient.getSetupStatus()
            .then((res) => {
                if (!cancelled) {
                    setSetupCompleted(res.setup_completed === true);
                    setSetupStatusLoaded(true);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSetupCompleted(true);
                    setSetupStatusLoaded(true);
                }
            });
        return () => { cancelled = true; };
    }, [isAuthenticated, currentRole]);

    useEffect(() => {
        if (isLoading) {
            console.log("AuthGuard: [WAITING] Context is still loading...");
            return;
        }

        const checkAuth = async () => {
            const currentPath = router.asPath.split('?')[0];
            const isLoginPage = currentPath === '/login';
            const isSetupPage = currentPath === '/setup';

            console.log("AuthGuard: [CHECKING]", {
                isAuthenticated,
                role: currentRole?.label,
                path: currentPath,
                isReady: router.isReady,
                setupStatusLoaded,
                setupCompleted,
            });

            if (!isAuthenticated) {
                if (!isLoginPage) {
                    console.warn("AuthGuard: [UNAUTHORIZED] No session found. Redirecting to login.");
                    router.push('/login');
                } else {
                    console.log("AuthGuard: [ALLOWED] At login page, unauthorized is fine.");
                    setAuthorized(true);
                }
                return;
            }

            if (!currentRole) {
                console.warn("AuthGuard: [INCOMPLETE] Authenticated but no role. This shouldn't happen.");
                setAuthorized(true);
                return;
            }

            const isSystemAdmin = currentRole.label === 'System Admin';
            const targetPath = ROLE_DASHBOARD_MAP[currentRole.label] || '/dashboard/end-user';

            if (isSetupPage) {
                if (!isSystemAdmin) {
                    router.push(targetPath);
                    return;
                }
                if (setupStatusLoaded && setupCompleted) {
                    router.push(targetPath);
                    return;
                }
                setAuthorized(true);
                return;
            }

            if (currentPath === '/') {
                if (isSystemAdmin && setupStatusLoaded && !setupCompleted) {
                    router.push('/setup');
                    return;
                }
                router.push(targetPath);
                return;
            }

            // Only System Admin / Admin may access system-admin dashboard; others redirect to their portal
            const isSystemAdminPath = currentPath === '/dashboard/system-admin' || currentPath.startsWith('/dashboard/system-admin/');
            const isAdminRole = (currentRole.slug === 'ADMIN' || currentRole.slug === 'SYSTEM_ADMIN');
            if (isSystemAdminPath && !isAdminRole) {
                router.replace(targetPath);
                return;
            }

            setAuthorized(true);
        };

        if (router.isReady) {
            if (isAuthenticated && currentRole?.label === 'System Admin' && !setupStatusLoaded) {
                return;
            }
            checkAuth();
        }

    }, [isAuthenticated, currentRole, router.asPath, router.isReady, isLoading, setupStatusLoaded, setupCompleted]);

    const needsSetupCheck = isAuthenticated && currentRole?.label === 'System Admin' && !setupStatusLoaded;
    const showLoading = isLoading || needsSetupCheck || (!authorized && router.pathname !== '/login' && router.pathname !== '/setup');

    if (showLoading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">Loading Identity...</div>;
    }

    return children;
}
