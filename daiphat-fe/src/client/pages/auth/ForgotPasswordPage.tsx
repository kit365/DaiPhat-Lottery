import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import Cookies from "js-cookie";
import { useQueryClient } from "@tanstack/react-query";
import { useForgotPassword } from "../../../admin/pages/authen/hooks/use-forgot-password";
import { PasswordStrengthMeter } from "../../components/auth/PasswordStrengthMeter";
import { AppToast as toast } from "../../../utils/toast.util";
import { STORAGE_KEYS } from "../../../constants/storage.constants";
import { useAuthStore } from "../../../stores/useAuthStore";
import { authService } from "../../../admin/pages/authen/services/auth.service";

const STEPS = {
    EMAIL: "EMAIL",
    OTP: "OTP",
    RESET: "RESET",
    SUCCESS: "SUCCESS",
} as const;

type Step = keyof typeof STEPS;

export const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { token, logout } = useAuthStore();
    const [step, setStep] = useState<Step>(STEPS.EMAIL);
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [otp, setOtp] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [passwords, setPasswords] = useState({ new: "", confirm: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const { requestOtp, verifyOtp, resetPassword, usePasswordPolicy, isPending } = useForgotPassword();
    const { data: passwordPolicy } = usePasswordPolicy();

    useEffect(() => {
        if (!token) return;

        const closeSession = async () => {
            try {
                await authService.logout();
            } catch (error) {
                console.error("Lỗi tự động đăng xuất khi đặt lại mật khẩu:", error);
            }
            logout();
            Cookies.remove(STORAGE_KEYS.TOKEN, { path: "/" });
            Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: "/" });
            queryClient.clear();
            toast.info("Phiên làm việc đã được đóng để đặt lại mật khẩu.");
        };

        closeSession();
    }, [token, logout, queryClient]);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [countdown]);

    const validateEmail = (value: string) => {
        if (!value.trim()) return "Vui lòng nhập email";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email không hợp lệ";
        return "";
    };

    const isPasswordValid = (() => {
        if (!passwordPolicy || !passwords.new) return false;
        const { minLength, maxLength, requirements } = passwordPolicy;
        const validLength = passwords.new.length >= minLength && (!maxLength || passwords.new.length <= maxLength);
        const validRules = requirements.filter((rule) => rule.regex).every((rule) => new RegExp(rule.regex).test(passwords.new));
        return validLength && validRules;
    })();

    const handleRequestOtp = (event: React.FormEvent) => {
        event.preventDefault();
        const error = validateEmail(email);
        if (error) {
            setEmailError(error);
            return;
        }

        requestOtp.mutate({ email }, {
            onSuccess: (response) => {
                if (response.isSuccess || response.success) {
                    setStep(STEPS.OTP);
                    setCountdown(response.data?.retryAfter || 60);
                }
            },
        });
    };

    const handleVerifyOtp = (event: React.FormEvent) => {
        event.preventDefault();
        if (otp.length !== 6) {
            toast.warning("Vui lòng nhập đủ 6 số OTP");
            return;
        }

        verifyOtp.mutate({ email, otp }, {
            onSuccess: (response) => {
                if ((response.isSuccess || response.success) && response.data?.resetToken) {
                    setResetToken(response.data.resetToken);
                    setStep(STEPS.RESET);
                }
            },
        });
    };

    const handleResetPassword = (event: React.FormEvent) => {
        event.preventDefault();
        if (passwords.new !== passwords.confirm) {
            toast.error("Mật khẩu xác nhận không khớp");
            return;
        }

        resetPassword.mutate({
            resetToken,
            newPassword: passwords.new,
            confirmPassword: passwords.confirm,
        }, {
            onSuccess: (response) => {
                if (response.isSuccess || response.success) {
                    logout();
                    Cookies.remove(STORAGE_KEYS.TOKEN, { path: "/" });
                    Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: "/" });
                    queryClient.clear();
                    setStep(STEPS.SUCCESS);
                }
            },
        });
    };

    const handleResendOtp = () => {
        if (countdown > 0) return;
        requestOtp.mutate({ email }, {
            onSuccess: (response) => {
                if (response.isSuccess || response.success) {
                    setCountdown(response.data?.retryAfter || 60);
                }
            },
        });
    };

    if (token && step !== STEPS.SUCCESS) {
        return null;
    }

    return (
        <div className="min-h-[100dvh] w-full relative flex flex-col font-client-main bg-[#FFFBF5] overflow-x-hidden">
            <div className="fixed inset-0 z-0">
                <img
                    src="https://i.imgur.com/ubrNhdc.png"
                    alt="Background"
                    className="w-full h-full object-cover object-center"
                />
            </div>

            <div className="relative z-10 flex-1 flex flex-col w-full max-w-[1440px] mx-auto min-h-[100dvh]">
                <div className="lg:absolute lg:top-8 lg:left-12 flex items-center pt-6 pl-6 lg:p-0 z-20 shrink-0">
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="inline-flex items-center gap-2 text-[#D32F2F] font-bold text-[14px] hover:underline bg-white/80 px-4 py-2 rounded-full backdrop-blur-sm shadow-sm"
                    >
                        <ArrowLeft size={18} />
                        Đăng nhập
                    </button>
                </div>

                <div className="w-full flex items-center justify-center px-4 sm:px-8 py-8 lg:py-12 flex-1">


            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="relative z-10 w-full max-w-[460px] bg-white rounded-[24px] p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)]"
            >
                <AnimatePresence mode="wait">
                    {step === STEPS.EMAIL && (
                        <Step key="email" icon={<Mail size={34} />} title="Quên mật khẩu?" description="Nhập email liên kết với tài khoản. Đại Phát sẽ gửi mã OTP để đặt lại mật khẩu.">
                            <form onSubmit={handleRequestOtp} className="space-y-4">
                                <FieldLabel>Email</FieldLabel>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => {
                                        setEmail(event.target.value);
                                        if (emailError) setEmailError("");
                                    }}
                                    placeholder="mail@website.com"
                                    disabled={isPending}
                                    className={`w-full h-[48px] px-4 bg-white border ${emailError ? "border-[#D32F2F]" : "border-[#E0E0E0]"} rounded-xl text-[14px] outline-none focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F]`}
                                />
                                {emailError && <p className="text-[#D32F2F] text-[12px] font-semibold">{emailError}</p>}
                                <PrimaryButton loading={isPending}>Gửi mã OTP</PrimaryButton>
                            </form>
                        </Step>
                    )}

                    {step === STEPS.OTP && (
                        <Step key="otp" icon={<ShieldCheck size={34} />} title="Xác thực OTP" description={`Mã xác thực đã được gửi tới ${email}.`}>
                            <form onSubmit={handleVerifyOtp} className="space-y-5">
                                <OtpInput value={otp} onChange={setOtp} disabled={isPending} />
                                <PrimaryButton loading={isPending} disabled={otp.length !== 6}>Xác nhận OTP</PrimaryButton>
                                <div className="text-center text-[13px] font-medium text-[#666666]">
                                    {countdown > 0 ? (
                                        <span>Gửi lại sau <b className="text-[#D32F2F]">{countdown}s</b></span>
                                    ) : (
                                        <button type="button" onClick={handleResendOtp} disabled={requestOtp.isPending} className="text-[#D32F2F] font-bold hover:underline disabled:opacity-60">
                                            {requestOtp.isPending ? "Đang gửi..." : "Gửi lại mã OTP"}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </Step>
                    )}

                    {step === STEPS.RESET && (
                        <Step key="reset" icon={<Lock size={34} />} title="Đặt lại mật khẩu" description="Tạo mật khẩu mới để bảo vệ tài khoản của bạn.">
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <PasswordField
                                    label="Mật khẩu mới"
                                    value={passwords.new}
                                    show={showPassword}
                                    onToggle={() => setShowPassword((value) => !value)}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                    onChange={(value) => setPasswords((current) => ({ ...current, new: value }))}
                                />
                                <PasswordField
                                    label="Xác nhận mật khẩu"
                                    value={passwords.confirm}
                                    show={showConfirmPassword}
                                    onToggle={() => setShowConfirmPassword((value) => !value)}
                                    onChange={(value) => setPasswords((current) => ({ ...current, confirm: value }))}
                                />
                                {passwordPolicy && (
                                    <PasswordStrengthMeter
                                        password={passwords.new}
                                        policy={passwordPolicy}
                                        isFocused={isPasswordFocused || passwords.new.length > 0}
                                    />
                                )}
                                {passwords.confirm && passwords.new !== passwords.confirm && (
                                    <p className="text-[#D32F2F] text-[12px] font-semibold">Mật khẩu xác nhận không khớp</p>
                                )}
                                <PrimaryButton loading={isPending} disabled={!isPasswordValid || !passwords.confirm || passwords.new !== passwords.confirm}>
                                    Cập nhật mật khẩu
                                </PrimaryButton>
                            </form>
                        </Step>
                    )}

                    {step === STEPS.SUCCESS && (
                        <Step key="success" icon={<Check size={34} />} title="Thành công!" description="Mật khẩu đã được thay đổi. Bạn có thể đăng nhập bằng mật khẩu mới.">
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="w-full h-[48px] bg-[#D32F2F] text-white rounded-xl font-bold text-[15px] hover:bg-[#B71C1C] transition-all"
                            >
                                Đăng nhập ngay
                            </button>
                        </Step>
                    )}
                </AnimatePresence>

                {step !== STEPS.SUCCESS && (
                    <div className="mt-6 text-center">
                        <p className="text-[#666666] text-[13px] sm:text-[14px]">
                            Nhớ mật khẩu rồi?{" "}
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="text-[#D32F2F] font-bold hover:underline"
                            >
                                Quay lại đăng nhập
                            </button>
                        </p>
                    </div>
                )}
            </motion.div>
                </div>
            </div>
        </div>
    );
};

