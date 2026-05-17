import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useForgotPassword } from "../../../admin/pages/authen/hooks/use-forgot-password";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { GoogleIcon, VisualPanelContent, AuthBranding } from "./SharedAuth";

import { UseFormReturn } from "react-hook-form";
import { RegisterFormValues } from "../../../client/types/auth.schema";
import { AppToast } from "../../utils/toast.util";

interface RegisterContentProps {
    onSwitchToLogin?: () => void;
    registerForm: UseFormReturn<RegisterFormValues>;
    handleRegister: (e?: React.BaseSyntheticEvent) => Promise<void>;
    isPending: boolean;
}

export const RegisterContent = ({ onSwitchToLogin, registerForm, handleRegister: submit, isPending }: RegisterContentProps) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const { usePasswordPolicy } = useForgotPassword();
    const { data: passwordPolicy } = usePasswordPolicy();

    const {
        register,
        formState: { errors },
        watch,
    } = registerForm;

    const passwordValue = watch("password");

    return (
        <div className="flex flex-col w-full p-5 sm:p-7 xl:p-8">
            <div className="mb-3 sm:mb-4 text-center xl:text-left">
                <h1 className="font-client-display text-2xl sm:text-3xl xl:text-4xl font-black text-[#102937] m-0 tracking-tight">Đăng ký tài khoản</h1>
                <p className="mt-0.5 text-slate-500 font-medium text-xs sm:text-sm">Bắt đầu hành trình may mắn cùng chúng tôi</p>
            </div>

            <form className="flex flex-col gap-2.5 sm:gap-3" onSubmit={submit} noValidate>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="username" className="text-[13px] font-black uppercase tracking-wider text-slate-500 ml-1">Tên đăng nhập</label>
                    <input
                        id="username"
                        type="text"
                        placeholder="username123"
                        disabled={isPending}
                        autoComplete="username"
                        className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium transition-all focus:bg-white focus:border-[#FF6262] focus:shadow-md outline-none"
                        {...register("username")}
                    />
                    {errors.username && <p className="text-[#FF6262] text-[12px] font-bold mt-1 ml-1">{errors.username.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="lastName" className="text-[13px] font-black uppercase tracking-wider text-slate-500 ml-1">Họ</label>
                        <input
                            id="lastName"
                            type="text"
                            placeholder="Nguyễn"
                            disabled={isPending}
                            className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium transition-all focus:bg-white focus:border-[#FF6262] focus:shadow-md outline-none"
                            {...register("lastName")}
                        />
                        {errors.lastName && <p className="text-[#FF6262] text-[13px] font-bold mt-1 ml-1">{errors.lastName.message}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="firstName" className="text-[13px] font-black uppercase tracking-wider text-slate-500 ml-1">Tên</label>
                        <input
                            id="firstName"
                            type="text"
                            placeholder="Văn A"
                            disabled={isPending}
                            className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium transition-all focus:bg-white focus:border-[#FF6262] focus:shadow-md outline-none"
                            {...register("firstName")}
                        />
                        {errors.firstName && <p className="text-[#FF6262] text-[13px] font-bold mt-1 ml-1">{errors.firstName.message}</p>}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-[13px] font-black uppercase tracking-wider text-slate-500 ml-1">Email</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="mail@website.com"
                        disabled={isPending}
                        autoComplete="email"
                        className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium transition-all focus:bg-white focus:border-[#FF6262] focus:shadow-md outline-none"
                        {...register("email")}
                    />
                    {errors.email && <p className="text-[#FF6262] text-[12px] font-bold mt-1 ml-1">{errors.email.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5 focus-within:z-10">
                    <label htmlFor="phone" className="text-[13px] font-black uppercase tracking-wider text-slate-500 ml-1">Số điện thoại</label>
                    <input
                        id="phone"
                        type="tel"
                        placeholder="0912345678"
                        disabled={isPending}
                        autoComplete="tel"
                        className="h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium transition-all focus:bg-white focus:border-[#FF6262] focus:shadow-md outline-none"
                        {...register("phone")}
                    />
                    {errors.phone && <p className="text-[#FF6262] text-[12px] font-bold mt-1 ml-1">{errors.phone.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className="text-[13px] font-black uppercase tracking-wider text-slate-500 ml-1">Mật khẩu</label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Nhập mật khẩu"
                                disabled={isPending}
                                autoComplete="new-password"
                                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium transition-all focus:bg-white focus:border-[#FF6262] focus:shadow-md outline-none"
                                {...register("password")}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => setIsPasswordFocused(false)}
                            />
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#102937] transition-colors cursor-pointer"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>
                        {errors.password && <p className="text-[#FF6262] text-[13px] font-bold mt-1 ml-1">{errors.password.message}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="confirmPassword" className="text-[13px] font-black uppercase tracking-wider text-slate-500 ml-1">Xác nhận</label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Nhập lại mật khẩu"
                                disabled={isPending}
                                autoComplete="new-password"
                                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium transition-all focus:bg-white focus:border-[#FF6262] focus:shadow-md outline-none"
                                {...register("confirmPassword")}
                            />
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#102937] transition-colors cursor-pointer"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            >
                                {showConfirmPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && <p className="text-[#FF6262] text-[13px] font-bold mt-1 ml-1">{errors.confirmPassword.message}</p>}
                    </div>
                </div>

                {isPasswordFocused && passwordPolicy && (
                    <PasswordStrengthMeter 
                        password={passwordValue} 
                        policy={passwordPolicy} 
                        isFocused={isPasswordFocused}
                    />
                )}

                <div className="mt-2.5">
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
                        <span className="text-[13px] font-bold text-slate-600 leading-snug pt-0.5">
                            Tôi đồng ý với <span className="text-[#FF6262] hover:underline cursor-pointer">điều khoản sử dụng</span> & chính sách bảo mật của Đại Phát.
                        </span>
                    </label>
                    <AnimatePresence>
                        {errors.agreedToTerms && (
                            <motion.p 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-[#FF6262] text-[13px] font-bold mt-2 ml-1"
                            >
                                {errors.agreedToTerms.message}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                <button type="submit" className="h-11 mt-4 bg-[#FF6262] text-white font-black text-md rounded-xl shadow-lg shadow-[#FF6262]/26 transition-all hover:scale-[1.01] hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer" disabled={isPending}>
                    {isPending ? "Đang đăng ký..." : "Tạo tài khoản ngay"}
                </button>
            </form>

            <div className="flex items-center gap-4 my-2.5 sm:my-3">
                <span className="flex-1 h-px bg-slate-100"></span>
                <p className="m-0 text-slate-400 text-[13px] font-black uppercase tracking-widest">Hoặc</p>
                <span className="flex-1 h-px bg-slate-100"></span>
            </div>

            <button type="button" className="h-11 flex items-center justify-center gap-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-[#102937] text-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 cursor-pointer" disabled={isPending}>
                <GoogleIcon />
                Đăng ký với Google
            </button>

            <p className="mt-3 pb-5 text-center text-slate-500 font-bold text-sm">
                Đã có tài khoản?{" "}
                <a href="#" onClick={(e) => { 
                    e.preventDefault(); 
                    onSwitchToLogin?.(); 
                }} className="text-[#FF6262] hover:underline">
                    Đăng nhập
                </a>
            </p>
        </div>
    );
};

export const RegisterModal = () => {
    const { isRegisterModalOpen, closeAuthModals, openLoginModal } = useAuthStore();
    const { 
        registerForm, 
        handleRegister, 
        registerMutation: { isPending } 
    } = useAuth();

    const { isDirty } = registerForm.formState;

    const handleCloseWithConfirm = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        
        if (isDirty) {
            const confirmClose = await AppToast.confirm("Bạn có chắc chắn muốn thoát? Các thông tin đã điền sẽ bị mất.");
            if (!confirmClose) return;
        }
        closeAuthModals();
    };

    const handleSwitchToLogin = async () => {
        if (isDirty) {
            const confirmSwitch = await AppToast.confirm("Bạn có chắc chắn muốn rời đi? Các thông tin đã điền sẽ bị mất.");
            if (!confirmSwitch) return;
        }
        openLoginModal();
    };

    useEffect(() => {
        if (isRegisterModalOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "unset";
        return () => { document.body.style.overflow = "unset"; };
    }, [isRegisterModalOpen]);

    if (!isRegisterModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-md transition-all" onClick={() => handleCloseWithConfirm()}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-white rounded-3xl shadow-2xl overflow-hidden max-w-[1020px] w-full max-h-[96vh] sm:max-h-[85vh] flex flex-col pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                  className="absolute top-5 right-5 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 text-[#102937] hover:bg-black/10 transition-colors cursor-pointer" 
                  onClick={handleCloseWithConfirm}
                  aria-label="Đóng"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div className="flex flex-col xl:flex-row flex-1 min-h-0 items-stretch overflow-hidden">
                    <div className="w-full xl:w-[54%] bg-white overflow-y-auto scrollbar-hide border-r border-slate-50 flex-1 min-h-0">
                        <RegisterContent 
                            onSwitchToLogin={handleSwitchToLogin} 
                            registerForm={registerForm}
                            handleRegister={handleRegister}
                            isPending={isPending}
                        />
                    </div>
                    <div className="hidden xl:flex w-[46%] bg-[#102937] flex-shrink-0 items-stretch overflow-hidden">
                        <VisualPanelContent />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
