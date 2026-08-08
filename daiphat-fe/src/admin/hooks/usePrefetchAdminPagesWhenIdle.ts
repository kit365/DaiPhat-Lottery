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
            // In development, skip Next router.prefetch — it triggers concurrent page
            // compiles that race on Windows and corrupt `.next` manifests (ENOENT).
            // Chunk warm-up still happens via prefetchAdminPageChunk.
            if (process.env.NODE_ENV === 'development') {
                return;
            }
            router.prefetch(path);
        };

        if (process.env.NODE_ENV !== 'development') {
            ADMIN_PREFETCH_ROUTE_PRIORITY.slice(0, 5).forEach((path) => {
                prefetchAdminRoute(path, prefetchRoute);
            });
        }

        return prefetchAdminPagesWhenIdle(prefetchRoute);
    }, [enabled, router]);
};
