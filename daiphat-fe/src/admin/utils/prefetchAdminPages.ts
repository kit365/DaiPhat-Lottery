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
 * In development, serialize prefetches with longer gaps — concurrent `router.prefetch`
 * on Windows + Turbopack/webpack races and corrupts `.next` build manifests (ENOENT).
 */
export const prefetchAdminPagesWhenIdle = (
  prefetchRoute: PrefetchAdminRouteFn,
  delay = process.env.NODE_ENV === 'development' ? 1500 : 300,
): (() => void) => {
  if (shouldSkipClientPrefetch()) {
    return () => {};
  }

  let cancelled = false;
  let startHandle: ReturnType<typeof setTimeout> | null = null;

  const run = async () => {
    const routes = [...ADMIN_PREFETCH_ROUTE_PRIORITY];
    const isDev = process.env.NODE_ENV === 'development';
    // Dev: only warm the top few routes, one at a time.
    const queue = isDev ? routes.slice(0, 4) : routes;

    for (let i = 0; i < queue.length; i += 1) {
      if (cancelled) return;
      prefetchAdminRoute(queue[i], prefetchRoute);
      if (i < queue.length - 1) {
        if (isDev) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        } else {
          await waitForPrefetchIdle();
        }
      }
      if (cancelled) return;
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
