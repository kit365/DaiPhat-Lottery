"use client";

import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../hooks/useAuth";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { useNotificationUnreadCount } from "../../../hooks/useNotifications";
import { useMyRefundPendingCount } from "../../../hooks/useMyRefundPendingCount";
import { useMyPrizePayoutPendingCount } from "../../../hooks/usePrizePayout";
import { useMySupportTicketActiveCount } from "../../../hooks/useMySupportTicketActiveCount";
import { PROFILE_BANNERS } from "../../../constants/clientBannerAssets";
import { ROUTES } from '@/admin/constants/routes';
import { Breadcrumb } from "../../../../client/components/ui/Breadcrumb";

type TabId = 'info' | 'tickets' | 'orders' | 'refunds' | 'prizePayouts' | 'complaints' | 'bankAccounts' | 'notifications' | 'settings';

interface TabConfig {
    id: TabId;
    path: string;
    label: string;
    icon: string;
    badge?: number;
}

const TABS: TabConfig[] = [
    // { id: 'overview', path: '/profile/overview', label: 'Tổng quan', icon: 'fa-solid fa-border-all' },
    { id: 'info', path: '/profile/info', label: 'Tài khoản cá nhân', icon: 'fa-regular fa-user' },
    { id: 'tickets', path: '/profile/tickets', label: 'Vé của tôi', icon: 'fa-solid fa-ticket-simple' },
    { id: 'orders', path: '/profile/orders', label: 'Đơn hàng của tôi', icon: 'fa-solid fa-file-invoice-dollar' },
    { id: 'refunds', path: '/profile/refunds', label: 'Yêu cầu hoàn tiền', icon: 'fa-solid fa-rotate-left' },
    { id: 'prizePayouts', path: '/profile/prize-payouts', label: 'Yêu cầu trả thưởng', icon: 'fa-solid fa-trophy' },
    { id: 'complaints', path: '/profile/complaints', label: 'Khiếu nại / Hỗ trợ', icon: 'fa-solid fa-headset' },
    { id: 'bankAccounts', path: '/profile/bank-accounts', label: 'Tài khoản ngân hàng', icon: 'fa-solid fa-building-columns' },
    { id: 'notifications', path: '/profile/notifications', label: 'Thông báo', icon: 'fa-regular fa-bell' },
    { id: 'settings', path: '/profile/settings', label: 'Bảo mật', icon: 'fa-solid fa-shield-halved' },
];

