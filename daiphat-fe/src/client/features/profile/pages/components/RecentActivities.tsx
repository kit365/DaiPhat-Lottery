import React from 'react';
import { Package, Tag, UserPlus, Image as ImageIcon, MoreVertical } from "lucide-react";

const ACTIVITY_DATA = [
    { id: 1, type: 'inventory', title: 'Đã cập nhật vé số', desc: 'Vé số Mega 6/45 - Kỳ quay #120', time: '11:30 AM', icon: <Package size={16} />, color: "bg-orange-50 text-orange-500" },
    { id: 2, type: 'price', title: 'Thay đổi giá vé', desc: 'Áp dụng chiết khấu mùa lễ hội', time: '11:30 AM', icon: <Tag size={16} />, color: "bg-red-50 text-red-500" },
    { id: 3, type: 'new', title: 'Thêm sản phẩm mới', desc: 'Vé số Power 6/55 mới đã lên kệ', time: '11:30 AM', icon: <UserPlus size={16} />, color: "bg-blue-50 text-blue-500" },
    { id: 4, type: 'image', title: 'Hình ảnh vé số', desc: 'Đã cập nhật hình ảnh minh họa vé Max 3D', time: '11:30 AM', icon: <ImageIcon size={16} />, color: "bg-rose-50 text-rose-500" },
];

export const RecentActivities: React.FC = () => {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#102937]">Hoạt động gần đây</h3>
                <button className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer">
                    <MoreVertical size={20} />
                </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
                <div className="relative space-y-8 before:absolute before:inset-0 before:left-[19px] before:w-[2px] before:bg-slate-50">
                    {ACTIVITY_DATA.map((activity) => (
                        <div key={activity.id} className="relative flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 ${activity.color} shadow-sm`}>
                                {activity.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-bold text-[#102937] leading-none">{activity.title}</h4>
                                    <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">{activity.time}</span>
                                </div>
                                <p className="text-xs font-medium text-slate-400 mt-1.5 leading-relaxed">{activity.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="p-4 bg-slate-50/50 border-t border-slate-50 text-center">
                <button className="text-xs font-bold text-slate-500 hover:text-[#FF6262] transition-colors cursor-pointer">
                    Xem tất cả hoạt động
                </button>
            </div>
        </div>
    );
};
