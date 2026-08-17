import { ROUTES } from '../constants/routes';
import { prefetchAdminPageChunk } from '../lib/adminPagePrefetchRegistry';

export type PrefetchAdminRouteFn = (path: string) => void;

const prefetchedRoutes = new Set<string>();

// `router.prefetch()` also asks the Turbopack dev server to compile the
// route's RSC payload on demand — same contention problem as chunk warming.
// Skip speculative prefetch in dev for sidebar hover; login warmup opts in.
const isDevRuntime = process.env.NODE_ENV !== 'production';

type WarmAdminDestinationOptions = {
    allowInDev?: boolean;
    loadChunk?: boolean;
};

const warmAdminDestination = (
    path: string,
    prefetchRoute: PrefetchAdminRouteFn,
    options?: WarmAdminDestinationOptions,
): void => {
    const allowInDev = options?.allowInDev ?? false;
    if (isDevRuntime && !allowInDev) {
        return;
    }

    const [pathname] = String(path || '').split('?');
    if (!pathname || prefetchedRoutes.has(pathname)) {
        return;
    }

    prefetchedRoutes.add(pathname);
    prefetchRoute(pathname);

    if (options?.loadChunk !== false) {
        prefetchAdminPageChunk(pathname, { allowInDev });
    }
};

/** Hover sidebar — warm Next route + page chunk (production only). */
export const prefetchAdminRoute = (
    path: string,
    prefetchRoute: PrefetchAdminRouteFn,
    options?: { loadChunk?: boolean },
): void => {
    warmAdminDestination(path, prefetchRoute, options);
};

/** Warm route + JS chunk before navigating (e.g. OAuth callback). */
export const prefetchAdminDestination = (
    path: string,
    prefetchRoute: PrefetchAdminRouteFn,
): void => {
    warmAdminDestination(path, prefetchRoute, { allowInDev: true, loadChunk: true });
};

const ADMIN_LOGIN_DESTINATIONS = [
    ROUTES.ADMIN.DASHBOARD.ECOMMERCE,
    ROUTES.ADMIN.AUTH.SETUP_PROFILE,
] as const;

/** Gọi ngay khi vào trang đăng nhập — warm dashboard trước khi user submit form. */
export const prefetchAdminLoginDestinations = (prefetchRoute: PrefetchAdminRouteFn): void => {
    ADMIN_LOGIN_DESTINATIONS.forEach((path) => {
        warmAdminDestination(path, prefetchRoute, { allowInDev: true, loadChunk: true });
    });
};
