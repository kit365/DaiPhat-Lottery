import React, { useEffect } from "react";
import { useLocation, useNavigate, Link, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "../../../client/components/layout/header";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../../stores/useAuthStore";

type TabId = 'overview' | 'info' | 'address' | 'tickets' | 'history' | 'notifications' | 'settings';

interface TabConfig {
    id: TabId;
    path: string;
    label: string;
    icon: string;
    badge?: number;
}

const TABS: TabConfig[] = [
    { id: 'overview', path: '/profile/overview', label: 'Tổng quan tài khoản', icon: 'fa-regular fa-calendar-minus' },
    { id: 'info', path: '/profile/info', label: 'Thông tin tài khoản', icon: 'fa-regular fa-user' },
    { id: 'address', path: '/profile/address', label: 'Địa chỉ giao hàng', icon: 'fa-solid fa-location-dot' },
    { id: 'tickets', path: '/profile/tickets', label: 'Vé của tôi', icon: 'fa-solid fa-ticket' },
    { id: 'history', path: '/profile/history', label: 'Lịch sử giao dịch', icon: 'fa-solid fa-clock-rotate-left' },
    { id: 'notifications', path: '/profile/notifications', label: 'Thông báo', icon: 'fa-regular fa-bell', badge: 3 },
    { id: 'settings', path: '/profile/settings', label: 'Cài đặt', icon: 'fa-solid fa-gear' },
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
    const activeTabObj = TABS.find(t => location.pathname.startsWith(t.path)) || TABS[1];

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-['Inter',sans-serif] pb-20 lg:pb-0 text-[#212B36]">
            <Header />
            
            <main className="max-w-[1440px] mx-auto px-4 lg:px-6 pt-28 pb-12">
                
                {/* Main Content Grid */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    
                    {/* Left Sidebar */}
                    <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-6">
                        
                        {/* Profile Summary Card */}
                        <div className="bg-white rounded-xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#E5E8EB] p-6 flex flex-col items-center justify-center text-center">
                            <div className="w-[88px] h-[88px] rounded-full overflow-hidden border-2 border-white shadow-sm mb-4 bg-slate-100 flex items-center justify-center text-[#919EAB]">
                                {user.avatar || user.avatarUrl ? (
                                    <img src={user.avatar || user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <i className="fa-solid fa-user text-4xl"></i>
                                )}
                            </div>
                            <h2 className="text-[17px] font-bold text-[#212B36] mb-1">{user.fullName || user.username}</h2>
                            <p className="text-[14px] text-[#637381]">{user.phone || '0901 234 567'}</p>
                        </div>

                        {/* Navigation Menu */}
                        <div className="bg-white rounded-xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#E5E8EB] p-3">
                            <nav className="flex flex-col gap-1">
                                {TABS.map((tab) => {
                                    const isActive = location.pathname.startsWith(tab.path);
                                    return (
                                        <Link
                                            key={tab.id}
                                            to={tab.path}
                                            className={`flex items-center justify-between px-4 py-3 rounded-lg text-[14px] font-medium transition-colors outline-none cursor-pointer text-left
                                                ${isActive ? 'bg-[#FFF4F4] text-[#BA0000]' : 'text-[#454F5B] hover:bg-[#FAFBFC] hover:text-[#212B36]'}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <i className={`${tab.icon} w-5 text-center ${isActive ? 'text-[#BA0000]' : 'text-[#919EAB]'}`}></i>
                                                <span>{tab.label}</span>
                                            </div>
                                            {tab.badge && (
                                                <span className="bg-[#BA0000] text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                                    {tab.badge}
                                                </span>
                                            )}
                                            {isActive && (
                                                <div className="absolute left-0 w-1 h-8 bg-[#BA0000] rounded-r-md hidden"></div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Promo Banner */}
                        <div className="bg-[#BA0000] rounded-xl shadow-lg p-5 relative overflow-hidden text-white flex flex-col justify-center min-h-[160px] group cursor-pointer">
                            {/* Decorative background elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full blur-3xl opacity-20 transform translate-x-10 -translate-y-10"></div>
                            
                            <div className="relative z-10 w-2/3">
                                <h3 className="text-[17px] font-extrabold uppercase leading-tight mb-3 text-yellow-300">Săn lộc vàng<br/>Trúng lớn!</h3>
                                <button className="bg-yellow-400 text-red-900 text-[12px] font-bold px-4 py-1.5 rounded-md shadow-sm hover:bg-yellow-300 transition-colors">
                                    Mua vé ngay
                                </button>
                            </div>
                            
                            {/* God of wealth image placeholder */}
                            <div className="absolute bottom-0 right-0 w-24 h-24 transform translate-x-2 translate-y-2 group-hover:scale-110 transition-transform duration-300">
                                <img src="/assets/img/blog/blog-post-2.jpg" className="w-full h-full object-cover rounded-tl-full opacity-50 mix-blend-luminosity" alt="Promo" />
                            </div>
                            {/* Lottery balls placeholders */}
                            <div className="absolute bottom-2 left-2 w-6 h-6 bg-white rounded-full text-black text-[10px] font-bold flex items-center justify-center shadow-md">8</div>
                            <div className="absolute bottom-2 left-10 w-6 h-6 bg-white rounded-full text-black text-[10px] font-bold flex items-center justify-center shadow-md">8</div>
                            <div className="absolute bottom-2 right-12 w-6 h-6 bg-white rounded-full text-black text-[10px] font-bold flex items-center justify-center shadow-md">3</div>
                        </div>

                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0 flex flex-col gap-6">
                        
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-[14px] text-[#637381]">
                            <Link to="/" className="hover:text-[#BA0000] transition-colors">Trang chủ</Link>
                            <span className="text-[12px]">&gt;</span>
                            <span className="text-[#212B36] font-medium">{activeTabObj.label}</span>
                        </div>

                        {/* Title & Description */}
                        <div>
                            <h1 className="text-[28px] font-bold text-[#212B36] mb-1">{activeTabObj.label}</h1>
                            <p className="text-[#637381] text-[15px]">Quản lý thông tin cá nhân và tài khoản của bạn</p>
                        </div>

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
    );
};
