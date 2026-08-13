import { ROUTES } from '@/admin/constants/routes';

const normalizePath = (path: string): string => {
  const pathname = path.split('?')[0].split('#')[0];
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
};

/** Chỉ bật Next.js Link prefetch cho funnel mua vé — tránh warm hàng loạt route ít dùng. */
export const shouldPrefetchClientNavRoute = (path: string): boolean => {
  const normalized = normalizePath(path);
  return (
    normalized === ROUTES.PUBLIC.TICKETS ||
    normalized === ROUTES.PUBLIC.CART ||
    normalized === ROUTES.PUBLIC.CHECKOUT
  );
};
