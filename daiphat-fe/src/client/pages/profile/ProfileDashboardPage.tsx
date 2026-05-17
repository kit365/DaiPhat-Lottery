import React, { useState } from "react";
import { motion } from "framer-motion";
import { Download, Clock } from "lucide-react";
import { Header } from "../../../client/components/layout/header";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../../stores/useAuthStore";
import { ProfileInfoCard } from "./components/ProfileInfoCard";
import { RecentActivities } from "./components/RecentActivities";
import { StatsOverview } from "./components/StatsOverview";
import { SpendingChart } from "./components/SpendingChart";
import { OrderHistoryTable } from "./components/OrderHistoryTable";

export const ProfileDashboardPage = () => {
    const { user, isUserLoading } = useAuth();
    const { token, openLoginModal } = useAuthStore();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    if (isUserLoading || !user) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
               <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF6262]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-client-main pb-20 text-[#102937]">
            <Header />
            
            <main className="max-w-[1400px] mx-auto px-5 lg:px-8 pt-28 lg:pt-32">
                {/* Dashboard Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-[#102937]">Tổng quan tài khoản</h1>
                        <p className="text-sm font-bold text-slate-400 mt-1">Chào mừng trở lại, {user.fullName || user.username}! Dưới đây là tóm tắt hoạt động của bạn.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm text-[13px] font-bold text-slate-500">
                            <Clock size={16} />
                            <span>Cập nhật lần cuối: 12:45 PM</span>
                        </div>
                        <button className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-100 rounded-xl shadow-sm text-[13px] font-bold text-[#102937] hover:bg-slate-50 transition-all cursor-pointer">
                            <Download size={16} />
                            <span>Tải báo cáo</span>
                        </button>
                    </div>
                </header>

                {/* Main Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column (Profile & Activity) - 4 units */}
                    <div className="lg:col-span-4 space-y-8 h-full">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <ProfileInfoCard user={user} onEdit={() => setIsEditModalOpen(true)} />
                        </motion.div>
                        
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="h-full"
                        >
                            <RecentActivities />
                        </motion.div>
                    </div>

                    {/* Right Column (Stats, Chart, Table) - 8 units */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Row 1: Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <StatsOverview totalPoint={user.totalPoint || 0} usedPoint={user.usedPoint || 0} />
                        </motion.div>

                        {/* Row 2: Chart */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                        >
                            <SpendingChart />
                        </motion.div>

                        {/* Row 3: Table */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            <OrderHistoryTable />
                        </motion.div>
                    </div>

                </div>
            </main>

            {/* Placeholder for Modals */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#102937]/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full scale-in-center animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black text-[#102937] mb-4">Chỉnh sửa hồ sơ</h2>
                        <p className="text-slate-500 font-medium mb-8">Tính năng cập nhật thông tin cá nhân qua Modal đang được xây dựng.</p>
                        <button 
                            onClick={() => setIsEditModalOpen(false)}
                            className="w-full py-4 bg-[#FF6262] text-white font-black rounded-2xl shadow-xl shadow-[#FF6262]/20 hover:-translate-y-1 transition-all cursor-pointer"
                        >
                            Đã hiểu
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
