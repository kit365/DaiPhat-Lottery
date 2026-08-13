/** Nền chung nhiều trang client (đã load trên Home — không preload lại). */
import { ROUTES } from '@/admin/constants/routes';

export const CLIENT_PAGE_BACKGROUND =
  'https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png';

/** Logo header (ảnh vuông có nền). */
export const CLIENT_LOGO =
  'https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg';

/** Favicon / apple-touch — PNG nền trong, dùng riêng cho metadata icons. */
export const CLIENT_FAVICON =
  'https://i.ibb.co/YBYnq3HR/z7824247008533-94446d3b6c16598cda67404d805c15c4-removebg-preview.png';

export const HOME_SIDEBAR_CTA_BANNER =
  'https://i.ibb.co/FbsnQfjR/28d77182-45b0-40bf-9aaf-58136bc87741.png';

export const BUY_TICKET_BANNERS = [
  'https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png',
  'https://i.ibb.co/LXLSg1qx/07bf0bdd-3932-4bbd-8df4-c08e72c52800.png',
  'https://i.ibb.co/tpJtrscQ/d0ea187b-cfe0-4a28-9366-c10db2e6a96c.png',
] as const;

export const CART_PROMO_BANNERS = [
  'https://i.ibb.co/XxyrJVWS/7a8a0e84-06df-4227-83ee-c04c1551e3be.png',
  'https://i.ibb.co/60GvfsXg/dd112c65-2f34-421f-a417-b2ea7867d9ff.png',
] as const;

export const BLOG_SIDEBAR_BANNER =
  'https://i.ibb.co/q3rWD00G/75b31416-13ed-49ce-8708-b4861fc96198.png';

export const BLOG_HERO_DEFAULT =
  'https://cdn.phototourl.com/free/2026-06-04-d2a5e8c8-8df8-4e9c-9e68-ec6b633e5fc1.png';

export const PROFILE_BANNERS = [
  'https://i.ibb.co/nsNc8F41/Screenshot-2026-05-30-141824.png',
  'https://i.ibb.co/DP5YBHxY/Screenshot-2026-05-30-142428.png',
  'https://i.ibb.co/hxtX5R85/5193a4bb-ce0a-469c-9345-0f9c814a8dab.png',
  'https://i.ibb.co/M5RCKKDn/d2ee3500-96d8-4e2f-a713-d74b7e35e64c.png',
] as const;

export const FOOTER_BACKGROUND =
  'https://cdn.phototourl.com/free/2026-06-07-98422aba-75e7-49a6-ab69-6ed30ab67386.png';

export const VERIFY_MODAL_BACKGROUND =
  'https://cdn.phototourl.com/free/2026-06-07-f0a1017f-11b8-4d6a-9e4c-f61136689c53.png';

export const PROVINCE_ICON_FALLBACK =
  'https://i.ibb.co/XrKTHt8g/t-i-xu-ng.png';

/** Vé mặc định khi API không trả ảnh — dùng chung với banner mua vé #1. */
export const TICKET_IMAGE_FALLBACK = BUY_TICKET_BANNERS[0];

/**
 * Funnel mua vé — chỉ warm route có xác suất click cao từ Home.
 * Các trang khác (blog, fortune, profile…) dùng hover banner hoặc Link mặc định.
 */
export const CLIENT_PREFETCH_ROUTE_PRIORITY: readonly string[] = [
  ROUTES.PUBLIC.TICKETS,
  ROUTES.PUBLIC.CART,
];

/** Banner nhẹ sau funnel — tránh tải footer/modal nặng khi user chưa cần. */
export const CLIENT_SHARED_PREFETCH_BANNERS: readonly string[] = [
  PROVINCE_ICON_FALLBACK,
];

const normalizeClientPath = (path: string): string => {
  const pathname = path.split('?')[0].split('#')[0];
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
};

/** Banner tĩnh theo route — dùng cho hover/focus prefetch trên menu. */
export const getClientBannerUrlsForPath = (path: string): readonly string[] => {
  const normalized = normalizeClientPath(path);

  if (normalized === '/') {
    return [];
  }

  if (normalized.startsWith(ROUTES.PUBLIC.TICKETS)) {
    return BUY_TICKET_BANNERS;
  }

  if (normalized.startsWith(ROUTES.PUBLIC.CART) || normalized.startsWith(ROUTES.PUBLIC.CHECKOUT)) {
    return [CLIENT_PAGE_BACKGROUND, ...CART_PROMO_BANNERS, TICKET_IMAGE_FALLBACK, PROVINCE_ICON_FALLBACK];
  }

  if (normalized.startsWith(ROUTES.PUBLIC.BLOGS)) {
    return [BLOG_SIDEBAR_BANNER, BLOG_HERO_DEFAULT];
  }

  if (normalized.startsWith(ROUTES.PUBLIC.PROFILE.ROOT)) {
    return PROFILE_BANNERS;
  }

  if (normalized.startsWith(ROUTES.PUBLIC.FORTUNE) || normalized.startsWith(ROUTES.PUBLIC.SCHEDULE)) {
    return [CLIENT_PAGE_BACKGROUND];
  }

  return [];
};
