"use client";

import React from 'react';
import { useAuth } from "../../../../hooks/useAuth";
import { Gift, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";

export const PointsTab = () => {
    const { user } = useAuth();
    
    // Mock transaction history
    const transactions = [
        { id: '1', type: 'earn', date: '2023-11-20', amount: 50, description: 'Mua vé số Mega 6/45' },
        { id: '2', type: 'spend', date: '2023-11-18', amount: 200, description: 'Đổi thẻ cào 20k' },
        { id: '3', type: 'earn', date: '2023-11-15', amount: 120, description: 'Mua vé số Power 6/55' },
        { id: '4', type: 'earn', date: '2023-11-10', amount: 30, description: 'Điểm danh hàng ngày' },
    ];

    if (!user) return null;

    const currentPoints = (user as any).totalPoint || 0;
    const usedPoints = (user as any).usedPoint || 0;
    const totalAccumulated = currentPoints + usedPoints;

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-bold text-[#102937]">Điểm thưởng Đại Phát</h3>
                <p className="text-sm text-[#505050] mt-1">Tích lũy điểm khi mua vé để đổi những phần quà giá trị.</p>
            </div>

            {/* Points Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-6 bg-linear-to-br from-[#FFB800] to-[#F29F05] rounded-2xl text-white relative overflow-hidden shadow-lg shadow-[#FFB800]/20">
                    <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
                        <Gift size={120} strokeWidth={1.5} />
                    </div>
                    <div className="relative z-10">
                        <span className="block text-white/80 text-sm font-bold uppercase tracking-wider mb-2">Điểm hiện có</span>
                        <div className="flex items-end gap-2">
                            <span className="text-5xl font-black">{currentPoints.toLocaleString()}</span>
                            <span className="text-xl font-bold mb-1 opacity-80">DP</span>
                        </div>
                        <button className="mt-6 bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-lg text-sm font-bold shadow-sm cursor-pointer">
                            Đổi thưởng ngay
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Tổng tích luỹ</span>
                            <strong className="text-2xl text-[#102937] font-black">{totalAccumulated.toLocaleString()}</strong>
                        </div>
                        <div>
                            <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Đã sử dụng</span>
                            <strong className="text-2xl text-[#FF6262] font-black">{usedPoints.toLocaleString()}</strong>
                        </div>
                    </div>
                    
                    <div className="mt-5 pt-5 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-600">Thành viên Bạc</span>
                            <span className="text-sm font-bold text-[#FFB800]">Vàng</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#FFB800] rounded-full" style={{ width: '45%' }}></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-right">Cần thêm 550 điểm để lên hạng</p>
                    </div>
                </div>
            </div>

            {/* Transaction History */}
            <div>
                <h4 className="text-lg font-bold text-[#102937] mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-[#FF6262]" />
                    Lịch sử điểm thưởng
                </h4>
                
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    {transactions.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {transactions.map((t) => (
                                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'earn' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                            {t.type === 'earn' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                        </div>
                                        <div>
                                            <strong className="block text-sm font-bold text-[#102937]">{t.description}</strong>
                                            <span className="text-xs text-slate-500 mt-1 block">{t.date}</span>
                                        </div>
                                    </div>
                                    <div className={`font-black ${t.type === 'earn' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {t.type === 'earn' ? '+' : '-'}{t.amount}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            Chưa có giao dịch điểm thưởng nào.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
