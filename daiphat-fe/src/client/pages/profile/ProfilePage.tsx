import React, { useEffect } from "react";
import { useLocation, useNavigate, Link, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "../../../client/components/layout/header";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../../stores/useAuthStore";

type TabId = 'overview' | 'info' | 'address' | 'tickets' | 'history' | 'notifications' | 'settings' | 'favorites';

interface TabConfig {
    id: TabId;
    path: string;
    label: string;
    icon: string;
    badge?: number;
}

const TABS: TabConfig[] = [
    { id: 'overview', path: '/profile/overview', label: 'Tổng quan', icon: 'fa-solid fa-border-all' },
    { id: 'info', path: '/profile/info', label: 'Tài khoản cá nhân', icon: 'fa-regular fa-user' },
    { id: 'tickets', path: '/profile/tickets', label: 'Vé của tôi', icon: 'fa-solid fa-ticket-simple' },
    { id: 'favorites', path: '/profile/favorites', label: 'Số yêu thích', icon: 'fa-regular fa-star' },
    { id: 'notifications', path: '/profile/notifications', label: 'Thông báo', icon: 'fa-regular fa-bell' },
    { id: 'settings', path: '/profile/settings', label: 'Bảo mật', icon: 'fa-solid fa-shield-halved' },
];

export const ProfilePage = () => {
    const { user, isUserLoading } = useAuth();
    const { token, openLoginModal } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!token && !isUserLoading) {
            navigate('/');
            openLoginModal();
        }
    }, [token, isUserLoading, navigate, openLoginModal]);

    if (isUserLoading || !user) return null;

    // Find the active tab based on the current pathname
    const activeTabObj = TABS.find(t => location.pathname.startsWith(t.path)) || TABS[0];

    return (
        <div className="min-h-screen flex flex-col bg-[#F8F9FA] font-['Inter',sans-serif] text-[#212B36]">
            <Header />

            <style>{`
                @media (min-width: 1024px) {
                    .profile-bg {
                        background-image: url('https://i.ibb.co/nsNc8F41/Screenshot-2026-05-30-141824.png'), url('https://i.ibb.co/DP5YBHxY/Screenshot-2026-05-30-142428.png');
                        background-position: center -20px, bottom center;
                        background-size: 100% auto, 100% auto;
                        background-repeat: no-repeat, no-repeat;
                    }
                }
            `}</style>
            <div className="flex-1 w-full mt-[70px] lg:mt-[80px] profile-bg">
                <main className="max-w-[1440px] mx-auto px-4 lg:px-6 pt-6 pb-12">

                    {/* Main Content Grid */}
                    <div className="flex flex-col lg:flex-row gap-6 items-stretch">

                        {/* Left Sidebar */}
                        <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-6">

                            {/* Profile Summary & Nav Container */}
                            <div className="bg-white rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col flex-1">

                                {/* Top Section with Cherry Blossom BG */}
                                <div className="relative pt-6 pb-2 flex flex-col items-center text-center">
                                    {/* Cherry Blossom Background */}
                                    <div
                                        className="absolute top-0 left-0 right-0 h-[140px] bg-cover bg-top z-0"
                                        style={{ backgroundImage: "url('https://i.ibb.co/hxtX5R85/5193a4bb-ce0a-469c-9345-0f9c814a8dab.png')" }}
                                    >
                                    </div>

                                    {/* Avatar */}
                                    <div className="relative z-10 mb-3">
                                        <div className="w-[88px] h-[88px] rounded-full overflow-hidden border-[4px] border-white shadow-sm bg-slate-100 flex items-center justify-center text-[#919EAB]">
                                            {user.avatar || user.avatarUrl ? (
                                                <img src={user.avatar || user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <i className="fa-solid fa-user text-4xl"></i>
                                            )}
                                        </div>
                                        <button className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#BA0000] transition-colors cursor-pointer">
                                            <i className="fa-solid fa-camera text-[11px]"></i>
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div className="relative z-10 w-full px-4 flex flex-col items-center">
                                        <h2 className="text-[18px] font-black text-[#212B36] mb-2">{user.fullName || user.username}</h2>
                                        <p className="text-[12px] font-medium text-[#454F5B] mb-0.5">{user.email || 'john.doe@gmail.com'}</p>
                                        <p className="text-[12px] font-medium text-[#454F5B]">{user.phone || '0987 654 321'}</p>
                                    </div>
                                </div>

                                {/* Navigation Menu */}
                                <div className="pb-4 pt-2 flex flex-col flex-1">
                                    <nav className="flex flex-col gap-1 flex-1">
                                        {TABS.map((tab) => {
                                            const isActive = location.pathname.startsWith(tab.path);
                                            return (
                                                <Link
                                                    key={tab.id}
                                                    to={tab.path}
                                                    className={`relative flex items-center justify-between px-6 py-3 text-[13px] font-medium transition-all outline-none cursor-pointer text-left overflow-hidden group
                                                    ${isActive ? 'bg-gradient-to-r from-[#FFF4F4] to-white text-[#c80f11]' : 'text-[#454F5B] hover:bg-[#FAFBFC] hover:text-[#212B36]'}
                                                `}
                                                >
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <i className={`${tab.icon} w-5 text-center text-[16px] transition-colors ${isActive ? 'text-[#c80f11]' : 'text-[#919EAB] group-hover:text-[#454F5B]'}`}></i>
                                                        <span>{tab.label}</span>
                                                    </div>
                                                    {tab.badge && (
                                                        <span className="bg-[#ee1314] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center relative z-10">
                                                            {tab.badge}
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
                                            <button className="flex items-center justify-center gap-2 w-full py-2.5 border border-[#ee1314] text-[#ee1314] rounded-xl text-[14px] font-bold hover:bg-[#FFF4F4] transition-colors cursor-pointer">
                                                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                                                Đăng xuất
                                            </button>
                                        </div>
                                    </nav>
                                </div>
                            </div>

                            {/* Support Widget */}
                            {location.pathname.includes('/profile/overview') && (
                                <div
                                    className="rounded-[20px] p-5 relative overflow-hidden flex flex-col justify-center min-h-[140px] bg-cover bg-center shadow-sm"
                                    style={{ backgroundImage: "url('https://i.ibb.co/M5RCKKDn/d2ee3500-96d8-4e2f-a713-d74b7e35e64c.png')" }}
                                >
                                    <div className="relative z-10 max-w-[65%]">
                                        <h3 className="text-[14px] font-bold text-[#212B36] mb-1">Bạn cần hỗ trợ?</h3>
                                        <p className="text-[11px] font-medium text-[#637381] mb-3 leading-tight">Đội ngũ của chúng tôi luôn sẵn sàng!</p>
                                        <button className="bg-transparent border border-[#ee1314] text-[#ee1314] text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#ee1314] hover:text-white transition-colors flex items-center gap-1.5 w-max cursor-pointer">
                                            <i className="fa-solid fa-headset"></i>
                                            Liên hệ ngay
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 min-w-0 flex flex-col gap-6">

                            {/* Title & Description */}
                            {activeTabObj.id !== 'overview' && (
                                <div>
                                    <h1 className="text-[28px] font-bold text-[#212B36] mb-1">{activeTabObj.label}</h1>
                                    <p className="text-[#637381] text-[15px]">Quản lý thông tin cá nhân và tài khoản của bạn</p>
                                </div>
                            )}

                            {/* Dynamic Content */}
                            <div className="mt-2">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={location.pathname}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Outlet />
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
