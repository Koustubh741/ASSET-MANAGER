import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useRole } from '@/contexts/RoleContext';
import apiClient from '@/lib/apiClient';

const ROLE_DASHBOARD_MAP = {
    'ADMIN': '/dashboard/system-admin',
    'ASSET_MANAGER': '/dashboard/asset-inventory-manager',
    'PROCUREMENT': '/procurement',
    'FINANCE': '/finance',
    'IT_MANAGEMENT': '/executive-dashboard',
    'CEO': '/executive-dashboard',
    'CFO': '/executive-dashboard',
    'END_USER': '/dashboard/end-user',
    'MANAGER': '/dashboard/end-user',
    'IT_SUPPORT': '/executive-dashboard'
};

export default function AuthGuard({ children }) {
    const { isAuthenticated, currentRole, isAdmin, isFinanceStaff, isProcurementStaff, isLoading } = useRole();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [setupStatusLoaded, setSetupStatusLoaded] = useState(false);
    const [setupCompleted, setSetupCompleted] = useState(true);
    const isNavigating = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || !currentRole) return;
        if (!isAdmin) {
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
            if (isNavigating.current) return;

            const currentPath = router.asPath.split('?')[0];
            const isLoginPage = currentPath === '/login';
            const isSetupPage = currentPath === '/setup';

            console.log("AuthGuard: [CHECKING]", {
                isAuthenticated,
                role: currentRole?.slug,
                path: currentPath,
                isReady: router.isReady,
                setupStatusLoaded,
                setupCompleted,
            });

            if (!isAuthenticated) {
                if (!isLoginPage && !isSetupPage) {
                    console.warn("AuthGuard: [UNAUTHORIZED] No session found. Redirecting to login.");
                    isNavigating.current = true;
                    router.push('/login').finally(() => { isNavigating.current = false; });
                } else {
                    console.log("AuthGuard: [ALLOWED] At login/setup page, unauthorized is fine.");
                    setAuthorized(true);
                }
                return;
            }


            const targetPath = ROLE_DASHBOARD_MAP[currentRole.slug] || '/dashboard/end-user';

            // Special case: if we are already at the target path, we are authorized.
            if (currentPath === targetPath) {
                setAuthorized(true);
                return;
            }

            if (isSetupPage) {
                if (!isAdmin) {
                    isNavigating.current = true;
                    router.push(targetPath).finally(() => { isNavigating.current = false; });
                    return;
                }
                if (setupStatusLoaded && setupCompleted) {
                    isNavigating.current = true;
                    router.push(targetPath).finally(() => { isNavigating.current = false; });
                    return;
                }
                setAuthorized(true);
                return;
            }

            if (currentPath === '/') {
                if (isAdmin && setupStatusLoaded && !setupCompleted) {
                    isNavigating.current = true;
                    router.push('/setup').finally(() => { isNavigating.current = false; });
                    return;
                }
                isNavigating.current = true;
                router.push(targetPath).finally(() => { isNavigating.current = false; });
                return;
            }

            // Only System Admin / Admin may access system-admin dashboard; others redirect to their portal
            const isSystemAdminPath = currentPath === '/dashboard/system-admin' || currentPath.startsWith('/dashboard/system-admin/');
            const isFinancePath = currentPath === '/finance' || currentPath.startsWith('/finance/');
            const isProcurementPath = currentPath === '/procurement' || currentPath.startsWith('/procurement/');

            if (isSystemAdminPath && !isAdmin) {
                isNavigating.current = true;
                if (currentPath !== targetPath) {
                    router.replace(targetPath).finally(() => { isNavigating.current = false; });
                } else {
                    isNavigating.current = false;
                    setAuthorized(true);
                }
                return;
            }

            if (isFinancePath && !isFinanceStaff) {
                console.warn(`AuthGuard: [UNAUTHORIZED] ${currentRole.slug} attempted to access Finance portal. Redirecting.`);
                isNavigating.current = true;
                if (currentPath !== targetPath) {
                    router.replace(targetPath).finally(() => { isNavigating.current = false; });
                } else {
                    isNavigating.current = false;
                    setAuthorized(true);
                }
                return;
            }

            if (isProcurementPath && !isProcurementStaff) {
                console.warn(`AuthGuard: [UNAUTHORIZED] ${currentRole.slug} attempted to access Procurement portal. Redirecting.`);
                isNavigating.current = true;
                if (currentPath !== targetPath) {
                    router.replace(targetPath).finally(() => { isNavigating.current = false; });
                } else {
                    isNavigating.current = false;
                    setAuthorized(true);
                }
                return;
            }

            setAuthorized(true);
        };

        if (router.isReady) {
            if (isAuthenticated && isAdmin && !setupStatusLoaded) {
                return;
            }
            checkAuth();
        }

    }, [isAuthenticated, currentRole, router.asPath, router.isReady, isLoading, setupStatusLoaded, setupCompleted]);

    const needsSetupCheck = isAuthenticated && isAdmin && !setupStatusLoaded;
    const showLoading = isLoading || needsSetupCheck || (!authorized && router.pathname !== '/login' && router.pathname !== '/setup' && router.asPath !== '/setup');

    if (showLoading) {
        return <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-app-text-muted text-sm">Loading Identity...</div>;
    }

    return children;
}
