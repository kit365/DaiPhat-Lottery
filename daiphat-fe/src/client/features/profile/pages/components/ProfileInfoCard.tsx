import React from 'react';
import { User } from "../../../../../types/user.type";
import { Edit2, Mail, Phone, Calendar, MessageSquare, User as UserIcon } from "lucide-react";

interface ProfileInfoCardProps {
    user: User;
    onEdit: () => void;
}

export const ProfileInfoCard: React.FC<ProfileInfoCardProps> = ({ user, onEdit }) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#102937]">Thông tin cá nhân</h3>
                <button 
                    onClick={onEdit}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-[#FF6262] bg-slate-50 hover:bg-[#FF6262]/5 rounded-lg transition-all border border-slate-100 cursor-pointer"
                >
                    <Edit2 size={14} />
                    <span>Sửa</span>
                </button>
            </div>

            <div className="p-7 flex-1">
                <div className="flex items-start gap-5 mb-8">
                    <div className="relative group">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center">
                            {user.avatar || user.avatarUrl ? (
                                <img src={user.avatar || user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-[#FF6262] font-black text-2xl">
                                    {(user.fullName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                                </div>
                            )}
                        </div>
                        <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#FF6262] transition-colors cursor-pointer">
                            <MessageSquare size={16} />
                        </button>
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-[#102937] leading-tight">
                            {user.fullName}
                        </h4>
                        <span className="text-sm font-bold text-slate-400 mt-1 block">ID: #{user.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Email</span>
                        <div className="flex items-center gap-3 text-sm font-bold text-[#102937]">
                            <Mail size={16} className="text-slate-300" />
                            <span>{user.email}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</span>
                        <div className="flex items-center gap-3 text-sm font-bold text-[#102937]">
                            <Phone size={16} className="text-slate-300" />
                            <span>{user.phone || "Chưa cập nhật"}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Giới tính</span>
                        <div className="flex items-start gap-3 text-sm font-bold text-[#102937]">
                            <UserIcon size={16} className="text-slate-300 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{user.gender === 'MALE' ? 'Nam' : user.gender === 'FEMALE' ? 'Nữ' : 'Khác'}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Ngày sinh</span>
                        <div className="flex items-start gap-3 text-sm font-bold text-[#102937]">
                            <Calendar size={16} className="text-slate-300 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{user.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : "Chưa cập nhật"}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Giao dịch cuối</span>
                        <div className="flex items-center gap-3 text-sm font-bold text-[#102937]">
                            <Calendar size={16} className="text-slate-300" />
                            <span>15 Tháng 5, 2024</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
