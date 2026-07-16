import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Mail } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { GoogleIcon } from "../../../components/auth/SharedAuth";
import { redirectToGoogleOAuth } from "../../../utils/google-oauth.util";

export const LoginPage = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const {
        loginForm: { register, formState: { errors } },
        handleLogin: submit,
        loginMutation: { isPending },
        pendingVerificationIdentifier,
        resendVerificationEmail,
        resendVerificationMutation: { isPending: isResendingVerification },
        isAuthenticated,
    } = useAuth();
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

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
                <div className="lg:absolute lg:top-8 lg:left-12 flex items-center gap-2.5 cursor-pointer z-20 font-client-display transition-transform hover:scale-[1.02] pt-6 pl-6 lg:p-0 shrink-0" onClick={() => navigate("/")}>
                    <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Đại Phát Logo" className="w-[42px] h-[42px] lg:w-[48px] lg:h-[48px] object-contain" />
                    <div className="flex flex-col justify-center">
                        <span className="text-[20px] lg:text-[24px] tracking-tight font-client-display font-black text-[#ee1314] leading-none mb-1">ĐẠI PHÁT</span>
                        <span className="text-[8.5px] lg:text-[10px] font-bold text-[#F59E0B] leading-none uppercase tracking-wider whitespace-nowrap">Tài lộc - May mắn - Thịnh vượng</span>
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
                        className="w-full max-w-[400px] xl:max-w-[440px] bg-white rounded-[24px] p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]"
                    >
                        <div className="mb-5 xl:mb-6">
                            <h2 className="text-[22px] xl:text-[26px] font-bold text-[#1A1A1A] mb-1 font-client-main tracking-tight">Đăng nhập</h2>
                            <p className="text-[#666666] text-[13px] xl:text-[14px] leading-tight xl:leading-normal">
                                Chào mừng bạn quay trở lại!<br />
                                Đăng nhập để tiếp tục trải nghiệm.
                            </p>
                        </div>

                        <form className="flex flex-col gap-3.5 xl:gap-4" onSubmit={submit} noValidate>
                            {/* Username / Email Field */}
                            <div className="flex flex-col gap-1.5 xl:gap-2">
                                <label htmlFor="username" className="text-[13px] xl:text-[14px] font-semibold text-[#333333]">Email / Tên đăng nhập</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-[#999999]">
                                        <Mail size={18} strokeWidth={2} />
                                    </div>
                                    <input
                                        id="username"
                                        type="text"
                                        placeholder="Nhập email hoặc tên đăng nhập"
                                        disabled={isPending}
                                        autoComplete="username"
                                        className="w-full h-[48px] xl:h-[52px] pl-11 pr-4 bg-white border border-[#E0E0E0] rounded-xl text-[14px] xl:text-[15px] text-[#333333] placeholder:text-[#999999] focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                                        {...register("username")}
                                    />
                                </div>
                                {errors.username && <p className="text-[#D32F2F] text-[12px] xl:text-[13px] mt-0.5">{errors.username.message}</p>}
                            </div>

                            {/* Password Field */}
                            <div className="flex flex-col gap-1.5 xl:gap-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="text-[13px] xl:text-[14px] font-semibold text-[#333333]">Mật khẩu</label>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/forgot-password")}
                                        className="text-[12px] xl:text-[13px] font-bold text-[#D32F2F] hover:underline"
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-[#999999]">
                                        <Lock size={18} strokeWidth={2} />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Nhập mật khẩu"
                                        disabled={isPending}
                                        autoComplete="current-password"
                                        className="w-full h-[48px] xl:h-[52px] pl-11 pr-11 bg-white border border-[#E0E0E0] rounded-xl text-[14px] xl:text-[15px] text-[#333333] placeholder:text-[#999999] focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] outline-none transition-all"
                                        {...register("password")}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-4 text-[#999999] hover:text-[#333333] transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-[#D32F2F] text-[12px] xl:text-[13px] mt-0.5">{errors.password.message}</p>}
                            </div>

                            {pendingVerificationIdentifier && (
                                <div className="rounded-xl border border-[#FAD7D7] bg-[#FFF7F7] px-4 py-3 text-[13px] text-[#7A1D1D]">
                                    <p className="font-semibold">Email tài khoản này chưa được xác thực.</p>
                                    <button
                                        type="button"
                                        onClick={() => resendVerificationEmail(pendingVerificationIdentifier)}
                                        disabled={isResendingVerification}
                                        className="mt-2 font-bold text-[#D32F2F] hover:underline disabled:opacity-60"
                                    >
                                        {isResendingVerification ? "Đang gửi lại..." : "Gửi lại email xác thực"}
                                    </button>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full h-[48px] xl:h-[52px] mt-2 flex items-center justify-center gap-2 bg-[#D32F2F] text-white rounded-xl font-bold text-[15px] xl:text-[16px] transition-all hover:bg-[#B71C1C] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <Lock size={18} strokeWidth={2.5} />
                                )}
                                <span>{isPending ? "Đang xử lý..." : "Đăng nhập"}</span>
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-1 xl:my-2">
                                <span className="flex-1 h-px bg-[#EEEEEE]"></span>
                                <span className="text-[#999999] text-[12px] xl:text-[13px]">hoặc</span>
                                <span className="flex-1 h-px bg-[#EEEEEE]"></span>
                            </div>

                            {/* Google Button */}
                            <button
                                type="button"
                                className="w-full h-[48px] xl:h-[52px] flex items-center justify-center gap-3 bg-white border border-[#E0E0E0] rounded-xl font-semibold text-[#333333] text-[14px] xl:text-[15px] transition-all hover:bg-[#F9F9F9] active:scale-[0.98] disabled:opacity-50"
                                onClick={handleGoogleLogin}
                                disabled={isPending}
                            >
                                <GoogleIcon />
                                Đăng nhập với Google
                            </button>
                        </form>

                        {/* Footer Text */}
                        <div className="mt-6 xl:mt-8 text-center">
                            <p className="text-[#666666] text-[13px] xl:text-[14px]">
                                Chưa có tài khoản?{" "}
                                <button
                                    onClick={() => navigate("/register")}
                                    className="text-[#D32F2F] font-bold hover:underline"
                                >
                                    Đăng ký ngay
                                </button>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
