"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ROUTES } from "../../../admin/constants/routes";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../../stores/useAuthStore";
import { GoogleIcon, VisualPanelContent, AuthBranding } from "./SharedAuth";
import { redirectToGoogleOAuth } from "../../utils/google-oauth.util";

export const LoginContent = ({ onSwitchToRegister }: { onSwitchToRegister?: () => void }) => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const {
        loginForm: {
            register,
            formState: { errors },
        },
        handleLogin: submit,
        loginMutation: { isPending },
        pendingVerificationIdentifier,
        resendVerificationEmail,
        resendVerificationMutation: { isPending: isResendingVerification },
    } = useAuth();
    const { closeAuthModals } = useAuthStore();

    const handleGoogleLogin = async () => {
        await redirectToGoogleOAuth();
    };

    return (
        <div className="flex flex-col w-full p-6 sm:p-8 xl:p-10">
            <div className="mb-4 sm:mb-6 text-center xl:text-left">
                <h1 className="font-client-display text-3xl xl:text-4xl font-black text-[#102937] m-0 tracking-tight">Đăng nhập</h1>
                <p className="mt-2 text-slate-500 font-medium text-sm">Chào mừng bạn quay trở lại với Đại Phát</p>
            </div>

            <form className="flex flex-col gap-4 sm:gap-5" onSubmit={submit} noValidate>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="username" className="text-[13px] font-black uppercase tracking-wider text-slate-400 ml-1">Email hoặc Tên đăng nhập</label>
                    <input
                        id="username"
                        type="text"
                        placeholder="Email hoặc tên đăng nhập"
                        disabled={isPending}
                        autoComplete="username"
                        className="h-11 px-5 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium transition-all focus:bg-white focus:border-[#FF6262] focus:shadow-md outline-none"
                        {...register("username")}
                    />
                    {errors.username && <p className="text-[#FF6262] text-[11.5px] font-bold mt-1 ml-1">{errors.username.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-[13px] font-black uppercase tracking-wider text-slate-400 ml-1">Mật khẩu</label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Nhập mật khẩu"
                            disabled={isPending}
                            autoComplete="current-password"
                            className="w-full h-11 px-5 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium transition-all focus:bg-white focus:border-[#FF6262] focus:shadow-md outline-none"
                            {...register("password")}
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
                    {errors.password && <p className="text-[#FF6262] text-[11.5px] font-bold mt-1 ml-1">{errors.password.message}</p>}
                </div>

                {pendingVerificationIdentifier && (
                    <div className="rounded-xl border border-[#FFE1E1] bg-[#FFF7F7] px-4 py-3 text-[13px] text-[#7A1D1D]">
                        <p className="font-bold">Email tài khoản này chưa được xác thực.</p>
                        <button
                            type="button"
                            onClick={() => resendVerificationEmail(pendingVerificationIdentifier)}
                            disabled={isResendingVerification}
                            className="mt-2 font-black text-[#FF6262] hover:underline disabled:opacity-60"
                        >
                            {isResendingVerification ? "Đang gửi lại..." : "Gửi lại email xác thực"}
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between text-sm font-bold mt-1 px-1">
                    <label className="flex items-center gap-2.5 text-slate-500 cursor-pointer select-none">
                        <input type="checkbox" className="w-4.5 h-4.5 rounded border-slate-200 text-[#FF6262] focus:ring-[#FF6262]" />
                        Ghi nhớ đăng nhập
                    </label>
                    <a 
                        href="#" 
                        onClick={(e) => {
                            e.preventDefault();
                            closeAuthModals();
                            navigate("/forgot-password");
                        }}
                        className="text-[#FF6262] hover:underline"
                    >
                        Quên mật khẩu?
                    </a>
                </div>

                <button type="submit" className="h-12 mt-2 bg-[#FF6262] text-white font-black text-md rounded-xl shadow-lg shadow-[#FF6262]/26 transition-all hover:scale-[1.01] hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer" disabled={isPending}>
                    {isPending ? "Đang xử lý..." : "Đăng nhập ngay"}
                </button>
            </form>

            <div className="flex items-center gap-4 my-4 sm:my-6">
                <span className="flex-1 h-px bg-slate-100"></span>
                <p className="m-0 text-slate-400 text-[11.5px] font-black uppercase tracking-widest">Hoặc</p>
                <span className="flex-1 h-px bg-slate-100"></span>
            </div>

            <button type="button" className="h-12 flex items-center justify-center gap-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-[#102937] text-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 cursor-pointer" onClick={handleGoogleLogin} disabled={isPending}>
                <GoogleIcon />
                Tiếp tục với Google
            </button>

            <p className="mt-6 text-center text-slate-500 font-bold text-sm">
                Chưa có tài khoản?{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToRegister?.(); }} className="text-[#FF6262] hover:underline">
                    Đăng ký miễn phí
                </a>
            </p>
        </div>
    );
};

export const LoginModal = () => {
    const { isLoginModalOpen, closeAuthModals, openRegisterModal } = useAuthStore();

    useEffect(() => {
        if (isLoginModalOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "unset";
        return () => { document.body.style.overflow = "unset"; };
    }, [isLoginModalOpen]);

    if (!isLoginModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-md transition-all" onClick={closeAuthModals}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-white rounded-3xl shadow-2xl overflow-hidden max-w-[1020px] w-full max-h-[90vh] flex flex-col pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                  className="absolute top-5 right-5 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 text-[#102937] hover:bg-black/10 transition-colors cursor-pointer" 
                  onClick={closeAuthModals}
                  aria-label="Đóng"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div className="flex flex-col xl:flex-row flex-1 min-h-0 items-stretch overflow-auto xl:overflow-visible">
                    <div className="w-full xl:w-[54%] bg-white scrollbar-hide">
                        <LoginContent onSwitchToRegister={openRegisterModal} />
                    </div>
                    <div className="hidden xl:flex w-[46%] bg-[#102937] flex-shrink-0 items-stretch">
                        <VisualPanelContent />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
