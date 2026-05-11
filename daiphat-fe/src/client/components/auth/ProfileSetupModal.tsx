import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../../../stores/useAuthStore";
import { userService } from "../../../admin/pages/authen/services/user.service";
import { useForgotPassword } from "../../../admin/pages/authen/hooks/use-forgot-password";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";

const setupSchema = z.object({
    password: z.string()
        .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
        .refine(val => /^\S*$/.test(val), "Mật khẩu không được chứa khoảng trắng"),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
    phoneNumber: z.string().optional().refine(val => {
        if (!val) return true;
        return /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(val);
    }, "Số điện thoại không đúng định dạng"),
    agreedToTerms: z.boolean().refine(val => val === true, "Bạn phải đồng ý với điều khoản sử dụng")
}).refine((data) => {
    if (!data.password) return true;
    return data.password === data.confirmPassword;
}, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
});

type SetupFormData = z.infer<typeof setupSchema>;

export const ProfileSetupModal: React.FC = () => {
    const { user, set, isProfileSetupModalOpen, closeAuthModals } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    
    const queryClient = useQueryClient();
    const { usePasswordPolicy } = useForgotPassword();
    const { data: passwordPolicy } = usePasswordPolicy();

    const { register, handleSubmit, watch, formState: { errors } } = useForm<SetupFormData>({
        resolver: zodResolver(setupSchema),
        defaultValues: {
            agreedToTerms: user?.agreedToTerms || false,
            phoneNumber: user?.phone || (user as any)?.phoneNumber || ""
        }
    });

    const passwordValue = watch("password");
    const isEditingPassword = passwordValue && passwordValue.length > 0;

    const onSubmit = async (data: SetupFormData) => {
        setIsSubmitting(true);
        try {
            const response = await userService.setupProfile({
                password: data.password,
                phoneNumber: data.phoneNumber,
                agreedToTerms: data.agreedToTerms
            });

            if (response.isSuccess || response.code === "SUCCESS") {
                toast.success("Thiết lập hồ sơ thành công!");
                
                // Refresh profile data
                await queryClient.invalidateQueries({ queryKey: ["client-me"] });
                await queryClient.invalidateQueries({ queryKey: ["admin-me"] });

                if (user) {
                    set({ 
                        user: { 
                            ...user, 
                            hasPassword: !!data.password || user.hasPassword, 
                            agreedToTerms: true,
                            phone: data.phoneNumber 
                        } 
                    });
                }
                closeAuthModals();
            } else {
                toast.error(response.message || "Có lỗi xảy ra khi cập nhật hồ sơ.");
            }
        } catch (error: any) {
            console.error("Setup profile error:", error);
            const errorMessage = error?.response?.data?.message || "Không thể kết nối đến máy chủ.";
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isProfileSetupModalOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-md"
                    onClick={() => {}} // Block clicking outside to close for mandatory setup
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[96vh] sm:max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="px-6 sm:px-8 pt-8 sm:pt-10 pb-5 sm:pb-6 text-center overflow-y-auto">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#FF6262]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-inner">
                            <CheckCircle2 className="text-[#FF6262]" size={28} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-[#102937] tracking-tight">Hoàn tất hồ sơ</h2>
                        <p className="text-slate-500 mt-1 sm:mt-2 font-medium text-xs sm:text-base leading-relaxed">
                            Chào mừng {user?.firstName}! Bổ sung thông tin để bắt đầu trải nghiệm
                        </p>
                    </div>

                    {/* Form container to allow scrolling of form fields on very small screens */}
                    <div className="overflow-y-auto flex-1 scrollbar-hide">
                        <form onSubmit={handleSubmit(onSubmit)} className="px-6 sm:px-8 pb-10 space-y-4 sm:space-y-5">
                        {/* Phone Number - Only show if not exists */}
                        {!(user?.phone || (user as any)?.phoneNumber) && (
                            <div className="flex flex-col gap-1.5 focus-within:z-10">
                                <label className="text-[13px] font-black uppercase tracking-wider text-slate-400 ml-1">Số điện thoại</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6262] transition-colors">
                                        <Phone size={18} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        {...register("phoneNumber")}
                                        type="text"
                                        placeholder="0912 345 678"
                                        className={`w-full h-11 pl-12 pr-5 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium outline-none transition-all ${
                                            errors.phoneNumber ? "border-[#FF6262]/50 focus:border-[#FF6262]" : "focus:bg-white focus:border-[#FF6262] focus:shadow-md"
                                        }`}
                                    />
                                </div>
                                {errors.phoneNumber && (
                                    <p className="text-[#FF6262] text-[11.5px] font-bold mt-1 ml-1">{errors.phoneNumber.message}</p>
                                )}
                            </div>
                        )}

                        {/* Password Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5 focus-within:z-10">
                                <label className="text-[13px] font-black uppercase tracking-wider text-slate-400 ml-1">Mật khẩu mới</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6262] transition-colors">
                                        <Lock size={18} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        {...register("password")}
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Tối thiểu 8 ký tự"
                                        onFocus={() => setIsPasswordFocused(true)}
                                        onBlur={() => setIsPasswordFocused(false)}
                                        className={`w-full h-11 pl-11 pr-10 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium outline-none transition-all ${
                                            errors.password ? "border-[#FF6262]/50 focus:border-[#FF6262]" : "focus:bg-white focus:border-[#FF6262] focus:shadow-md"
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#102937] transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={`text-[13px] font-black uppercase tracking-wider ml-1 transition-colors ${isEditingPassword ? "text-slate-400" : "text-slate-300"}`}>
                                    Xác nhận
                                </label>
                                <div className="relative group">
                                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isEditingPassword ? "text-slate-400 group-focus-within:text-[#FF6262]" : "text-slate-300"}`}>
                                        <Lock size={18} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        {...register("confirmPassword")}
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Nhập lại mật khẩu"
                                        disabled={!isEditingPassword}
                                        className={`w-full h-11 pl-11 pr-10 rounded-xl text-[14px] font-medium transition-all outline-none border ${
                                            !isEditingPassword 
                                                ? "bg-slate-50 border-slate-50 cursor-not-allowed opacity-40" 
                                                : errors.confirmPassword 
                                                    ? "bg-slate-50 border-[#FF6262]/50 focus:border-[#FF6262]" 
                                                    : "bg-slate-50 border-slate-100 focus:bg-white focus:border-[#FF6262] focus:shadow-md"
                                        }`}
                                    />
                                    {isEditingPassword && (
                                        <button
                                            type="button"
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#102937] transition-colors"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Password Rules checklist from Backend */}
                        {passwordPolicy && (
                            <div className="px-1">
                                <PasswordStrengthMeter 
                                    password={passwordValue} 
                                    policy={passwordPolicy} 
                                    isFocused={isPasswordFocused}
                                />
                            </div>
                        )}
                        
                        {errors.confirmPassword && isEditingPassword && (
                            <p className="text-[#FF6262] text-[11.5px] font-bold mt-1 ml-1">{errors.confirmPassword.message}</p>
                        )}

                        {/* Terms - Only show if user hasn't agreed yet */}
                        {!user?.agreedToTerms && (
                            <div className="mt-3">
                                <label className="flex items-start gap-4 cursor-pointer group select-none">
                                    <div className="relative mt-0.5">
                                        <input
                                            {...register("agreedToTerms")}
                                            type="checkbox"
                                            className="sr-only"
                                        />
                                        <motion.div
                                            initial={false}
                                            animate={{
                                                backgroundColor: watch("agreedToTerms") ? "#FF6262" : "#f8fafc",
                                                borderColor: watch("agreedToTerms") ? "#FF6262" : "#e2e8f0"
                                            }}
                                            transition={{ duration: 0.2 }}
                                            className="w-5 h-5 border-2 rounded-md flex items-center justify-center shadow-sm group-hover:border-[#FF6262]/50 transition-colors"
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                className="w-3.5 h-3.5 text-white"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <motion.path
                                                    d="M20 6L9 17L4 12"
                                                    initial={false}
                                                    animate={{ pathLength: watch("agreedToTerms") ? 1 : 0 }}
                                                    transition={{ 
                                                        type: "spring", 
                                                        stiffness: 300, 
                                                        damping: 20 
                                                    }}
                                                />
                                            </svg>
                                        </motion.div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-500 leading-snug pt-0.5">
                                        Tôi đồng ý với <span className="text-[#FF6262] hover:underline cursor-pointer">điều khoản sử dụng</span> & chính sách bảo mật của Đại Phát.
                                    </span>
                                </label>
                                <AnimatePresence>
                                    {errors.agreedToTerms && (
                                        <motion.p 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="text-[#FF6262] text-[11.5px] font-bold mt-2 ml-1"
                                        >
                                            {errors.agreedToTerms.message}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-[#FF6262] text-white font-black text-lg rounded-xl shadow-lg shadow-[#FF6262]/26 transition-all hover:scale-[1.01] hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-6"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang xử lý...</span>
                                </div>
                            ) : (
                                "Hoàn tất thiết lập"
                            )}
                        </button>
                    </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