const Step = ({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) => (
    <motion.div
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 }}
        transition={{ duration: 0.22 }}
    >
        <div className="text-center mb-6">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-[#FFF4F4] text-[#D32F2F] flex items-center justify-center">
                {icon}
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-[#1A1A1A] tracking-tight">{title}</h1>
            <p className="mt-2 text-[#666666] text-[14px] leading-relaxed">{description}</p>
        </div>
        {children}
    </motion.div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block mb-1.5 text-[13px] font-semibold text-[#333333]">{children}</label>
);

const PrimaryButton = ({ children, loading, disabled }: { children: React.ReactNode; loading?: boolean; disabled?: boolean }) => (
    <button
        type="submit"
        disabled={loading || disabled}
        className="w-full h-[48px] bg-[#D32F2F] text-white rounded-xl font-bold text-[15px] hover:bg-[#B71C1C] active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
    >
        {loading ? "Đang xử lý..." : children}
    </button>
);

const PasswordField = ({
    label,
    value,
    show,
    onToggle,
    onChange,
    onFocus,
    onBlur,
}: {
    label: string;
    value: string;
    show: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
}) => (
    <div>
        <FieldLabel>{label}</FieldLabel>
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Nhập mật khẩu"
                className="w-full h-[48px] pl-4 pr-11 bg-white border border-[#E0E0E0] rounded-xl text-[14px] outline-none focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F]"
            />
            <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#333333]">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    </div>
);

const OtpInput = ({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) => {
    const inputs = useRef<HTMLInputElement[]>([]);

    const handleInput = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const digit = event.target.value;
        if (!/^[0-9]?$/.test(digit)) return;

        const next = value.split("");
        next[index] = digit;
        onChange(next.join("").slice(0, 6));

        if (digit && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    return (
        <div className="flex justify-center gap-2 sm:gap-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                    key={index}
                    ref={(element) => {
                        if (element) inputs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[index] || ""}
                    disabled={disabled}
                    onChange={(event) => handleInput(event, index)}
                    onKeyDown={(event) => {
                        if (event.key === "Backspace" && !value[index] && index > 0) {
                            inputs.current[index - 1]?.focus();
                        }
                    }}
                    className="w-11 h-[52px] sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border border-[#E0E0E0] bg-white outline-none focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F]"
                />
            ))}
        </div>
    );
};
