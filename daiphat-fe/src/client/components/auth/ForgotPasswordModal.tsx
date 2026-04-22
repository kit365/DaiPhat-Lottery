import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useForgotPassword } from "../../../admin/pages/authen/hooks/use-forgot-password";
import { AppToast as toast } from "../../utils/toast.util";

const STEPS = {
    EMAIL: "EMAIL",
    OTP: "OTP",
    RESET: "RESET",
    SUCCESS: "SUCCESS"
} as const;

type Step = keyof typeof STEPS;

export const ForgotPasswordModal = () => {
    const { isForgotPasswordModalOpen, closeForgotPasswordModal, openLoginModal } = useAuthStore();
    const [step, setStep] = useState<Step>(STEPS.EMAIL);
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [otp, setOtp] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [passwords, setPasswords] = useState({ new: "", confirm: "" });
    const [countdown, setCountdown] = useState(0);

    const { requestOtp, verifyOtp, resetPassword, usePasswordPolicy, isPending } = useForgotPassword();
    const { data: passwordPolicy } = usePasswordPolicy();

    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    // Reset state when modal opens
    useEffect(() => {
        if (isForgotPasswordModalOpen) {
            setStep(STEPS.EMAIL);
            setEmail("");
            setOtp("");
            setPasswords({ new: "", confirm: "" });
            setCountdown(0);
        }
    }, [isForgotPasswordModalOpen]);

    if (!isForgotPasswordModalOpen) return null;

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setEmailError("Vui lòng nhập email để nhận mã");
            return;
        }

        requestOtp.mutate({ email }, {
            onSuccess: (res) => {
                if (res.isSuccess || res.success) {
                    setStep(STEPS.OTP);
                    setCountdown(res.data?.retryAfter || 60);
                }
            }
        });
    };

    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast.warning("Vui lòng nhập đủ 6 số OTP");
            return;
        }

        verifyOtp.mutate({ email, otp }, {
            onSuccess: (res) => {
                if (res.isSuccess || res.success) {
                    setResetToken(res.data.resetToken);
                    setStep(STEPS.RESET);
                }
            }
        });
    };

    const handleResetPassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            toast.error("Mật khẩu xác nhận không khớp");
            return;
        }

        resetPassword.mutate({
            resetToken,
            newPassword: passwords.new,
            confirmPassword: passwords.confirm
        }, {
            onSuccess: (res) => {
                if (res.isSuccess || res.success) {
                    setStep(STEPS.SUCCESS);
                }
            }
        });
    };

    const handleResendOtp = () => {
        if (countdown > 0) return;
        requestOtp.mutate({ email }, {
            onSuccess: (res) => {
                if (res.isSuccess || res.success) {
                    setCountdown(res.data?.retryAfter || 60);
                }
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-md transition-all" onClick={closeForgotPasswordModal}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-white rounded-3xl shadow-2xl overflow-hidden max-w-[480px] w-full max-h-[90vh] flex flex-col pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    className="absolute top-5 right-5 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 text-[#102937] hover:bg-black/10 transition-colors cursor-pointer"
                    onClick={closeForgotPasswordModal}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div className="p-8 sm:p-10">
                    <AnimatePresence mode="wait">
                        {step === STEPS.EMAIL && (
                            <motion.div
                                key="email"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center text-center"
                            >
                                <div className="w-16 h-16 bg-[#FF6262]/10 rounded-2xl flex items-center justify-center text-[#FF6262] mb-6">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                </div>
                                <h2 className="font-client-display text-2xl font-black text-[#102937] mb-2">Quên mật khẩu?</h2>
                                <p className="text-slate-500 font-medium text-sm mb-8">Vui lòng nhập email của bạn để nhận mã xác thực đặt lại mật khẩu.</p>
                                
                                <form onSubmit={handleRequestOtp} className="w-full space-y-4">
                                    <div className="flex flex-col gap-1.5 text-left">
                                        <label className="text-[13px] font-black uppercase tracking-wider text-slate-400 ml-1">Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (emailError) setEmailError("");
                                            }}
                                            placeholder="nhap@email.com"
                                            className={`h-12 px-5 bg-slate-50 border ${emailError ? 'border-[#FF6262]' : 'border-slate-100'} rounded-xl text-[14px] font-medium focus:bg-white focus:border-[#FF6262] outline-none transition-all w-full`}
                                        />
                                        {emailError && (
                                            <span className="text-[#FF6262] text-[12px] font-bold ml-1">{emailError}</span>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="w-full h-12 bg-[#FF6262] text-white font-black rounded-xl shadow-lg shadow-[#FF6262]/26 hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {isPending ? "Đang gửi..." : "Gửi mã OTP"}
                                    </button>

                                    <div className="text-center mt-6">
                                        <p className="text-slate-400 text-sm font-medium">
                                            Bạn đã nhận được mã?{" "}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!email) {
                                                        setEmailError("Vui lòng nhập email để tiếp tục");
                                                        return;
                                                    }
                                                    setStep(STEPS.OTP);
                                                }}
                                                className="text-[#FF6262] font-bold hover:underline cursor-pointer"
                                            >
                                                Nhập ngay
                                            </button>
                                        </p>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {step === STEPS.OTP && (
                            <motion.div
                                key="otp"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center text-center"
                            >
                                {/* Modal Back Button (Top Left) */}
                                <button
                                    onClick={() => setStep(STEPS.EMAIL)}
                                    className="absolute top-5 left-5 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 text-slate-400 hover:bg-black/10 hover:text-[#102937] transition-all cursor-pointer group"
                                    title="Quay lại"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
                                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                                    </svg>
                                </button>

                                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                </div>
                                <h2 className="font-client-display text-2xl font-black text-[#102937] mb-2">Xác thực OTP</h2>
                                <p className="text-slate-500 font-medium text-sm mb-8">Mã xác thực đã được gửi đến <span className="text-[#102937] font-bold">{email}</span></p>

                                <form onSubmit={handleVerifyOtp} className="w-full space-y-6">
                                    <OtpInput value={otp} onChange={setOtp} disabled={isPending} />
                                    
                                    <button
                                        type="submit"
                                        disabled={isPending || otp.length !== 6}
                                        className="w-full h-12 bg-[#FF6262] text-white font-black rounded-xl shadow-lg shadow-[#FF6262]/26 hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {isPending ? "Đang xác nhận..." : "Xác nhận OTP"}
                                    </button>

                                    <div className="text-sm font-medium">
                                        {countdown > 0 ? (
                                            <p className="text-slate-400">Bạn có thể yêu cầu gửi lại sau <span className="text-[#FF6262] font-black">{countdown}s</span></p>
                                        ) : (
                                            <p className="text-slate-500">
                                                Không nhận được mã?{" "}
                                                <button 
                                                    type="button" 
                                                    onClick={handleResendOtp}
                                                    disabled={requestOtp.isPending}
                                                    className="text-[#FF6262] font-black hover:underline cursor-pointer disabled:opacity-50"
                                                >
                                                    {requestOtp.isPending ? "Đang gửi..." : "Gửi lại ngay"}
                                                </button>
                                            </p>
                                        )}
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {step === STEPS.RESET && (
                            <motion.div
                                key="reset"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center text-center"
                            >
                                {/* Modal Back Button (Top Left) */}
                                <button
                                    type="button"
                                    onClick={() => setStep(STEPS.OTP)}
                                    className="absolute top-5 left-5 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/5 text-slate-400 hover:bg-black/10 hover:text-[#102937] transition-all cursor-pointer group"
                                    title="Quay lại"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
                                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                                    </svg>
                                </button>

                                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.5-2.5"></path>
                                    </svg>
                                </div>
                                <h2 className="font-client-display text-2xl font-black text-[#102937] mb-2">Đổi mật khẩu mới</h2>
                                <p className="text-slate-500 font-medium text-sm mb-6">Nhập mật khẩu mới mạnh mẽ để bảo vệ tài khoản của bạn.</p>

                                <form onSubmit={handleResetPassword} className="w-full space-y-4 text-left">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[13px] font-black uppercase tracking-wider text-slate-400 ml-1">Mật khẩu mới</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={passwords.new}
                                                onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                                                className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium focus:bg-white focus:border-[#FF6262] outline-none transition-all"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[13px] font-black uppercase tracking-wider text-slate-400 ml-1">Xác nhận mật khẩu</label>
                                        <input
                                            type="password"
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                                            className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-xl text-[14px] font-medium focus:bg-white focus:border-[#FF6262] outline-none transition-all"
                                        />
                                    </div>

                                    {passwordPolicy && passwords.new && (
                                        <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                                            <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Yêu cầu bảo mật</p>
                                            {passwordPolicy.requirements.map((req: any) => (
                                                <RequirementItem 
                                                    key={req.id} 
                                                    label={req.description} 
                                                    isMet={new RegExp(req.regex).test(passwords.new)} 
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isPending || !passwords.confirm || passwords.new !== passwords.confirm}
                                        className="w-full h-12 bg-[#FF6262] text-white font-black rounded-xl shadow-lg shadow-[#FF6262]/26 hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {isPending ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {step === STEPS.SUCCESS && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center text-center"
                            >
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-6 shadow-sm">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                                <h2 className="font-client-display text-2xl font-black text-[#102937] mb-2">Thành công!</h2>
                                <p className="text-slate-500 font-medium text-sm mb-8">Mật khẩu của bạn đã được thay đổi. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.</p>
                                
                                <button
                                    onClick={() => {
                                        closeForgotPasswordModal();
                                        openLoginModal();
                                    }}
                                    className="w-full h-12 bg-[#FF6262] text-white font-black rounded-xl shadow-lg shadow-[#FF6262]/26 hover:scale-[1.01] transition-all cursor-pointer"
                                >
                                    Đăng nhập ngay
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

const OtpInput = ({ value, onChange, disabled }: { value: string; onChange: (val: string) => void; disabled?: boolean }) => {
    const inputs = useRef<HTMLInputElement[]>([]);

    const handleInput = (e: any, index: number) => {
        const val = e.target.value;
        if (!/^[0-9]$/.test(val) && val !== "") return;

        const newOtp = value.split("");
        newOtp[index] = val;
        onChange(newOtp.join("").slice(0, 6));

        if (val !== "" && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: any, index: number) => {
        if (e.key === "Backspace" && !value[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData("text").trim();
        if (!/^\d+$/.test(data)) return;

        const pasteData = data.slice(0, 6).split("");
        onChange(pasteData.join(""));

        // Focus the last input or the next one
        const nextIndex = Math.min(pasteData.length, 5);
        inputs.current[nextIndex]?.focus();
    };

    return (
        <div className="flex gap-2 sm:gap-3 justify-center">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
                <input
                    key={idx}
                    ref={(el: any) => (inputs.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    value={value[idx] || ""}
                    onChange={(e: any) => handleInput(e, idx)}
                    onKeyDown={(e: any) => handleKeyDown(e, idx)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-[#FF6262] focus:shadow-md outline-none transition-all disabled:opacity-50"
                />
            ))}
        </div>
    );
};

const RequirementItem = ({ label, isMet }: { label: string; isMet: boolean }) => (
    <div className={`flex items-center gap-2 text-xs font-bold transition-colors ${isMet ? 'text-emerald-500' : 'text-slate-300'}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>{label}</span>
    </div>
);
