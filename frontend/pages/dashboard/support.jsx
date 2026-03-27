// Route fix: /dashboard/support is a legacy route.
// Redirect transparently to the integrated /tickets/new page.
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SupportRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/tickets/new');
    }, [router]);
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
            <p className="text-app-text-muted text-sm animate-pulse">
                Redirecting to Support Portal…
            </p>
        </div>
    );
}
