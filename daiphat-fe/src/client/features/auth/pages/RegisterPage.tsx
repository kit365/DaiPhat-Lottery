"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Lock, Eye, EyeOff, Mail, User } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { GoogleIcon, AuthBranding } from "../../../components/auth/SharedAuth";
import { PasswordStrengthMeter } from "../../../components/auth/PasswordStrengthMeter";
import { useForgotPassword } from "@/shared/auth/hooks/useForgotPassword";
import { redirectToGoogleOAuth } from "../../../utils/google-oauth.util";
import { SiteLogo } from "../../../components/layout/SiteLogo";

export const RegisterPage = () => {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const { usePasswordPolicy } = useForgotPassword();
    const { data: passwordPolicy } = usePasswordPolicy();

    const { 
        registerForm: { register, formState: { errors }, watch, handleSubmit }, 
        handleRegister: submit, 
        registerMutation: { isPending },
        isAuthenticated,
    } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            router.replace("/");
        }
    }, [isAuthenticated, router]);

    if (isAuthenticated) {
        return null;
    }

    const passwordValue = watch("password");

    const handleGoogleLogin = async () => {
        await redirectToGoogleOAuth();
    };

    return (
        <div className="min-h-[100dvh] w-full relative flex flex-col font-client-main bg-[#FFFBF5] overflow-x-hidden">
            {/* Background Image */}
            <div className="fixed inset-0 z-0">
                <img 
                    src="https://i.imgur.com/ubrNhdc.png" 
                    alt="Background" 
                    className="w-full h-full object-cover object-center"
                />
            </div>

            {/* Main Content Overlay */}
            <div className="relative z-10 flex-1 flex flex-col lg:flex-row w-full max-w-[1440px] mx-auto min-h-[100dvh]">
                
                {/* Header Logo (Mobile & Desktop) */}
                <div className="lg:absolute lg:top-8 lg:left-12 flex items-center gap-3 cursor-pointer z-20 font-client-display transition-transform hover:scale-[1.02] pt-6 pl-6 lg:p-0 shrink-0" onClick={() => router.push("/")}>
                    <div className="relative p-[2px] bg-gradient-to-tr from-[#ee1314] to-[#F59E0B] rounded-xl shadow-md shadow-[#ee1314]/10">
                        <SiteLogo
                            className="w-[38px] h-[38px] lg:w-[44px] lg:h-[44px] rounded-[10px]"
                            imgClassName="w-full h-full rounded-[10px] object-contain bg-white"
                            alt="Đại Phát Logo"
                        />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-[20px] lg:text-[22px] tracking-tight font-client-display font-black text-[#ee1314] leading-none mb-1">ĐẠI PHÁT</span>
                        <span className="text-[8.5px] lg:text-[9.5px] font-bold text-[#F59E0B] leading-none uppercase tracking-wider whitespace-nowrap">Tài lộc - May mắn - Thịnh vượng</span>
                    </div>
                    <div className="hidden">
                        <AuthBranding onClick={() => router.push("/")} />
                    </div>
                </div>

                {/* Left Side: Empty */}
                <div className="hidden lg:flex w-1/2"></div>

                {/* Right Side: Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-8 lg:py-0 flex-1">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-[420px] xl:max-w-[460px] bg-white rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] max-h-[90vh] overflow-y-auto scrollbar-hide"
                    >
                        <div className="mb-4 xl:mb-5">
                            <h2 className="text-[22px] xl:text-[26px] font-bold text-[#1A1A1A] mb-1 font-client-main tracking-tight">Đăng ký</h2>
                            <p className="text-[#666666] text-[13px] xl:text-[14px] leading-tight xl:leading-normal">
                                Tạo tài khoản mới để bắt đầu trải nghiệm.
                            </p>
                        </div>

                        <form className="flex flex-col gap-2.5 xl:gap-3" onSubmit={submit} noValidate>
                            {/* Username */}
                            <div className="flex flex-col gap-1 xl:gap-1.5">
                                <label htmlFor="username" className="text-[12px] xl:text-[13px] font-semibold text-[#333333]">Tên đăng nhập</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-[#999999]">
                                        <User size={16} strokeWidth={2} />
                                    </div>
                                    <input
                                        id="username"
                                        type="text"
                                        placeholder="Nhập tên đăng nhập"
                                        disabled={isPending}
                                        className="w-full h-[44px] xl:h-[48px] pl-10 pr-4 bg-white border border-[#E0E0E0] rounded-xl text-[13px] xl:text-[14px] text-[#333333] placeholder:text-[#999999] focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                                        {...register("username")}
                                    />
                                </div>
                                {errors.username && <p className="text-[#D32F2F] text-[11px] mt-0.5">{errors.username.message}</p>}
                            </div>

                            {/* Name row */}
                            <div className="grid grid-cols-2 gap-2 xl:gap-3">
                                <div className="flex flex-col gap-1 xl:gap-1.5">
                                    <label htmlFor="lastName" className="text-[12px] xl:text-[13px] font-semibold text-[#333333]">Họ</label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        placeholder="Nguyễn"
                                        disabled={isPending}
                                        className="w-full h-[44px] xl:h-[48px] px-3 xl:px-4 bg-white border border-[#E0E0E0] rounded-xl text-[13px] xl:text-[14px] text-[#333333] placeholder:text-[#999999] focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                                        {...register("lastName")}
                                    />
                                    {errors.lastName && <p className="text-[#D32F2F] text-[11px] mt-0.5">{errors.lastName.message}</p>}
                                </div>
                                <div className="flex flex-col gap-1 xl:gap-1.5">
                                    <label htmlFor="firstName" className="text-[12px] xl:text-[13px] font-semibold text-[#333333]">Tên</label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        placeholder="Văn A"
                                        disabled={isPending}
                                        className="w-full h-[44px] xl:h-[48px] px-3 xl:px-4 bg-white border border-[#E0E0E0] rounded-xl text-[13px] xl:text-[14px] text-[#333333] placeholder:text-[#999999] focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                                        {...register("firstName")}
                                    />
                                    {errors.firstName && <p className="text-[#D32F2F] text-[11px] mt-0.5">{errors.firstName.message}</p>}
                                </div>
                            </div>

                            {/* Email & Phone row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 xl:gap-3">
                                <div className="flex flex-col gap-1 xl:gap-1.5">
                                    <label htmlFor="email" className="text-[12px] xl:text-[13px] font-semibold text-[#333333]">Email</label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3 text-[#999999]">
                                            <Mail size={16} strokeWidth={2} />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="mail@website.com"
                                            disabled={isPending}
                                            className="w-full h-[44px] xl:h-[48px] pl-9 pr-3 bg-white border border-[#E0E0E0] rounded-xl text-[13px] xl:text-[14px] text-[#333333] placeholder:text-[#999999] focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                                            {...register("email")}
                                        />
                                    </div>
                                    {errors.email && <p className="text-[#D32F2F] text-[11px] mt-0.5">{errors.email.message}</p>}
                                </div>
                                <div className="flex flex-col gap-1 xl:gap-1.5">
                                    <label htmlFor="phone" className="text-[12px] xl:text-[13px] font-semibold text-[#333333]">Số điện thoại</label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-3 text-[#999999]">
                                            <Phone size={16} strokeWidth={2} />
                                        </div>
                                        <input
                                            id="phone"
                                            type="tel"
                                            placeholder="0912345678"
                                            disabled={isPending}
                                            className="w-full h-[44px] xl:h-[48px] pl-9 pr-3 bg-white border border-[#E0E0E0] rounded-xl text-[13px] xl:text-[14px] text-[#333333] placeholder:text-[#999999] focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                                            {...register("phone")}
                                        />
                                    </div>
                                    {errors.phone && <p className="text-[#D32F2F] text-[11px] mt-0.5">{errors.phone.message}</p>}
                                </div>
                            </div>

                            {/* Passwords row */}
                            <div className="grid grid-cols-2 gap-2 xl:gap-3">
                                <div className="flex flex-col gap-1 xl:gap-1.5">
                                    <label htmlFor="password" className="text-[12px] xl:text-[13px] font-semibold text-[#333333]">Mật khẩu</label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 text-[#999999]">
                                            <Lock size={16} strokeWidth={2} />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Nhập MK"
                                            disabled={isPending}
                                            className="w-full h-[44px] xl:h-[48px] pl-10 pr-10 bg-white border border-[#E0E0E0] rounded-xl text-[13px] xl:text-[14px] text-[#333333] placeholder:text-[#999999] focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                                            {...register("password")}
                                            onFocus={() => setIsPasswordFocused(true)}
                                            onBlur={() => setIsPasswordFocused(false)}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 text-[#999999] hover:text-[#333333] transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-[#D32F2F] text-[11px] mt-0.5">{errors.password.message}</p>}
                                </div>
                                <div className="flex flex-col gap-1 xl:gap-1.5">
                                    <label htmlFor="confirmPassword" className="text-[12px] xl:text-[13px] font-semibold text-[#333333]">Xác nhận mật khẩu</label>
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 text-[#999999]">
                                            <Lock size={16} strokeWidth={2} />
                                        </div>
                                        <input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Nhập lại MK"
                                            disabled={isPending}
                                            className="w-full h-[44px] xl:h-[48px] pl-10 pr-10 bg-white border border-[#E0E0E0] rounded-xl text-[13px] xl:text-[14px] text-[#333333] placeholder:text-[#999999] focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                                            {...register("confirmPassword")}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 text-[#999999] hover:text-[#333333] transition-colors"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <p className="text-[#D32F2F] text-[11px] mt-0.5">{errors.confirmPassword.message}</p>}
                                </div>
                            </div>

                            {isPasswordFocused && passwordPolicy && (
                                <div className="mt-[-2px]">
                                    <PasswordStrengthMeter 
                                        password={passwordValue} 
                                        policy={passwordPolicy} 
                                        isFocused={isPasswordFocused}
                                    />
                                </div>
                            )}

                            {/* Terms */}
                            <div className="mt-1">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        {...register("agreedToTerms")}
                                        className="w-4 h-4 border-[#E0E0E0] rounded accent-[#D32F2F] cursor-pointer shrink-0" 
                                    />
                                    <span className="text-[12px] text-[#666666] leading-snug">
                                        Tôi đồng ý với <span className="text-[#D32F2F] hover:underline cursor-pointer">điều khoản sử dụng</span> & chính sách bảo mật của Đại Phát.
                                    </span>
                                </label>
                                {errors.agreedToTerms && <p className="text-[#D32F2F] text-[11px] mt-1">{errors.agreedToTerms.message}</p>}
                            </div>

                            {/* Submit Button */}
                            <button 
                                type="submit" 
                                className="w-full h-[44px] xl:h-[48px] mt-1 flex items-center justify-center bg-[#D32F2F] text-white rounded-xl font-bold text-[14px] xl:text-[15px] transition-all hover:bg-[#B71C1C] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    "Đăng ký"
                                )}
                            </button>
                        </form>

                        {/* Footer Text */}
                        <div className="mt-4 xl:mt-6 text-center">
                            <p className="text-[#666666] text-[13px] xl:text-[14px]">
                                Đã có tài khoản?{" "}
                                <button 
                                    onClick={() => router.push("/login")}
                                    className="text-[#D32F2F] font-bold hover:underline cursor-pointer"
                                >
                                    Đăng nhập
                                </button>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
