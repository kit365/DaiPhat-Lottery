import React from 'react';
import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react";

interface StatCardProps {
    label: string;
    value: string | number;
    trend?: {
        value: string;
        isUp: boolean;
    };
    iconColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, iconColor = "bg-emerald-50 text-emerald-600" }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group overflow-hidden">
        <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <button className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer">
                <Info size={16} />
            </button>
        </div>
        <div className="flex flex-col gap-2">
            <div className="text-2xl font-black text-[#102937]">{value}</div>
            {trend && (
                <div className="flex items-center gap-1.5 text-[13px]">
                    <div className={`flex items-center gap-0.5 font-bold ${trend.isUp ? 'text-emerald-500' : 'text-[#FF6262]'}`}>
                        {trend.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {trend.value}
                    </div>
                    <span className="text-slate-400 font-medium">so với năm ngoái</span>
                </div>
            )}
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <div className={`w-32 h-32 rounded-full ${iconColor}`}></div>
        </div>
    </div>
);

export const StatsOverview: React.FC<{ totalPoint: number; usedPoint: number }> = ({ totalPoint, usedPoint }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard 
                label="Tổng điểm thưởng" 
                value={totalPoint.toLocaleString() + " DP"} 
                trend={{ value: "+12.5%", isUp: true }}
            />
            <StatCard 
                label="Đơn hàng đã đặt" 
                value="142" 
                trend={{ value: "+3.2%", isUp: true }}
            />
            <StatCard 
                label="Vé trúng thưởng" 
                value="12" 
                trend={{ value: "-1.5%", isUp: false }}
                iconColor="bg-[#FF6262]/20 text-[#FF6262]"
            />
        </div>
    );
};
