import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Lock, Eye, EyeOff, Mail } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../../stores/useAuthStore";
import { generateCodeVerifier, generateCodeChallenge } from "../../../admin/utils/pkce";
import { GoogleIcon } from "../../components/auth/SharedAuth";

export const LoginPage = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const {
        loginForm: { register, formState: { errors } },
        handleLogin: submit,
        loginMutation: { isPending },
        isAuthenticated,
    } = useAuth();
    const { openForgotPasswordModal } = useAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleGoogleLogin = async () => {
        const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL;
        const realm = import.meta.env.VITE_KEYCLOAK_REALM;
        const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
        const { STORAGE_KEYS } = await import("../../../constants/storage.constants");

        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        sessionStorage.setItem(STORAGE_KEYS.PKCE_VERIFIER, codeVerifier);

        const googleAuthUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth` +
            `?client_id=${clientId}` +
            `&redirect_uri=${redirectUri}` +
            `&response_type=code` +
            `&scope=openid` +
            `&kc_idp_hint=google` +
            `&code_challenge=${codeChallenge}` +
            `&code_challenge_method=S256`;

        window.location.href = googleAuthUrl;
    };

    return (
        <div className="h-screen w-full relative flex flex-col font-client-main bg-[#FFFBF5] overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://i.imgur.com/ubrNhdc.png"
                    alt="Background"
                    className="w-full h-full object-cover object-center"
                />
            </div>

            {/* Main Content Overlay */}
            <div className="relative z-10 flex-1 flex flex-col lg:flex-row w-full max-w-[1440px] mx-auto h-full">

                {/* Header Logo (Mobile & Desktop) */}
                <div className="absolute top-6 left-6 lg:top-8 lg:left-12 flex items-center gap-3 cursor-pointer z-20" onClick={() => navigate("/")}>
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                        <img src="/assets/images/logo.png" alt="Logo" className="w-6 h-6 lg:w-8 lg:h-8 object-contain" onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<span class="text-[#D32F2F] font-bold text-xl">ĐP</span>';
                        }} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg lg:text-xl sm:text-2xl font-black text-[#D32F2F] tracking-tight uppercase">Đại Phát</span>
                        <span className="text-[8px] lg:text-[9px] sm:text-[10px] font-bold text-[#FFB300] uppercase tracking-widest mt-[-2px]">Tài Lộc - May Mắn - Thịnh Vượng</span>
                    </div>
                </div>

                {/* Left Side: Empty */}
                <div className="hidden lg:flex w-1/2"></div>

                {/* Right Side: Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 lg:px-12 h-full">
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
                            {/* Username / Phone Field */}
                            <div className="flex flex-col gap-1.5 xl:gap-2">
                                <label htmlFor="username" className="text-[13px] xl:text-[14px] font-semibold text-[#333333]">Số điện thoại / Tên đăng nhập</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-[#999999]">
                                        <Phone size={18} strokeWidth={2} />
                                    </div>
                                    <input
                                        id="username"
                                        type="text"
                                        placeholder="Nhập số điện thoại hoặc tên đăng nhập"
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
                                        onClick={() => openForgotPasswordModal()}
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
