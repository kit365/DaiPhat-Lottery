"use client";

import { useState, useEffect, useRef } from "react";
import { 
    Box, Button, Container, TextField, Typography, IconButton, Paper, 
    InputAdornment, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText
} from "@mui/material";
import { Link, useNavigate } from "@/components/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import { LogoAdmin } from "../../../assets/admin/logo";
import { EyeIcon, NoEyeIcon } from "../../assets/icons";
import {
    EmailOutlined as MailIcon,
    VpnKeyOutlined as ShieldIcon,
    ArrowBack as ArrowBackIcon,
    CheckCircleOutline as CheckIcon
} from "@mui/icons-material";
import { AppToast as toast } from "../../../utils/toast.util";
import { useForgotPassword } from "./hooks/use-forgot-password";
import { PasswordRequirementList } from "../../components/auth/PasswordRequirementList";
import { useAuthStore } from "../../../stores/useAuthStore";
import Cookies from "js-cookie";
import { STORAGE_KEYS } from "../../../constants/storage.constants";
import { useQueryClient } from "@tanstack/react-query";

const STEPS = {
    EMAIL: "EMAIL",
    OTP: "OTP",
    RESET: "RESET",
    SUCCESS: "SUCCESS"
} as const;

type Step = keyof typeof STEPS;

