import { ADMIN_PREFETCH_ROUTE_PRIORITY } from '../constants/adminPrefetchRoutes';
import { prefetchAdminPageChunk } from '../lib/adminPagePrefetchRegistry';
import {
  shouldSkipClientPrefetch,
  waitForPrefetchIdle,
} from '@/client/utils/prefetchImagesWhenIdle';

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

/**
 * Sau khi admin shell sẵn sàng: prefetch route Next.js + JS chunk của từng trang ưu tiên.
 */
export const prefetchAdminPagesWhenIdle = (
  prefetchRoute: PrefetchAdminRouteFn,
  delay = 300,
): (() => void) => {
  if (shouldSkipClientPrefetch()) {
    return () => {};
  }

  let cancelled = false;
  let startHandle: ReturnType<typeof setTimeout> | null = null;

  const run = async () => {
    const [firstRoute, secondRoute, thirdRoute, ...remainingRoutes] = ADMIN_PREFETCH_ROUTE_PRIORITY;

    for (const path of [firstRoute, secondRoute, thirdRoute].filter(Boolean)) {
      if (cancelled) return;
      prefetchAdminRoute(path, prefetchRoute);
    }

    for (const path of remainingRoutes) {
      if (cancelled) {
        return;
      }

      await waitForPrefetchIdle();
      if (cancelled) {
        return;
      }

      prefetchAdminRoute(path, prefetchRoute);
    }
  };

  startHandle = setTimeout(() => {
    startHandle = null;
    void run();
  }, delay);

  return () => {
    cancelled = true;

    if (startHandle) {
      clearTimeout(startHandle);
      startHandle = null;
    }
  };
};
