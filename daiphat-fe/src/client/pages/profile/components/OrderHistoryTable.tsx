import React from 'react';
import { ChevronDown, Download, Plus } from "lucide-react";

const ORDER_DATA = [
    { id: 1, item: 'Vé số Mega 6/45', orderId: '#SHA54321-7S', date: '12 Tháng 5, 2024', qty: '12 tờ', amount: '120.000 VNĐ' },
    { id: 2, item: 'Vé số Power 6/55', orderId: '#FAH124541-7F', date: '10 Tháng 5, 2024', qty: '5 tờ', amount: '50.000 VNĐ' },
    { id: 3, item: 'Vé Max 3D+', orderId: '#SLR132132-9N', date: '08 Tháng 5, 2024', qty: '10 tờ', amount: '100.000 VNĐ' },
    { id: 4, item: 'Vé số Mega 6/45', orderId: '#SHA54321-8T', date: '05 Tháng 5, 2024', qty: '20 tờ', amount: '200.000 VNĐ' },
];

export const OrderHistoryTable: React.FC = () => {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-bold text-[#102937]">Lịch sử đặt vé</h3>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 cursor-pointer">
                        <span>Lọc theo: Loại vé</span>
                        <ChevronDown size={14} />
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-100 cursor-pointer">
                        <Download size={14} />
                        <span>Xuất CSV</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-[#102937] hover:bg-[#102937]/90 rounded-lg transition-all cursor-pointer">
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Loại vé</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Mã đơn</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Ngày mua</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Số lượng</th>
                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Tổng tiền</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {ORDER_DATA.map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-[#FF6262]"></div>
                                        <span className="text-sm font-bold text-[#102937]">{order.item}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-sm font-bold text-slate-400 group-hover:text-[#102937] transition-colors">{order.orderId}</td>
                                <td className="px-6 py-5 text-sm font-bold text-slate-500">{order.date}</td>
                                <td className="px-6 py-5 text-sm font-bold text-slate-500">{order.qty}</td>
                                <td className="px-6 py-5 text-sm font-black text-[#102937] text-right">{order.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-slate-50/30 border-t border-slate-50 flex justify-center">
                <button className="text-xs font-bold text-slate-400 hover:text-[#102937] transition-colors cursor-pointer">
                    Xem tất cả lịch sử giao dịch
                </button>
            </div>
        </div>
    );
};
