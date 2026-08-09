import {
    ADMIN_PREFETCH_ALL_ROUTES,
    ADMIN_PREFETCH_ROUTE_PRIORITY,
} from '../constants/adminPrefetchRoutes';
import { prefetchAdminPageChunk } from '../lib/adminPagePrefetchRegistry';
import { shouldSkipClientPrefetch } from '@/client/utils/prefetchImagesWhenIdle';

export type PrefetchAdminRouteFn = (path: string) => void;

const prefetchedRoutes = new Set<string>();

export const prefetchAdminRoute = (
    path: string,
    prefetchRoute: PrefetchAdminRouteFn,
): void => {
    const [pathname] = String(path || '').split('?');
    if (!pathname || prefetchedRoutes.has(pathname)) {
        return;
    }

    prefetchedRoutes.add(pathname);
    prefetchRoute(pathname);
    prefetchAdminPageChunk(pathname);
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const prefetchRoutesInBatches = async (
    routes: readonly string[],
    prefetchRoute: PrefetchAdminRouteFn,
    batchSize: number,
    batchDelayMs: number,
    isCancelled: () => boolean,
) => {
    for (let index = 0; index < routes.length; index += batchSize) {
        if (isCancelled()) {
            return;
        }

        const batch = routes.slice(index, index + batchSize);
        batch.forEach((path) => prefetchAdminRoute(path, prefetchRoute));

        if (index + batchSize < routes.length) {
            await delay(batchDelayMs);
        }
    }
};

/**
 * Sau khi admin shell sẵn sàng:
 * - Prefetch ngay các route ưu tiên
 * - Sau đó prefetch toàn bộ route sidebar theo batch (không chờ idle từng route)
 */
export const prefetchAdminPagesWhenIdle = (
    prefetchRoute: PrefetchAdminRouteFn,
    delayMs = 200,
): (() => void) => {
    if (shouldSkipClientPrefetch()) {
        return () => {};
    }

    let cancelled = false;
    let startHandle: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
        const prioritySet = new Set<string>(ADMIN_PREFETCH_ROUTE_PRIORITY);
        const remainingRoutes = ADMIN_PREFETCH_ALL_ROUTES.filter((path) => !prioritySet.has(path));

        await prefetchRoutesInBatches(
            ADMIN_PREFETCH_ROUTE_PRIORITY,
            prefetchRoute,
            ADMIN_PREFETCH_ROUTE_PRIORITY.length,
            0,
            () => cancelled,
        );

        await prefetchRoutesInBatches(
            remainingRoutes,
            prefetchRoute,
            4,
            120,
            () => cancelled,
        );
    };

    startHandle = setTimeout(() => {
        startHandle = null;
        void run();
    }, delayMs);

    return () => {
        cancelled = true;

        if (startHandle) {
            clearTimeout(startHandle);
            startHandle = null;
        }
    };
};
