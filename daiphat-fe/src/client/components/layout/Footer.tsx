'use client';

import { Link } from 'react-router-dom';
import { ChevronRight, Phone, Mail, MapPin } from 'lucide-react';
import { useSiteBranding } from '@/client/hooks/useSiteBranding';
import { BrandMark } from '@/client/components/auth/SharedAuth';

const ABOUT_LINKS = [
    { label: 'Giới thiệu', to: '/pages/about' },
    { label: 'Tin tức', to: '/blogs' },
    { label: 'Tuyển dụng', to: '/pages/careers' },
    { label: 'Điều khoản sử dụng', to: '/pages/terms' },
    { label: 'Chính sách bảo mật', to: '/pages/privacy' },
    { label: 'Liên hệ', to: '/pages/contact' },
] as const;

const GUIDE_LINKS = [
    { label: 'Hướng dẫn chơi', to: '/pages/guide-play' },
    { label: 'Hướng dẫn mua vé', to: '/pages/guide-buy' },
    { label: 'Hướng dẫn thanh toán', to: '/pages/guide-payment' },
    { label: 'Hướng dẫn nhận thưởng', to: '/pages/guide-prize' },
    { label: 'Câu hỏi thường gặp', to: '/pages/faq' },
] as const;

const UTILITY_LINKS = [
    { label: 'Kết quả xổ số', to: '/results' },
    { label: 'Thống kê - Phân tích', to: '/pages/stats' },
    { label: 'Soi cầu', to: '/pages/prediction' },
    { label: 'Lịch mở thưởng', to: '/lich-mo-thuong' },
    { label: 'Trúng thưởng hôm qua', to: '/pages/yesterday-winners' },
] as const;

const BOTTOM_LINKS = [
    { label: 'Điều khoản', to: '/pages/terms' },
    { label: 'Bảo mật', to: '/pages/privacy' },
    { label: 'Sitemap', to: '/pages/sitemap' },
] as const;

const sectionTitleClass =
    "text-[#212B36] font-bold text-[14px] mb-5 uppercase tracking-wider relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-[2px] after:bg-[#ee1314] pb-2";

const navLinkClass =
    'text-[13px] text-slate-600 hover:text-[#ee1314] hover:translate-x-1 transition-colors duration-200 flex items-center justify-between group';

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

const FooterNavList = ({
    title,
    links,
}: {
    title: string;
    links: ReadonlyArray<{ label: string; to: string }>;
}) => (
    <div className="flex flex-col">
        <h3 className={sectionTitleClass}>{title}</h3>
        <ul className="space-y-3">
            {links.map((item) => (
                <li key={item.label}>
                    <Link to={item.to} className={navLinkClass}>
                        <span>{item.label}</span>
                        <ChevronRight
                            size={12}
                            className="text-slate-400 group-hover:text-[#ee1314] transition-colors shrink-0"
                            aria-hidden
                        />
                    </Link>
                </li>
            ))}
        </ul>
    </div>
);

/**
 * Footer đủ cột theo design: Thương hiệu · Về chúng tôi · Hướng dẫn · Tiện ích · Liên hệ.
 * Link vẫn hiện dù trang đích chưa có nội dung.
 */
