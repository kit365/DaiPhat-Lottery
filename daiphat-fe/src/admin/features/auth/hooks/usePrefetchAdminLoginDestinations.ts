import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { prefetchAdminLoginDestinations } from '@/admin/utils/prefetchAdminPages';

/** Warm dashboard + setup-profile khi trang login mount (idle, không chặn UI). */
export const usePrefetchAdminLoginDestinations = () => {
    const router = useRouter();

    useEffect(() => {
        const startWarmup = () => {
            prefetchAdminLoginDestinations(router.prefetch);
        };

        if (typeof window.requestIdleCallback === 'function') {
            const handle = window.requestIdleCallback(startWarmup, { timeout: 1200 });
            return () => window.cancelIdleCallback(handle);
        }

        const timeout = window.setTimeout(startWarmup, 300);
        return () => window.clearTimeout(timeout);
    }, [router]);
};
