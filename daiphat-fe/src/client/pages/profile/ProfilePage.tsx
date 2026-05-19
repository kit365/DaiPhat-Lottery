import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, MapPin, Shield, Gift, ChevronRight } from "lucide-react";
import { Header } from "../../../client/components/layout/header";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../../stores/useAuthStore";
import { ProfileInfoTab } from "./tabs/ProfileInfoTab";
import { AddressTab } from "./tabs/AddressTab";
import { SecurityTab } from "./tabs/SecurityTab";
import { PointsTab } from "./tabs/PointsTab";

type TabId = 'profile' | 'address' | 'security' | 'points';

interface TabConfig {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    component: React.FC;
}

const TABS: TabConfig[] = [
    { id: 'profile', label: 'Hồ sơ cá nhân', icon: <UserIcon size={20} />, component: ProfileInfoTab },
    { id: 'address', label: 'Sổ địa chỉ', icon: <MapPin size={20} />, component: AddressTab },
    { id: 'security', label: 'Bảo mật', icon: <Shield size={20} />, component: SecurityTab },
    { id: 'points', label: 'Điểm thưởng', icon: <Gift size={20} />, component: PointsTab },
];

export const ProfilePage = () => {
    const { user, isUserLoading } = useAuth();
    const { token, openLoginModal } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Default to 'profile' unless hash is provided
    const [activeTab, setActiveTab] = useState<TabId>('profile');

    useEffect(() => {
        if (!token && !isUserLoading) {
            navigate('/');
            openLoginModal();
        }
    }, [token, isUserLoading, navigate, openLoginModal]);

    useEffect(() => {
        const hash = location.hash.replace('#', '') as TabId;
        if (TABS.some(t => t.id === hash)) {
            setActiveTab(hash);
        }
    }, [location]);

    const handleTabChange = (tabId: TabId) => {
        setActiveTab(tabId);
        window.history.replaceState(null, '', `#${tabId}`);
    };

    if (isUserLoading || !user) return null; // Let the layout/guard handle loading

    const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || ProfileInfoTab;

    return (
        <div className="min-h-screen bg-[#F4F6F8] font-client-main pb-20 lg:pb-0 text-client-ink">
            <Header />
            
            <main className="max-w-[1240px] mx-auto px-5 lg:px-10 pt-28 lg:pt-32 pb-12">
                {/* Header Banner */}
                <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-[#FF6262] to-[#102937] px-8 py-10 shadow-lg flex items-center min-h-[160px]">
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg_viewBox=%270_0_200_200%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter_id=%27n%27%3E%3CfeTurbulence_type=%27fractalNoise%27_baseFrequency=%27.65%27_numOctaves=%273%27_stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect_width=%27100%25%27_height=%27100%25%27_filter=%27url(%23n)%27/%3E%3C/svg%3E')]" aria-hidden="true" />
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full border-4 border-white/20 shadow-xl overflow-hidden bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
                            {user.avatar || user.avatarUrl ? (
                                <img src={user.avatar || user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon size={32} />
                            )}
                        </div>
                        <div className="text-white">
                            <h1 className="text-3xl font-extrabold tracking-tight">Xin chào, {user.fullName || user.username}</h1>
                            <p className="opacity-80 mt-1 max-w-lg">Quản lý thông tin cá nhân, địa chỉ nhận giải và thẻ thành viên của bạn tại đây.</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
                    
                    {/* Sidebar Tabs (Desktop) / Horizontal Tabs (Mobile) */}
                    <div className="lg:sticky lg:top-28 bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible hide-scrollbar relative">
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`flex items-center gap-4 px-6 py-4.5 whitespace-nowrap transition-all outline-none cursor-pointer text-left relative
                                            ${isActive ? 'text-[#FF6262] font-bold bg-[#FF6262]/5' : 'text-[#505050] font-medium hover:bg-slate-50 hover:text-[#102937]'}
                                        `}
                                    >
                                        <span className={`transition-colors ${isActive ? 'text-[#FF6262]' : 'text-slate-400'}`}>
                                            {tab.icon}
                                        </span>
                                        <span className="flex-1 text-[15px]">{tab.label}</span>
                                        <ChevronRight size={16} className={`hidden lg:block opacity-0 -translate-x-2 transition-all ${isActive ? 'opacity-100 translate-x-0 text-[#FF6262]' : 'group-hover:opacity-100'}`} />
                                        
                                        {/* Mobile bottom indicator */}
                                        {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6262] lg:hidden"></div>}
                                        {/* Desktop left indicator */}
                                        {isActive && <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-1 bg-[#FF6262]"></div>}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 lg:p-10 min-h-[500px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ActiveComponent />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                </div>
            </main>
        </div>
    );
};