export const ProfilePage = ({ children }: { children?: React.ReactNode }) => {
    const { user, isUserLoading, handleUploadAvatar, uploadAvatarMutation, logout } = useAuth();
    const { token, isHydrated, openLoginModal } = useAuthStore();
    const { unreadCount } = useNotificationUnreadCount();
    const { pendingCount: pendingRefundCount } = useMyRefundPendingCount();
    const { data: pendingPayoutRes } = useMyPrizePayoutPendingCount();
    const pendingPayoutCount = pendingPayoutRes?.data ?? 0;
    const { activeCount: activeTicketCount } = useMySupportTicketActiveCount();
    const pathname = usePathname() ?? '';
    const searchParamsForLocation = useSearchParams();
    const router = useRouter();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isHydrated || isUserLoading) {
            return;
        }
        if (!token) {
            router.push('/');
            openLoginModal();
        }
    }, [token, isHydrated, isUserLoading, router, openLoginModal]);

    if (!isHydrated || (token && isUserLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] pt-[80px]">
                <div className="flex flex-col items-center gap-3 text-[#637381]">
                    <div className="w-10 h-10 rounded-full border-4 border-[#ffcdcd] border-t-[#ee1314] animate-spin" />
                    <p className="text-[14px] font-medium">Đang tải trang cá nhân...</p>
                </div>
            </div>
        );
    }

    if (!token || !user) {
        return null;
    }

    // Find the active tab based on the current pathname
    const tabs = TABS.map((tab) => {
        if (tab.id === "notifications") {
            return { ...tab, badge: unreadCount > 0 ? unreadCount : undefined };
        }
        if (tab.id === "refunds") {
            return {
                ...tab,
                badge: pendingRefundCount > 0 ? pendingRefundCount : undefined,
            };
        }
        if (tab.id === "prizePayouts") {
            return {
                ...tab,
                badge: pendingPayoutCount > 0 ? pendingPayoutCount : undefined,
            };
        }
        if (tab.id === "complaints") {
            return {
                ...tab,
                badge: activeTicketCount > 0 ? activeTicketCount : undefined,
            };
        }
        return tab;
    });

    const activeTabObj = tabs.find(t => pathname.startsWith(t.path)) || tabs[0];
    const avatarSrc = user.avatar || user.avatarUrl;
    const isUploadingAvatar = uploadAvatarMutation.isPending;

    const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleUploadAvatar(file);
        }
        event.target.value = "";
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F8F9FA] font-['Inter',sans-serif] text-[#212B36]">
            <style>{`
                @media (min-width: 1024px) {
                    .profile-bg {
                        background-image: url('${PROFILE_BANNERS[0]}'), url('${PROFILE_BANNERS[1]}');
                        background-position: center -20px, bottom center;
                        background-size: 100% auto, 100% auto;
                        background-repeat: no-repeat, no-repeat;
                    }
                }
            `}</style>
            <div className="flex-1 w-full pt-[148px] lg:pt-[100px] pb-[100px] lg:pb-12 profile-bg">
                <main className="max-w-[1440px] mx-auto px-4 lg:px-6">
                    <div className="mb-4">
                        <Breadcrumb 
                            items={[
                                { label: 'Trang chủ', to: '/' },
                                { label: 'Tài khoản', to: '/profile/info' },
                                { label: activeTabObj.label }
                            ]} 
                        />
                    </div>

                    {/* Main Content Grid */}
                    <div className="flex flex-col lg:flex-row gap-6 items-start">

                        {/* Left Sidebar */}
                        <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-6">

                            {/* Profile Summary & Nav Container */}
                            <div className="bg-white rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col flex-1">

                                {/* Top Section with Cherry Blossom BG */}
                                <div className="relative pt-6 pb-2 flex flex-col items-center text-center">
                                    {/* Cherry Blossom Background */}
                                    <div
                                        className="absolute top-0 left-0 right-0 h-[140px] bg-cover bg-top z-0"
                                        style={{ backgroundImage: `url('${PROFILE_BANNERS[2]}')` }}
                                    >
                                    </div>

                                    {/* Avatar */}
                                    <div className="relative z-10 mb-3">
                                        <div className="w-[88px] h-[88px] rounded-full overflow-hidden border-[4px] border-white shadow-sm bg-slate-100 flex items-center justify-center text-[#919EAB]">
                                            {avatarSrc ? (
                                                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <i className="fa-solid fa-user text-4xl"></i>
                                            )}
                                        </div>
                                        <input
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleAvatarFileChange}
                                        />
                                        <button
                                            type="button"
                                            disabled={isUploadingAvatar}
                                            onClick={() => avatarInputRef.current?.click()}
                                            className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#BA0000] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                                            aria-label="Cập nhật ảnh đại diện"
                                        >
                                            <i className={`fa-solid ${isUploadingAvatar ? "fa-spinner fa-spin" : "fa-camera"} text-[11px]`}></i>
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div className="relative z-10 w-full px-4 flex flex-col items-center">
                                        <h2 className="text-[20px] font-black text-[#212B36] mb-2">{user.fullName || user.username}</h2>
                                        <p className="text-[13px] font-medium text-[#454F5B] mb-0.5">{user.email || 'john.doe@gmail.com'}</p>
                                        <p className="text-[13px] font-medium text-[#454F5B]">{user.phone || 'Chưa cập nhật'}</p>
                                    </div>
                                </div>

                                {/* Navigation Menu */}
                                <div className="pb-4 pt-2 flex flex-col flex-1">
                                    <nav className="flex flex-col gap-1 flex-1">
                                        {tabs.map((tab) => {
                                            const isActive = pathname.startsWith(tab.path);
                                            return (
                                                <Link
                                                    key={tab.id}
                                                    href={tab.path}
                                                    className={`relative flex items-center justify-between px-6 py-3.5 text-[15px] font-medium transition-all outline-none cursor-pointer text-left overflow-hidden group
                                                    ${isActive ? 'bg-gradient-to-r from-[#FFF4F4] to-white text-[#c80f11]' : 'text-[#454F5B] hover:bg-[#FAFBFC] hover:text-[#212B36]'}
                                                `}
                                                >
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <i className={`${tab.icon} w-5 text-center text-[17px] transition-colors ${isActive ? 'text-[#c80f11]' : 'text-[#919EAB] group-hover:text-[#454F5B]'}`}></i>
                                                        <span>{tab.label}</span>
                                                    </div>
                                                    {tab.badge != null && tab.badge > 0 && (
                                                        <span className="bg-[#ee1314] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] h-[20px] inline-flex items-center justify-center relative z-10 shrink-0 ml-2">
                                                            {tab.badge > 99 ? '99+' : tab.badge}
                                                        </span>
                                                    )}
                                                    {isActive && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#c80f11]"></div>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                        
                                        <div className="flex-1"></div>

                                        {/* Logout Button */}
                                        <div className="mt-6 px-6 pb-2">
                                            <button
                                                type="button"
                                                onClick={() => logout()}
                                                className="flex items-center justify-center gap-2 w-full py-2.5 border border-[#ee1314] text-[#ee1314] rounded-xl text-[14px] font-bold hover:bg-[#FFF4F4] transition-colors cursor-pointer"
                                            >
                                                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                                                Đăng xuất
                                            </button>
                                        </div>
                                    </nav>
                                </div>
                            </div>

                            {/* Support Widget */}
                            {(pathname === ROUTES.PUBLIC.PROFILE.ROOT || pathname === ROUTES.PUBLIC.PROFILE.INFO) && (
                                <div
                                    className="rounded-[20px] p-5 relative overflow-hidden flex flex-col justify-center min-h-[140px] bg-cover bg-center shadow-sm"
                                    style={{ backgroundImage: `url('${PROFILE_BANNERS[3]}')` }}
                                >
                                    <div className="relative z-10 max-w-[65%]">
                                        <h3 className="text-[14px] font-bold text-[#212B36] mb-1">Bạn cần hỗ trợ?</h3>
                                        <p className="text-[11px] font-medium text-[#637381] mb-3 leading-tight">Đội ngũ của chúng tôi luôn sẵn sàng!</p>
                                        <button
                                            onClick={() => router.push('/profile/complaints')}
                                            className="bg-transparent border border-[#ee1314] text-[#ee1314] text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#ee1314] hover:text-white transition-colors flex items-center gap-1.5 w-max cursor-pointer"
                                        >
                                            <i className="fa-solid fa-headset"></i>
                                            Liên hệ ngay
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 min-w-0 flex flex-col gap-6">


                            {/* Dynamic Content */}
                            <div className="mt-2">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={pathname}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {children}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};
