import { usePublicSystemConfigValues } from './usePublicSystemConfigValues';

/** Branding + contact công khai (header / footer / auth). Chỉ giữ key thực sự dùng. */
export const SITE_PUBLIC_KEYS = [
    'SITE_NAME',
    'SITE_SLOGAN',
    'SITE_INTRO',
    'SITE_LOGO_URL',
    'SITE_FAVICON_URL',
    'SITE_PHONE',
    'SITE_EMAIL',
    'SITE_ADDRESS',
    'SITE_SUPPORT_OPEN_TIME',
    'SITE_SUPPORT_CLOSE_TIME',
    'SITE_FACEBOOK_URL',
    'SITE_TELEGRAM_URL',
    'SITE_COPYRIGHT',
] as const;

export type SitePublicKey = (typeof SITE_PUBLIC_KEYS)[number];

export const SITE_PUBLIC_DEFAULTS: Record<SitePublicKey, string> = {
    SITE_NAME: 'ĐẠI PHÁT',
    SITE_SLOGAN: 'TÀI LỘC - MAY MẮN - THỊNH VƯỢNG',
    SITE_INTRO:
        'Đại Phát - Hệ thống xổ số kiến thiết uy tín hàng đầu Việt Nam. Nhanh chóng, minh bạch, bảo mật và luôn đồng hành cùng bạn trên hành trình may mắn.',
    /** Không fallback ảnh cứng — chỉ hiện logo khi admin đã cấu hình SITE_LOGO_URL. */
    SITE_LOGO_URL: '',
    SITE_FAVICON_URL: '',
    SITE_PHONE: '',
    SITE_EMAIL: '',
    SITE_ADDRESS: '',
    SITE_SUPPORT_OPEN_TIME: '',
    SITE_SUPPORT_CLOSE_TIME: '',
    SITE_FACEBOOK_URL: '',
    SITE_TELEGRAM_URL: '',
    SITE_COPYRIGHT: '',
};

/** @deprecated dùng SITE_PUBLIC_DEFAULTS */
export const SITE_BRANDING_DEFAULTS = {
    SITE_NAME: SITE_PUBLIC_DEFAULTS.SITE_NAME,
    SITE_LOGO_URL: SITE_PUBLIC_DEFAULTS.SITE_LOGO_URL,
    SITE_FAVICON_URL: SITE_PUBLIC_DEFAULTS.SITE_FAVICON_URL,
};

export type SiteBranding = {
    name: string;
    slogan: string;
    intro: string;
    logoUrl: string;
    faviconUrl: string;
    phone: string;
    email: string;
    address: string;
    supportOpenTime: string;
    supportCloseTime: string;
    facebookUrl: string;
    telegramUrl: string;
    copyright: string;
};

export const useSiteBranding = (): SiteBranding => {
    const values = usePublicSystemConfigValues(SITE_PUBLIC_KEYS, SITE_PUBLIC_DEFAULTS);
    const persistableUrl = (url: string) => {
        const trimmed = (url ?? '').trim();
        if (!trimmed || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return '';
        return trimmed;
    };
    return {
        name: values.SITE_NAME,
        slogan: values.SITE_SLOGAN,
        intro: values.SITE_INTRO,
        logoUrl: persistableUrl(values.SITE_LOGO_URL),
        faviconUrl: persistableUrl(values.SITE_FAVICON_URL),
        phone: values.SITE_PHONE,
        email: values.SITE_EMAIL,
        address: values.SITE_ADDRESS,
        supportOpenTime: values.SITE_SUPPORT_OPEN_TIME,
        supportCloseTime: values.SITE_SUPPORT_CLOSE_TIME,
        facebookUrl: values.SITE_FACEBOOK_URL,
        telegramUrl: values.SITE_TELEGRAM_URL,
        copyright: values.SITE_COPYRIGHT,
    };
};
