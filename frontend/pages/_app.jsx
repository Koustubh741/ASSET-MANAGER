import '@/styles/globals.css'
import Layout from '@/components/Layout'
import { RoleProvider } from '@/contexts/RoleContext'
import { AssetProvider } from '@/contexts/AssetContext'
import AuthGuard from '@/components/AuthGuard'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
    const router = useRouter();
    const isLoginPage = router.pathname === '/login';

    // Route Persistence: Save current route and restore on fresh load if needed

    useEffect(() => {
        // Save current route on change
        const handleRouteChange = (url) => {
            if (url !== '/login' && url !== '/') {
                localStorage.setItem('lastRoute', url);
            }
        };

        router.events.on('routeChangeComplete', handleRouteChange);

        // Initial check: if we are at root /, try to go to last known route
        if (router.pathname !== '/login') {
            const lastRoute = localStorage.getItem('lastRoute');
            // Only redirect if we are strictly at root or explicit startup, 
            // BUT browser reload usually keeps the path.
            // If user opens generic url, send them to last place.
            if (router.pathname === '/' && lastRoute) {
                router.replace(lastRoute);
            }
        }

        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router]);

    return (
        <RoleProvider>
            <AssetProvider>
                <AuthGuard>
                    {isLoginPage ? (
                        <Component {...pageProps} />
                    ) : (
                        <Layout>
                            <Component {...pageProps} />
                        </Layout>
                    )}
                </AuthGuard>
            </AssetProvider>
        </RoleProvider>
    )
}
