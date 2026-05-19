import React, { useState, useEffect } from 'react';
import { useAuth } from "../../../hooks/useAuth";
import { User as UserIcon, Camera } from "lucide-react";

// Inner form that receives user as a stable prop — key prop on parent resets this when user changes
const ProfileForm = ({ user, handleUpdateProfile, isPending }: {
    user: NonNullable<ReturnType<typeof useAuth>['user']>;
    handleUpdateProfile: ReturnType<typeof useAuth>['handleUpdateProfile'];
    isPending: boolean;
}) => {
    const [lastName, setLastName] = useState(user.lastName || '');
    const [firstName, setFirstName] = useState(user.firstName || '');
    const [phone, setPhone] = useState(user.phone || '');

    // Re-sync if user data changes (e.g. after background refetch completes)
    useEffect(() => {
        setLastName(user.lastName || '');
        setFirstName(user.firstName || '');
        setPhone(user.phone || '');
    }, [user.lastName, user.firstName, user.phone]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        handleUpdateProfile({
            id: user.id,
            data: {
                firstName,
                lastName,
                email: user.email,
                phone,
            }
        });
    };

    return (
        <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden relative">
                        {user.avatar || user.avatarUrl ? (
                            <img src={user.avatar || user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
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
                    <h3 className="text-xl font-bold text-[#102937]">{user.fullName || user.username}</h3>
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
                    disabled={isPending}
                    className="h-12 px-8 bg-[#FF6262] text-white font-bold rounded-xl shadow-lg shadow-[#FF6262]/26 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
            </div>
        </form>
    );
};

export const ProfileInfoTab = () => {
    const { user, handleUpdateProfile, updateProfileMutation } = useAuth();

    if (!user) return null;

    return (
        // key={user.updatedAt} forces form to remount with fresh state when user data changes from server
        <ProfileForm
            key={user.updatedAt || user.firstName + user.lastName}
            user={user}
            handleUpdateProfile={handleUpdateProfile}
            isPending={updateProfileMutation.isPending}
        />
    );
};