export const Footer = () => {
    const {
        name,
        slogan,
        intro,
        logoUrl,
        phone,
        email,
        address,
        supportOpenTime,
        supportCloseTime,
        facebookUrl,
        telegramUrl,
        copyright,
    } = useSiteBranding();

    const socialLinks = [
        { label: 'Facebook', icon: 'facebook', href: facebookUrl },
        { label: 'Telegram', icon: 'telegram', href: telegramUrl },
    ].filter((item) => item.href && item.href !== '#');

    const supportHours =
        supportOpenTime && supportCloseTime
            ? `${supportOpenTime} - ${supportCloseTime} mỗi ngày`
            : '';

    const copyrightText =
        copyright || `© ${new Date().getFullYear()} ${name}. Tất cả quyền được bảo lưu.`;

    /** Một dòng mô tả: ưu tiên intro; nếu trùng slogan thì chỉ hiện slogan dưới tên. */
    const brandBlurb =
        intro && intro.trim() && intro.trim() !== slogan.trim() ? intro.trim() : '';

    return (
        <footer className="relative bg-gradient-to-b from-white to-[#FFF8F8] pt-16 pb-8 overflow-hidden border-t border-red-100">
            <div
                className="absolute inset-0 pointer-events-none z-0 opacity-[0.4] md:opacity-[0.6] transition-opacity duration-300"
                style={{
                    backgroundImage:
                        "url('https://cdn.phototourl.com/free/2026-06-07-98422aba-75e7-49a6-ab69-6ed30ab67386.png')",
                    backgroundSize: '100% auto',
                    backgroundPosition: 'bottom center',
                    backgroundRepeat: 'no-repeat',
                }}
            />

            <div className="container mx-auto px-4 md:px-8 relative z-10 max-w-[1440px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 xl:gap-12 mb-12">
                    {/* Thương hiệu */}
                    <div className="lg:col-span-2 flex flex-col space-y-5 pr-4">
                        <div className="flex items-center gap-3">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt={name}
                                    width={44}
                                    height={44}
                                    className="w-11 h-11 object-contain rounded-xl shadow-sm bg-white"
                                />
                            ) : (
                                <BrandMark className="w-11 h-11" />
                            )}
                            <div>
                                <h2 className="text-[#ee1314] font-black text-xl leading-none mb-1 tracking-tight">
                                    {name}
                                </h2>
                                {slogan ? (
                                    <span className="text-[#F5A623] text-[9px] font-bold tracking-wider uppercase whitespace-nowrap">
                                        {slogan}
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        {brandBlurb ? (
                            <p className="text-slate-600 text-[13.5px] leading-relaxed">{brandBlurb}</p>
                        ) : null}

                        {socialLinks.length > 0 ? (
                            <div className="flex items-center gap-3 pt-1">
                                {socialLinks.map((item) => (
                                    <a
                                        key={item.icon}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={item.label}
                                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-[#ee1314] text-[#ee1314] hover:text-white flex items-center justify-center transition-colors duration-200 shadow-sm"
                                    >
                                        <i className={`fa-brands fa-${item.icon} text-[15px]`} aria-hidden />
                                    </a>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <FooterNavList title="Về chúng tôi" links={ABOUT_LINKS} />
                    <FooterNavList title="Hướng dẫn" links={GUIDE_LINKS} />
                    <FooterNavList title="Tiện ích" links={UTILITY_LINKS} />

                    {/* Liên hệ */}
                    <div className="flex flex-col">
                        <h3 className={sectionTitleClass}>Liên hệ</h3>
                        <ul className="space-y-4">
                            {phone ? (
                                <li className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 rounded-lg bg-red-50 text-[#ee1314]">
                                        <Phone size={14} strokeWidth={2.5} aria-hidden />
                                    </div>
                                    <div>
                                        <a
                                            href={telHref(phone)}
                                            className="text-[13.5px] font-bold text-[#212B36] hover:text-[#ee1314] transition-colors duration-200"
                                        >
                                            {phone}
                                        </a>
                                        {supportHours ? (
                                            <p className="text-[11px] text-slate-500">({supportHours})</p>
                                        ) : null}
                                    </div>
                                </li>
                            ) : null}
                            {email ? (
                                <li className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 rounded-lg bg-red-50 text-[#ee1314]">
                                        <Mail size={14} strokeWidth={2.5} aria-hidden />
                                    </div>
                                    <div>
                                        <a
                                            href={`mailto:${email}`}
                                            className="text-[13.5px] font-bold text-[#212B36] hover:text-[#ee1314] transition-colors duration-200 break-all"
                                        >
                                            {email}
                                        </a>
                                        <p className="text-[11px] text-slate-500">Hỗ trợ khách hàng</p>
                                    </div>
                                </li>
                            ) : null}
                            {address ? (
                                <li className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 rounded-lg bg-red-50 text-[#ee1314]">
                                        <MapPin size={14} strokeWidth={2.5} aria-hidden />
                                    </div>
                                    <div>
                                        <p className="text-[13.5px] font-bold text-[#212B36] whitespace-pre-line">
                                            {address}
                                        </p>
                                        <p className="text-[11px] text-slate-500">Trụ sở chính</p>
                                    </div>
                                </li>
                            ) : null}
                            {!phone && !email && !address ? (
                                <li className="text-[13px] text-slate-500">Chưa cấu hình thông tin liên hệ.</li>
                            ) : null}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-200/80 py-6 mt-8 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-[12px]">
                        <p>{copyrightText}</p>
                        <div className="flex items-center gap-6">
                            {BOTTOM_LINKS.map((item) => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className="hover:text-[#ee1314] transition-colors duration-200"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};
