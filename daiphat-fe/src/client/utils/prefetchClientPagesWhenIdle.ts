import {
  CLIENT_PREFETCH_ROUTE_PRIORITY,
  CLIENT_SHARED_PREFETCH_BANNERS,
  getClientBannerUrlsForPath,
} from '../constants/clientBannerAssets';
import {
  prefetchImagesParallel,
  shouldSkipClientPrefetch,
  waitForPrefetchIdle,
} from './prefetchImagesWhenIdle';

export type PrefetchRouteFn = (path: string) => void;

type PrefetchClientPagesOptions = {
  delay?: number;
  /** Sau khi warm route funnel — prefetch React Query data (catalog vé, v.v.). */
  onRoutesWarmed?: () => void | Promise<void>;
};

const prefetchRouteBundle = async (
  path: string,
  prefetchRoute: PrefetchRouteFn,
): Promise<void> => {
  const banners = getClientBannerUrlsForPath(path);

  prefetchRoute(path);

  if (banners.length > 0) {
    await prefetchImagesParallel(banners);
  }
};

/** Warm route JS + banner tĩnh (cart → checkout, hover menu, v.v.). */
export const warmClientRoute = (
  path: string,
  prefetchRoute: PrefetchRouteFn,
): void => {
  if (shouldSkipClientPrefetch()) {
    return;
  }

  void prefetchRouteBundle(path, prefetchRoute);
};

/**
 * Sau khi Home load xong: prefetch funnel mua vé (/tickets → /cart).
 * Mỗi route: tải song song route JS + banner của trang đó.
 */
export const prefetchClientPagesWhenIdle = (
  prefetchRoute: PrefetchRouteFn,
  options?: PrefetchClientPagesOptions,
): (() => void) => {
  if (shouldSkipClientPrefetch()) {
    return () => {};
  }

  const delay = options?.delay ?? 800;
  let cancelled = false;
  let startHandle: ReturnType<typeof setTimeout> | null = null;

  const run = async () => {
    const [firstRoute, ...remainingRoutes] = CLIENT_PREFETCH_ROUTE_PRIORITY;

    // Ưu tiên /tickets ngay — prefetch JS route không chờ idle (tránh click sớm vẫn thấy load lâu).
    if (firstRoute) {
      prefetchRoute(firstRoute);
      await prefetchImagesParallel(getClientBannerUrlsForPath(firstRoute));
    }

    for (const path of remainingRoutes) {
      if (cancelled) {
        return;
      }

      await waitForPrefetchIdle();
      if (cancelled) {
        return;
      }

      await prefetchRouteBundle(path, prefetchRoute);
    }

    if (cancelled) {
      return;
    }

    await waitForPrefetchIdle();
    if (!cancelled) {
      await prefetchImagesParallel(CLIENT_SHARED_PREFETCH_BANNERS);
    }

    if (!cancelled && options?.onRoutesWarmed) {
      await options.onRoutesWarmed();
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
