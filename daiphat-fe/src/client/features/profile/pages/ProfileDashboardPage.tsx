"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "../../../components/layout/header";
import { useAuth } from "../../../hooks/useAuth";
import { ProfileInfoCard } from "./components/ProfileInfoCard";
import { RecentActivities } from "./components/RecentActivities";
import { StatsOverview } from "./components/StatsOverview";
import { SpendingChart } from "./components/SpendingChart";
import { OrderHistoryTable } from "./components/OrderHistoryTable";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfileEditModal } from "./components/ProfileEditModal";

export const ProfileDashboardPage = () => {
    const { user, isUserLoading } = useAuth();
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
                <ProfileHeader user={user} />

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
                            <StatsOverview totalPoint={(user as any).totalPoint || 0} usedPoint={(user as any).usedPoint || 0} />
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

            {/* Modal */}
            <ProfileEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
        </div>
    );
};
