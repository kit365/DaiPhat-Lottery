import { STATIC_PAGES } from './staticPages';

/**
 * Nhãn tab theo pathname client (khớp dài nhất trước).
 * Title cuối: "{nhãn} | {SITE_NAME}"
 */
export const CLIENT_ROUTE_TITLES: ReadonlyArray<{
    /** Exact path hoặc prefix (prefix kết thúc bằng / sẽ match children). */
    path: string;
    title: string;
    /** Chỉ khớp đúng path, không áp dụng cho children. */
    exact?: boolean;
}> = [
    { path: '/', title: 'Trang chủ', exact: true },
    { path: '/buy-ticket', title: 'Mua vé số' },
    { path: '/cart', title: 'Giỏ hàng' },
    { path: '/checkout/result', title: 'Kết quả thanh toán' },
    { path: '/checkout', title: 'Thanh toán' },
    { path: '/lich-mo-thuong', title: 'Lịch mở thưởng' },
    { path: '/gieo-que', title: 'Gieo quẻ' },
    { path: '/blogs/detail', title: 'Chi tiết bài viết' },
    { path: '/blogs', title: 'Bài viết' },
    { path: '/results', title: 'Kết quả xổ số' },
    { path: '/ticket-search', title: 'Tra cứu vé' },
    { path: '/login', title: 'Đăng nhập' },
    { path: '/register', title: 'Đăng ký' },
    { path: '/forgot-password', title: 'Quên mật khẩu' },
    { path: '/setup-profile', title: 'Thiết lập hồ sơ' },
    { path: '/profile/tickets', title: 'Vé của tôi' },
    { path: '/profile/orders', title: 'Đơn hàng' },
    { path: '/profile', title: 'Tài khoản' },
    { path: '/payment/payos/return', title: 'Thanh toán thành công' },
    { path: '/payment/payos/cancel', title: 'Hủy thanh toán' },
    ...Object.entries(STATIC_PAGES).map(([slug, page]) => ({
        path: `/pages/${slug}`,
        title: page.title,
    })),
];

export const resolveClientRouteTitle = (pathname: string): string => {
    const normalized = (pathname.replace(/\/+$/, '') || '/') as string;

    let best: { path: string; title: string } | null = null;

    for (const entry of CLIENT_ROUTE_TITLES) {
        const base = entry.path.replace(/\/+$/, '') || '/';

        if (entry.exact) {
            if (normalized === base) {
                return entry.title;
            }
            continue;
        }

        const matches =
            normalized === base || normalized.startsWith(`${base}/`);

        if (!matches) continue;

        if (!best || base.length > best.path.length) {
            best = { path: base, title: entry.title };
        }
    }

    return best?.title ?? '';
};

/** Home: "ĐẠI PHÁT | TÀI LỘC - …"; trang khác: "Mua vé số | ĐẠI PHÁT" */
export const buildRouteDocumentTitle = (
    pathname: string,
    siteName: string,
    slogan?: string
): string => {
    const brand = siteName.trim() || 'ĐẠI PHÁT';
    const normalized = pathname.replace(/\/+$/, '') || '/';

    if (normalized === '/') {
        const tag = slogan?.trim();
        if (tag && tag.toLowerCase() !== brand.toLowerCase()) {
            return `${brand} | ${tag}`;
        }
        return brand;
    }

    const page = resolveClientRouteTitle(pathname);
    if (!page) return brand;
    return `${page} | ${brand}`;
};
