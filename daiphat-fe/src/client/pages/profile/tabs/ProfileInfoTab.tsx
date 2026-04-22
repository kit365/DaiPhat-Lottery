import React, { useState } from 'react';
import { useAuth } from "../../../hooks/useAuth";
import { User as UserIcon, Camera } from "lucide-react";
import { toast } from "react-toastify";

export const ProfileInfoTab = () => {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    // Controlled inputs for editable fields
    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [phone, setPhone] = useState(user?.phone || '');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Placeholder for API call
            await new Promise(resolve => setTimeout(resolve, 800));
            toast.info("Tính năng cập nhật hồ sơ sẽ sớm ra mắt!");
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    return (
        <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden relative">
                        {user.avatar || user.avatarUrl ? (
                            <img src={user.avatar || user.avatarUrl} alt={user.firstName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#FF6262] bg-[#FF6262]/5">
                                <UserIcon size={40} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="text-white" size={24} />
                        </div>
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-[#102937]">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-[#505050] mt-1">{user.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                <div>
                    <label className="block text-sm font-bold text-[#102937] mb-2">Họ</label>
                    <input 
                        type="text" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#FF6262] focus:ring-2 focus:ring-[#FF6262]/20 outline-none transition-all text-[#17191F] font-medium"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-[#102937] mb-2">Tên</label>
                    <input 
                        type="text" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#FF6262] focus:ring-2 focus:ring-[#FF6262]/20 outline-none transition-all text-[#17191F] font-medium"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-[#102937] mb-2">Tên đăng nhập</label>
                    <input 
                        type="text" 
                        value={user.username} 
                        readOnly 
                        className="w-full px-4 h-12 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-[#102937] mb-2">Email</label>
                    <input 
                        type="email" 
                        value={user.email} 
                        readOnly 
                        className="w-full px-4 h-12 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-[#102937] mb-2">Số điện thoại</label>
                    <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#FF6262] focus:ring-2 focus:ring-[#FF6262]/20 outline-none transition-all text-[#17191F] font-medium"
                    />
                </div>
            </div>

            <div className="pt-6 flex justify-end">
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="h-12 px-8 bg-[#FF6262] text-white font-bold rounded-xl shadow-lg shadow-[#FF6262]/26 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
            </div>
        </form>
    );
};
