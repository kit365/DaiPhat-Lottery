import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ADMIN_PREFETCH_ROUTE_PRIORITY } from '../constants/adminPrefetchRoutes';
import { prefetchAdminPagesWhenIdle, prefetchAdminRoute } from '../utils/prefetchAdminPages';
/** Prefetch route + chunk các trang admin hay dùng sau khi shell load xong. */
export const usePrefetchAdminPagesWhenIdle = (enabled: boolean) => {
  const router = useRouter();

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const prefetchRoute = (path: string) => {
            router.prefetch(path);
        };

        ADMIN_PREFETCH_ROUTE_PRIORITY.slice(0, 5).forEach((path) => {
            prefetchAdminRoute(path, prefetchRoute);
        });

        return prefetchAdminPagesWhenIdle(prefetchRoute);
    }, [enabled, router]);
};
