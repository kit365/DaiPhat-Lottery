import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ADMIN_PREFETCH_ROUTE_PRIORITY } from '../constants/adminPrefetchRoutes';
import { prefetchAdminRoute } from '../utils/prefetchAdminPages';

/**
 * Prefetch only a few high-traffic admin routes after shell is idle.
 * Hover prefetch on sidebar handles the rest — avoids hundreds of chunk downloads.
 */
export const usePrefetchAdminPagesWhenIdle = (enabled: boolean) => {
    const router = useRouter();

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const prefetchRoute = (path: string) => {
            // In development, skip Next router.prefetch — it triggers concurrent page
            // compiles that race on Windows and corrupt `.next` manifests (ENOENT).
            // Chunk warm-up still happens via prefetchAdminPageChunk.
            if (process.env.NODE_ENV === 'development') {
                return;
            }
            router.prefetch(path);
        };

        let cancelled = false;

        const run = () => {
            if (cancelled) {
                return;
            }
            ADMIN_PREFETCH_ROUTE_PRIORITY.slice(0, 4).forEach((path) => {
                prefetchAdminRoute(path, prefetchRoute, { loadChunk: false });
            });
        };

        if ('requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(run, { timeout: 3000 });
            return () => {
                cancelled = true;
                window.cancelIdleCallback(idleId);
            };
        }

        const timer = setTimeout(run, 2000);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [enabled, router]);
};
