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
    'text-[13px] text-[#212B36] hover:text-[#ee1314] hover:translate-x-1 transition-colors duration-200 flex items-center justify-between group';

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

          {/* Column 1: About Company */}
          <div className="lg:col-span-2 flex flex-col space-y-5 pr-4">
            <div className="flex items-center gap-3">
              <img src="https://i.ibb.co/YBYnq3HR/z7824247008533-94446d3b6c16598cda67404d805c15c4-removebg-preview.png" alt="Đại Phát Logo" className="w-11 h-11 object-contain rounded-xl shadow-sm" />
              <div>
                <h2 className="text-[#ee1314] font-black text-xl leading-none mb-1 tracking-tight">ĐẠI PHÁT</h2>
                <span className="text-[#F5A623] text-[9px] font-bold tracking-wider uppercase whitespace-nowrap">TÀI LỘC - MAY MẮN - THỊNH VƯỢNG</span>
              </div>
            </div>
        </footer>
    );
};
