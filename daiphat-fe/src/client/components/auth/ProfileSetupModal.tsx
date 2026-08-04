"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Lock, CheckCircle2, Eye, EyeOff, ShieldCheck, User } from "lucide-react";
import { useAuthStore } from "../../../stores/useAuthStore";
import { userService } from "../../../admin/pages/authen/services/user.service";
import { useForgotPassword } from "../../../admin/pages/authen/hooks/use-forgot-password";
import { AppToast as toast } from "../../../utils/toast.util";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "../ui/Checkbox";

// Type for form data
type SetupFormData = {
    password: string;
    confirmPassword: string;
    phoneNumber?: string;
    agreedToTerms: boolean;
};

export const ProfileSetupModal: React.FC = () => {
    const { user, set, isProfileSetupModalOpen, closeAuthModals } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const queryClient = useQueryClient();
    const { usePasswordPolicy } = useForgotPassword();
    const { data: passwordPolicy } = usePasswordPolicy();

    // Create dynamic schema based on backend policy
    const setupSchema = React.useMemo(() => {
        return z.object({
            password: z.string()
                .min(passwordPolicy?.minLength || 6, `Mật khẩu phải có ít nhất ${passwordPolicy?.minLength || 6} ký tự`)
                .max(passwordPolicy?.maxLength || 100, `Mật khẩu tối đa ${passwordPolicy?.maxLength || 100} ký tự`)
                .refine(val => /^\S*$/.test(val), "Mật khẩu không được chứa khoảng trắng")
                .superRefine((val, ctx) => {
                    if (passwordPolicy?.requirements) {
                        passwordPolicy.requirements.forEach(req => {
                            if (req.regex && !new RegExp(req.regex).test(val)) {
                                ctx.addIssue({
                                    code: z.ZodIssueCode.custom,
                                    message: req.description,
                                });
                            }
                        });
                    }
                }),
            confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
            phoneNumber: z.string().optional().refine(val => {
                if (!val) return true;
                return /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(val);
            }, "Số điện thoại không đúng định dạng"),
            agreedToTerms: z.boolean().refine(val => val === true, "Bạn phải đồng ý với điều khoản sử dụng")
        }).refine((data) => {
            if (!data.password && !data.confirmPassword) return true;
            return data.password === data.confirmPassword;
        }, {
            message: "Mật khẩu nhập lại không khớp",
            path: ["confirmPassword"],
        });
    }, [passwordPolicy]);

    const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<SetupFormData>({
        resolver: zodResolver(setupSchema),
        defaultValues: {
            agreedToTerms: !!user?.agreedToTerms,
            phoneNumber: user?.phone || user?.phoneNumber || ""
        }
    });

    // Sync form with user data when it loads
    React.useEffect(() => {
        if (user && isProfileSetupModalOpen) {
            reset({
                agreedToTerms: !!user.agreedToTerms,
                phoneNumber: user.phone || user.phoneNumber || ""
            });
        }
    }, [user, isProfileSetupModalOpen, reset]);

    const onSubmit = async (data: SetupFormData) => {
        setIsSubmitting(true);
        try {
            const response = await userService.setupProfile({
                password: data.password,
                phoneNumber: data.phoneNumber,
                agreedToTerms: data.agreedToTerms
            });

            if (response.isSuccess) {
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
                    className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm"
                    onClick={() => {}} // Block clicking outside to close for mandatory setup
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-[460px] bg-white rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col"
                >
                    {/* Close button */}
                    <button 
                        onClick={closeAuthModals}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>

                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="relative w-24 h-24 mx-auto mb-4">
                            {/* Decorative background lines (fireworks mockup) */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                <svg width="100%" height="100%" viewBox="0 0 100 100">
                                    <path d="M50 10 L50 20 M50 80 L50 90 M10 50 L20 50 M80 50 L90 50 M22 22 L29 29 M71 71 L78 78 M22 78 L29 71 M71 22 L78 29" stroke="#ee1314" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                            
                            {/* The circle and user icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-[#FFF0F0] rounded-full flex items-center justify-center">
                                    <User className="text-[#ee1314]" size={32} strokeWidth={2.5} fill="#ee1314" />
                                </div>
                            </div>
                            {/* Checkmark badge */}
                            <div className="absolute bottom-2 right-2 bg-white rounded-full p-0.5 shadow-sm">
                                <CheckCircle2 className="text-[#ee1314]" size={20} strokeWidth={2.5} fill="white" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-[#212B36] mb-2">Hoàn tất thông tin tài khoản</h2>
                        <p className="text-[13px] text-slate-500 leading-relaxed max-w-[320px] mx-auto">
                            Vui lòng bổ sung thông tin để bảo mật và sử dụng đầy đủ tính năng
                        </p>
                    </div>

                    {/* Form container */}
                    <form 
                        onSubmit={handleSubmit(
                            onSubmit, 
                            (err) => console.error("Validation Errors:", err)
                        )} 
                        className="space-y-4"
                    >
                        {/* Phone Number */}
                        {!(user?.phone || user?.phoneNumber) && (
                            <div>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Phone size={18} strokeWidth={2} />
                                    </div>
                                    <input
                                        {...register("phoneNumber")}
                                        type="text"
                                        placeholder="Số điện thoại"
                                        className={`w-full h-12 pl-11 pr-4 bg-white border rounded-xl text-[14px] font-medium outline-none transition-all ${
                                            errors.phoneNumber ? "border-red-500" : "border-slate-200 focus:border-[#ee1314] focus:ring-1 focus:ring-[#ee1314]"
                                        }`}
                                    />
                                </div>
                                {errors.phoneNumber && (
                                    <p className="text-red-500 text-[11.5px] mt-1 ml-1 font-medium">{errors.phoneNumber.message}</p>
                                )}
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Lock size={18} strokeWidth={2} />
                                </div>
                                <input
                                    {...register("password")}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Mật khẩu mới"
                                    className={`w-full h-12 pl-11 pr-10 bg-white border rounded-xl text-[14px] font-medium outline-none transition-all ${
                                        errors.password ? "border-red-500" : "border-slate-200 focus:border-[#ee1314] focus:ring-1 focus:ring-[#ee1314]"
                                    }`}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-red-500 text-[11.5px] mt-1 ml-1 font-medium">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Lock size={18} strokeWidth={2} />
                                </div>
                                <input
                                    {...register("confirmPassword")}
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Xác nhận mật khẩu"
                                    className={`w-full h-12 pl-11 pr-10 bg-white border rounded-xl text-[14px] font-medium outline-none transition-all ${
                                        errors.confirmPassword ? "border-red-500" : "border-slate-200 focus:border-[#ee1314] focus:ring-1 focus:ring-[#ee1314]"
                                    }`}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-red-500 text-[11.5px] mt-1 ml-1 font-medium">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        {/* Terms */}
                        <div className="pt-2">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <Checkbox
                                    {...register("agreedToTerms")}
                                    checked={watch("agreedToTerms")}
                                />
                                <span className="text-[13px] text-slate-500 leading-snug whitespace-nowrap">
                                    Tôi đồng ý với <span className="text-[#ee1314] font-medium hover:underline">Điều khoản sử dụng</span> và <span className="text-[#ee1314] font-medium hover:underline">Chính sách bảo mật</span>
                                </span>
                            </label>
                            {errors.agreedToTerms && (
                                <p className="text-red-500 text-[11.5px] mt-1.5 ml-1 font-medium">{errors.agreedToTerms.message}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 mt-6 bg-[#d91d1e] text-white font-bold text-[15px] rounded-xl transition-all hover:bg-[#b91819] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang xử lý...</span>
                                </div>
                            ) : (
                                "Hoàn tất"
                            )}
                        </button>

                        {/* Footer */}
                        <div className="flex items-center justify-center gap-1.5 pt-4 pb-2 text-slate-500 text-[12px]">
                            <ShieldCheck size={14} />
                            <span>Thông tin của bạn được bảo mật tuyệt đối</span>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
