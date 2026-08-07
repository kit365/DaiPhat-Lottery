import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import {
    ADMIN_PREFETCH_ALL_ROUTES,
    ADMIN_PREFETCH_ROUTE_PRIORITY,
} from '../constants/adminPrefetchRoutes';
import { prefetchAdminPagesWhenIdle, prefetchAdminRoute } from '../utils/prefetchAdminPages';

/** Prefetch route + chunk các trang admin sau khi shell load xong. */
export const usePrefetchAdminPagesWhenIdle = (enabled: boolean) => {
    const router = useRouter();

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const prefetchRoute = (path: string) => {
            router.prefetch(path);
        };

        ADMIN_PREFETCH_ROUTE_PRIORITY.slice(0, 8).forEach((path) => {
            prefetchAdminRoute(path, prefetchRoute);
        });

        return prefetchAdminPagesWhenIdle(prefetchRoute);
    }, [enabled, router]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const prefetchRoute = (path: string) => {
            router.prefetch(path);
        };

        const timer = window.setTimeout(() => {
            ADMIN_PREFETCH_ALL_ROUTES.forEach((path) => {
                prefetchAdminRoute(path, prefetchRoute);
            });
        }, 10_000);

        return () => window.clearTimeout(timer);
    }, [enabled, router]);
};