export const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>(STEPS.EMAIL);
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [otp, setOtp] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [passwords, setPasswords] = useState({ new: "", confirm: "" });
    const [countdown, setCountdown] = useState(0);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const { logout, token } = useAuthStore();
    const queryClient = useQueryClient();

    // Auto logout if already logged in to prevent active session leakage
    useEffect(() => {
        if (token) {
            logout();
            Cookies.remove(STORAGE_KEYS.TOKEN, { path: '/' });
            Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: '/' });
            queryClient.clear();
            toast.info("Phiên làm việc đã được đóng để đặt lại mật khẩu.");
        }
    }, [token, logout, queryClient]);

    const { requestOtp, verifyOtp, resetPassword, usePasswordPolicy, isPending } = useForgotPassword();
    const { data: passwordPolicy } = usePasswordPolicy();

    const [openConfirm, setOpenConfirm] = useState(false);

    // Timer for resend OTP
    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const handleClearState = () => {
        setStep(STEPS.EMAIL);
        setEmail("");
        setEmailError("");
        setOtp("");
        setResetToken("");
        setPasswords({ new: "", confirm: "" });
        setCountdown(0);
        setOpenConfirm(false);
    };

    const handleBack = () => {
        if (step === STEPS.RESET) {
            setOpenConfirm(true);
        } else if (step === STEPS.OTP) {
            setStep(STEPS.EMAIL);
        } else {
            navigate("/admin/auth/login");
        }
    };

    const checkAllMet = () => {
        if (!passwordPolicy) return false;
        const pwd = passwords.new || "";
        const { minLength, maxLength, requirements } = passwordPolicy;

        const isMinMet = pwd.length >= minLength;
        const isMaxMet = !maxLength || (pwd.length <= maxLength && pwd.length > 0);

        const filteredReqs = requirements.filter(req =>
            !req.description.toLowerCase().includes(`${minLength} ký tự`) &&
            (!maxLength || !req.description.toLowerCase().includes(`${maxLength} ký tự`))
        );

        const isReqsMet = filteredReqs.every(req => new RegExp(req.regex).test(pwd));

        return isMinMet && isMaxMet && isReqsMet;
    };

    const isPasswordValid = checkAllMet();

    const validateEmail = (val: string) => {
        if (!val) return "Vui lòng nhập email";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) return "Email không hợp lệ";
        return "";
    };

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const error = validateEmail(email);
        if (error) {
            setEmailError(error);
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
            toast.warning("Vui lòng nhập đầy đủ mã OTP");
            return;
        }

        verifyOtp.mutate({ email, otp }, {
            onSuccess: (res) => {
                if ((res.isSuccess || res.success) && res.data) {
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
                    // Fully invalidate and clear active session on password reset
                    logout();
                    Cookies.remove(STORAGE_KEYS.TOKEN, { path: '/' });
                    Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: '/' });
                    queryClient.clear();
                    
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
        <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] relative overflow-hidden">
            {/* Background Decorations */}
            <Box sx={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }}>
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-[#1C252E] opacity-[0.03] blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[#1C252E] opacity-[0.03] blur-[100px]" />
            </Box>

            {/* Header Logo */}
            <Container disableGutters sx={{ height: "72px", px: 3, display: "flex", alignItems: "center", position: "fixed", top: 0, left: 0, zIndex: 1101 }}>
                <Link to="/admin/auth/login" className="inline-block w-[40px] h-[40px]">
                    <LogoAdmin />
                </Link>
            </Container>

            <Box
                component={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                sx={{
                    zIndex: 1,
                    width: "100%",
                    maxWidth: 520,
                    px: { xs: 1.5, sm: 2, md: 0 },
                    mx: "auto"
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        width: "100%",
                        padding: { xs: "24px", sm: "32px", md: "48px" },
                        borderRadius: { xs: "16px", sm: "24px" },
                        boxShadow: "0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)",
                    }}
                >
                    <AnimatePresence mode="wait">
                        {step === STEPS.EMAIL && (
                            <StepLayout
                                key="email"
                                icon={<MailIcon sx={{ fontSize: 40, color: "primary.main" }} />}
                                title="Quên mật khẩu?"
                                description="Vui lòng nhập email liên kết với tài khoản của bạn. Chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu."
                                onBack={() => navigate("/admin/auth/login")}
                            >
                                <form onSubmit={handleRequestOtp}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (emailError) setEmailError("");
                                        }}
                                        error={!!emailError}
                                        helperText={emailError}
                                        disabled={isPending}
                                        placeholder="kiet@daiphat.com"
                                        sx={{ mb: 3 }}
                                        slotProps={{
                                            input: { sx: { borderRadius: "12px" } }
                                        }}
                                    />
                                    <PrimaryButton type="submit" loading={isPending}>
                                        Gửi mã OTP
                                    </PrimaryButton>
                                    <Box sx={{ mt: 3, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Bạn đã nhận được mã?{" "}
                                            <Button
                                                onClick={() => {
                                                    const error = validateEmail(email);
                                                    if (error) {
                                                        setEmailError(error);
                                                        return;
                                                    }
                                                    setStep(STEPS.OTP);
                                                }}
                                                sx={{ fontWeight: 700, p: 0, minWidth: 0, textTransform: "none", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                                            >
                                                Nhập ngay
                                            </Button>
                                        </Typography>
                                    </Box>
                                </form>
                            </StepLayout>
                        )}

                        {step === STEPS.OTP && (
                            <StepLayout
                                key="otp"
                                icon={<ShieldIcon sx={{ fontSize: 40, color: "warning.main" }} />}
                                title="Xác thực OTP"
                                description={`Mã xác thực đã được gửi tới ${email}. Vui lòng nhập mã gồm 6 ký tự số để tiếp tục.`}
                                onBack={handleBack}
                            >
                                <form onSubmit={handleVerifyOtp}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <Box sx={{ py: 2 }}>
                                            <OtpInput value={otp} onChange={setOtp} disabled={isPending} />
                                        </Box>

                                        <PrimaryButton type="submit" loading={isPending} disabled={otp.length !== 6}>
                                            Xác nhận
                                        </PrimaryButton>
                                        
                                        <Box sx={{ textAlign: "center" }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Không nhận được mã?{" "}
                                                <Button
                                                    onClick={handleResendOtp}
                                                    disabled={countdown > 0 || isPending}
                                                    sx={{ 
                                                        fontWeight: 700, 
                                                        p: 0, 
                                                        minWidth: 0, 
                                                        textTransform: "none",
                                                        color: countdown > 0 ? "text.disabled" : "primary.main",
                                                        "&:hover": { textDecoration: countdown > 0 ? "none" : "underline" }
                                                    }}
                                                >
                                                    {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại ngay"}
                                                </Button>
                                            </Typography>
                                        </Box>
                                    </Box>
                                </form>
                            </StepLayout>
                        )}

                        {step === STEPS.RESET && (
                            <StepLayout
                                key="reset"
                                icon={<CheckIcon sx={{ fontSize: 40, color: "success.main" }} />}
                                title="Đặt lại mật khẩu"
                                description="Mã xác thực đã được chấp nhận. Hãy nhập mật khẩu mới cho tài khoản của bạn."
                                onBack={handleBack}
                            >
                                <form onSubmit={handleResetPassword}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <Box>
                                            <TextField
                                                fullWidth
                                                type={showPassword ? "text" : "password"}
                                                label="Mật khẩu mới"
                                                value={passwords.new}
                                                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                                                disabled={isPending}
                                                onFocus={() => setIsPasswordFocused(true)}
                                                onBlur={() => setIsPasswordFocused(false)}
                                                slotProps={{
                                                    input: {
                                                        sx: { borderRadius: "12px" },
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                                    {showPassword ? <NoEyeIcon /> : <EyeIcon />}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        )
                                                    }
                                                }}
                                            />
                                            {passwordPolicy && (isPasswordFocused || passwords.new) && !isPasswordValid && (
                                                <PasswordRequirementList
                                                    password={passwords.new}
                                                    policy={passwordPolicy}
                                                />
                                            )}
                                        </Box>

                                        <TextField
                                            fullWidth
                                            type="password"
                                            label="Xác nhận mật khẩu"
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                                            disabled={isPending}
                                            slotProps={{
                                                input: { sx: { borderRadius: "12px" } }
                                            }}
                                        />

                                        <PrimaryButton 
                                            type="submit" 
                                            loading={isPending} 
                                            disabled={!isPasswordValid || !passwords.confirm || passwords.new !== passwords.confirm}
                                        >
                                            Cập nhật mật khẩu
                                        </PrimaryButton>
                                    </Box>
                                </form>
                            </StepLayout>
                        )}

                        {step === STEPS.SUCCESS && (
                            <StepLayout
                                key="success"
                                icon={<Box sx={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(34, 197, 94, 0.1)", color: "success.main", mx: "auto", mb: 2 }}>
                                    <CheckIcon sx={{ fontSize: 48 }} />
                                </Box>}
                                title="Thành công!"
                                description="Mật khẩu của bạn đã được thay đổi thành công. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới."
                            >
                                <PrimaryButton onClick={() => navigate("/admin/auth/login")}>
                                    Quay lại Đăng nhập
                                </PrimaryButton>
                            </StepLayout>
                        )}
                    </AnimatePresence>
                </Paper>
            </Box>

            {/* Confirm Exit Dialog */}
            <Dialog
                open={openConfirm}
                onClose={() => setOpenConfirm(false)}
                PaperProps={{
                    sx: { borderRadius: "16px", p: 1 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Hủy bỏ quy trình?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn có chắc chắn muốn hủy bỏ quy trình đặt lại mật khẩu này không? Mọi tiến trình hiện tại sẽ bị xóa sạch để đảm bảo bảo mật.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button 
                        onClick={() => setOpenConfirm(false)} 
                        sx={{ color: "text.secondary", fontWeight: 700 }}
                    >
                        Tiếp tục nhập
                    </Button>
                    <Button 
                        onClick={handleClearState} 
                        variant="contained" 
                        color="error"
                        sx={{ borderRadius: "10px", fontWeight: 700 }}
                    >
                        Hủy bỏ ngay
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

// Sub-components for clean layout
const StepLayout = ({ icon, title, description, children, onBack }: any) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
    >
        <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box sx={{ mb: 2 }}>{icon}</Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {description}
            </Typography>
        </Box>

        {children}

        {onBack && (
            <Box sx={{ mt: 3, textAlign: "center" }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                    sx={{ textTransform: "none", color: "text.primary", fontWeight: 600 }}
                >
                    Quay lại
                </Button>
            </Box>
        )}
    </motion.div>
);

const PrimaryButton = ({ children, loading, ...props }: any) => (
    <Button
        fullWidth
        variant="contained"
        {...props}
        sx={{
            py: "14px",
            borderRadius: "12px",
            bgcolor: "var(--palette-text-primary)",
            color: "white",
            fontWeight: 700,
            textTransform: "none",
            boxShadow: "0 8px 16px 0 rgba(28, 37, 46, 0.24)",
            ...props.sx
        }}
    >
        {loading ? <CircularProgress size={24} color="inherit" /> : children}
    </Button>
);

const OtpInput = ({ value, onChange, disabled }: { value: string; onChange: (val: string) => void; disabled?: boolean }) => {
    const inputs = useRef<HTMLInputElement[]>([]);

    const handleInput = (e: any, index: number) => {
        const val = e.target.value;
        if (!/^[0-9]$/.test(val) && val !== "") return;

        const newOtp = value.split("");
        newOtp[index] = val;
        onChange(newOtp.join(""));

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
        const data = e.clipboardData.getData("text").trim();
        if (!/^\d+$/.test(data)) return;

        const pasteData = data.slice(0, 6).split("");
        onChange(pasteData.join(""));

        // Focus the last input or the next one
        const nextIndex = Math.min(pasteData.length, 5);
        inputs.current[nextIndex]?.focus();
    };

    return (
        <Box
            sx={{
                display: "flex",
                gap: { xs: 1, sm: 1.5, md: 2 },
                justifyContent: "center",
                width: "100%"
            }}
        >
            {[0, 1, 2, 3, 4, 5].map((idx) => (
                <Box
                    key={idx}
                    component="input"
                    ref={(el: any) => (inputs.current[idx] = el)}
                    type="text"
                    maxLength={1}
                    value={value[idx] || ""}
                    onChange={(e: any) => handleInput(e, idx)}
                    onKeyDown={(e: any) => handleKeyDown(e, idx)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    sx={{
                        width: "100%",
                        maxWidth: { xs: "42px", sm: "48px", md: "56px" },
                        height: { xs: "54px", sm: "58px", md: "64px" },
                        textAlign: "center",
                        fontSize: { xs: "20px", sm: "22px", md: "24px" },
                        fontWeight: "700",
                        borderRadius: "12px",
                        border: "1.5px solid",
                        borderColor: "#919EAB33",
                        backgroundColor: disabled ? "#F4F6F8" : "#F9FAFB",
                        transition: "all 0.2s ease-in-out",
                        outline: "none",
                        flexShrink: 0,
                        '&:focus': {
                            borderColor: "#1C252E",
                            backgroundColor: "#fff",
                            boxShadow: "0 0 0 4px rgba(28, 37, 46, 0.08)",
                        }
                    }}
                />
            ))}
        </Box>
    );
};
