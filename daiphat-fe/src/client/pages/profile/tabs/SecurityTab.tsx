import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { authService } from "../../../../admin/pages/authen/services/auth.service";
import { PasswordPolicy } from "../../../../admin/pages/authen/types/auth.type";
import { PasswordStrengthMeter } from "../../../components/auth/PasswordStrengthMeter";

export const SecurityTab = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);

    const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const response = await authService.getPasswordPolicy();
                if (response.isSuccess && response.data) {
                    setPasswordPolicy(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch password policy", error);
            }
        };
        fetchPolicy();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Vui lòng điền đầy đủ các trường mật khẩu.");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu nhập lại không khớp.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Note: We'd need an endpoint for changing password for a logged-in user.
            // authService.changePassword({ oldPassword, newPassword })
            await new Promise(resolve => setTimeout(resolve, 800));
            toast.info("Tính năng đổi mật khẩu sẽ sớm ra mắt!");
            
            // Clear fields on success (simulated)
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Không thể cập nhật mật khẩu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h3 className="text-xl font-bold text-[#102937]">Bảo mật tài khoản</h3>
                <p className="text-sm text-[#505050] mt-1">Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {/* Current Password */}
                <div>
                    <label className="block text-sm font-bold text-[#102937] mb-2">Mật khẩu hiện tại</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                        </div>
                        <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full pl-11 pr-12 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#FF6262] focus:ring-2 focus:ring-[#FF6262]/20 outline-none transition-all text-[#17191F] font-medium"
                            placeholder="Nhập mật khẩu hiện tại"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#102937] cursor-pointer"
                        >
                            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="w-full h-[1px] bg-slate-100 my-6"></div>

                {/* New Password */}
                <div>
                    <label className="block text-sm font-bold text-[#102937] mb-2">Mật khẩu mới</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                        </div>
                        <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            onFocus={() => setIsNewPasswordFocused(true)}
                            onBlur={() => setIsNewPasswordFocused(false)}
                            className="w-full pl-11 pr-12 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#FF6262] focus:ring-2 focus:ring-[#FF6262]/20 outline-none transition-all text-[#17191F] font-medium"
                            placeholder="Nhập mật khẩu mới"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#102937] cursor-pointer"
                        >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {isNewPasswordFocused && newPassword.length > 0 && (
                        <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100 transition-all">
                            <PasswordStrengthMeter password={newPassword} />
                            
                            {passwordPolicy && (
                                <ul className="mt-4 space-y-2">
                                    {passwordPolicy.requirements.map((req) => {
                                        const isMet = new RegExp(req.regex).test(newPassword);
                                        return (
                                            <li key={req.id} className="flex items-center gap-2 text-[13px]">
                                                <CheckCircle2 
                                                    size={14} 
                                                    className={`transition-colors ${isMet ? 'text-emerald-500' : 'text-slate-300'}`} 
                                                />
                                                <span className={`${isMet ? 'text-slate-600' : 'text-slate-500'}`}>
                                                    {req.description}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* Confirm New Password */}
                <div>
                    <label className="block text-sm font-bold text-[#102937] mb-2">Xác nhận mật khẩu mới</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                        </div>
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full pl-11 pr-12 h-12 bg-slate-50 border ${confirmPassword && confirmPassword !== newPassword ? 'border-red-400 focus:ring-red-400/20' : 'border-slate-200 focus:border-[#FF6262] focus:ring-[#FF6262]/20'} rounded-xl focus:ring-2 outline-none transition-all text-[#17191F] font-medium`}
                            placeholder="Nhập lại mật khẩu mới"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#102937] cursor-pointer"
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                        className="h-12 px-8 bg-[#FF6262] text-white font-bold rounded-xl shadow-lg shadow-[#FF6262]/26 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                    </button>
                </div>
            </form>
        </div>
    );
};
