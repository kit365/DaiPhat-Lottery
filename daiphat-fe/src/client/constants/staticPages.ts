/**
 * Các trang tĩnh dưới /pages/{slug}.
 * Slug có `configKey` lấy nội dung từ system_config (STATIC_PAGE);
 * slug không có thì hiện trạng thái "đang cập nhật" thay vì 404.
 */
export type StaticPageConfigKey =
    | 'PAGE_ABOUT'
    | 'PAGE_FAQ'
    | 'PAGE_PRIVACY'
    | 'PAGE_TERMS'
    | 'PAGE_SHIPPING'
    | 'PAGE_RETURNS'
    | 'PAGE_CONTACT'
    | 'PAGE_CAREERS'
    | 'PAGE_GUIDE_PLAY'
    | 'PAGE_GUIDE_BUY'
    | 'PAGE_GUIDE_PAYMENT'
    | 'PAGE_GUIDE_PRIZE';

export type StaticPageDefinition = {
    title: string;
    description?: string;
    configKey?: StaticPageConfigKey;
};

export const STATIC_PAGES: Record<string, StaticPageDefinition> = {
    about: {
        title: 'Giới thiệu',
        description: 'Câu chuyện và sứ mệnh của chúng tôi.',
        configKey: 'PAGE_ABOUT',
    },
    faq: {
        title: 'Câu hỏi thường gặp',
        description: 'Giải đáp nhanh những thắc mắc phổ biến.',
        configKey: 'PAGE_FAQ',
    },
    terms: {
        title: 'Điều khoản sử dụng',
        description: 'Quy định khi sử dụng dịch vụ.',
        configKey: 'PAGE_TERMS',
    },
    privacy: {
        title: 'Chính sách bảo mật',
        description: 'Cách chúng tôi thu thập và bảo vệ dữ liệu của bạn.',
        configKey: 'PAGE_PRIVACY',
    },
    shipping: {
        title: 'Chính sách vận chuyển',
        description: 'Thông tin giao nhận vé.',
        configKey: 'PAGE_SHIPPING',
    },
    returns: {
        title: 'Chính sách đổi trả',
        description: 'Điều kiện đổi trả và hoàn tiền.',
        configKey: 'PAGE_RETURNS',
    },
    contact: {
        title: 'Liên hệ',
        description: 'Kết nối với đội ngũ hỗ trợ.',
        configKey: 'PAGE_CONTACT',
    },
    careers: {
        title: 'Tuyển dụng',
        description: 'Cơ hội nghề nghiệp tại chúng tôi.',
        configKey: 'PAGE_CAREERS',
    },
    'guide-play': {
        title: 'Hướng dẫn chơi',
        description: 'Cách tham gia xổ số kiến thiết.',
        configKey: 'PAGE_GUIDE_PLAY',
    },
    'guide-buy': {
        title: 'Hướng dẫn mua vé',
        description: 'Các bước đặt mua vé trực tuyến.',
        configKey: 'PAGE_GUIDE_BUY',
    },
    'guide-payment': {
        title: 'Hướng dẫn thanh toán',
        description: 'Phương thức và quy trình thanh toán.',
        configKey: 'PAGE_GUIDE_PAYMENT',
    },
    'guide-prize': {
        title: 'Hướng dẫn nhận thưởng',
        description: 'Thủ tục nhận thưởng khi trúng giải.',
        configKey: 'PAGE_GUIDE_PRIZE',
    },
    stats: { title: 'Thống kê - Phân tích', description: 'Số liệu và xu hướng kết quả.' },
    prediction: { title: 'Soi cầu', description: 'Gợi ý tham khảo theo thống kê.' },
    'yesterday-winners': { title: 'Trúng thưởng hôm qua', description: 'Danh sách trúng thưởng gần nhất.' },
    sitemap: { title: 'Sitemap', description: 'Sơ đồ toàn bộ trang.' },
};

export const STATIC_PAGE_SLUGS = Object.keys(STATIC_PAGES);

export const getStaticPage = (slug: string): StaticPageDefinition | undefined =>
    STATIC_PAGES[slug];
