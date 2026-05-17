import { useState, useEffect } from "react";
import {
    Box, Button, Container, Typography, CircularProgress, Paper, ThemeProvider
} from "@mui/material";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogoAdmin } from "../../../assets/admin/logo";
import { adminTheme } from "../../config/theme";
import { authService } from "./services/auth.service";
import { AppToast as toast } from "../../../client/utils/toast.util";
import {
    CheckCircleOutline as CheckIcon,
    ErrorOutline as ErrorIcon,
    ArrowBack as ArrowBackIcon,
    GroupAddOutlined as GroupAddIcon
} from "@mui/icons-material";
import { ROUTES } from "../../constants/routes";

const STEPS = {
    CONFIRM: "CONFIRM",
    LOADING: "LOADING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR"
} as const;

type Step = keyof typeof STEPS;

export const AcceptInvitePage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");
    const [step, setStep] = useState<Step>(STEPS.CONFIRM);
    const [errorMessage, setErrorMessage] = useState("");

    // Validate that token is present on mount
    useEffect(() => {
        if (!token) {
            setStep(STEPS.ERROR);
            setErrorMessage("Không tìm thấy mã xác thực (token) trong liên kết của bạn. Vui lòng kiểm tra lại email hoặc liên hệ với Quản trị viên.");
        }
    }, [token]);

    const handleAcceptInvite = async () => {
        if (!token) return;

        setStep(STEPS.LOADING);
        try {
            const res = await authService.acceptInvite(token);
            if (res.isSuccess || res.success) {
                toast.success(res.message || "Xác nhận lời mời thành công!");
                setStep(STEPS.SUCCESS);
            } else {
                setErrorMessage(res.message || "Không thể xác thực lời mời. Liên kết có thể đã hết hạn hoặc không hợp lệ.");
                setStep(STEPS.ERROR);
            }
        } catch (error: any) {
            console.error("Error accepting invite:", error);
            const serverMsg = error.response?.data?.message || error.message;
            setErrorMessage(serverMsg || "Có lỗi xảy ra khi xác thực lời mời. Vui lòng thử lại sau.");
            setStep(STEPS.ERROR);
        }
    };

    return (
        <ThemeProvider theme={adminTheme}>
            <div className="admin-theme min-h-screen flex items-center justify-center bg-[#F4F6F8] relative overflow-hidden">
                {/* Decorative Gradient Background Elements */}
                <Box sx={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }}>
                    <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-[#1C252E] opacity-[0.03] blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[#1C252E] opacity-[0.03] blur-[100px]" />
                </Box>

                {/* Fixed Top Header */}
                <Container disableGutters sx={{ height: "72px", px: 3, display: "flex", alignItems: "center", position: "fixed", top: 0, left: 0, zIndex: 1101 }}>
                    <Link to={ROUTES.ADMIN.AUTH.LOGIN} className="inline-block w-[40px] h-[40px]">
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
                        px: { xs: 2, sm: 3 },
                        mx: "auto"
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            width: "100%",
                            padding: { xs: "32px 24px", sm: "48px 40px" },
                            borderRadius: { xs: "16px", sm: "24px" },
                            boxShadow: "0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)",
                            backgroundColor: "#FFFFFF",
                            border: "1px solid rgba(145, 158, 171, 0.08)"
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {step === STEPS.CONFIRM && (
                                <motion.div
                                    key="confirm"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ textAlign: "center" }}
                                >
                                    <Box sx={{ 
                                        width: 80, 
                                        height: 80, 
                                        borderRadius: "50%", 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center", 
                                        bgcolor: "rgba(28, 37, 46, 0.04)", 
                                        color: "text.primary", 
                                        mx: "auto", 
                                        mb: 3
                                    }}>
                                        <GroupAddIcon sx={{ fontSize: 40 }} />
                                    </Box>

                                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: "var(--palette-text-primary)" }}>
                                        Tham gia Đại Phát
                                    </Typography>
                                    
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 4, lineHeight: 1.6 }}>
                                        Bạn đã được mời tham gia đội ngũ quản trị của hệ thống **Đại Phát**. Vui lòng xác nhận để kích hoạt tài khoản nhân viên của bạn.
                                    </Typography>

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={handleAcceptInvite}
                                        sx={{
                                            py: "14px",
                                            borderRadius: "12px",
                                            bgcolor: "var(--palette-text-primary)",
                                            color: "white",
                                            fontWeight: 700,
                                            fontSize: "1rem",
                                            textTransform: "none",
                                            boxShadow: "0 8px 16px 0 rgba(28, 37, 46, 0.24)",
                                            "&:hover": {
                                                bgcolor: "#454F5B"
                                            }
                                        }}
                                    >
                                        Chấp nhận Lời mời
                                    </Button>

                                    <Box sx={{ mt: 3 }}>
                                        <Button
                                            startIcon={<ArrowBackIcon />}
                                            onClick={() => navigate(ROUTES.ADMIN.AUTH.LOGIN)}
                                            sx={{ textTransform: "none", color: "text.primary", fontWeight: 600 }}
                                        >
                                            Quay lại Đăng nhập
                                        </Button>
                                    </Box>
                                </motion.div>
                            )}

                            {step === STEPS.LOADING && (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ textAlign: "center", py: 4 }}
                                >
                                    <CircularProgress size={60} sx={{ color: "var(--palette-text-primary)", mb: 3 }} />
                                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                                        Đang xử lý...
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Vui lòng chờ trong giây lát khi chúng tôi xác thực lời mời và kích hoạt tài khoản của bạn.
                                    </Typography>
                                </motion.div>
                            )}

                            {step === STEPS.SUCCESS && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                    style={{ textAlign: "center" }}
                                >
                                    <Box sx={{ 
                                        width: 80, 
                                        height: 80, 
                                        borderRadius: "50%", 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center", 
                                        bgcolor: "rgba(34, 197, 94, 0.1)", 
                                        color: "#22C55E", 
                                        mx: "auto", 
                                        mb: 3 
                                    }}>
                                        <CheckIcon sx={{ fontSize: 48 }} />
                                    </Box>

                                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: "#22C55E" }}>
                                        Thành công!
                                    </Typography>
                                    
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 4, lineHeight: 1.6 }}>
                                        Tài khoản của bạn đã được kích hoạt thành công. Quyền hạn nhân viên đã được đồng bộ hóa với hệ thống Đại Phát.
                                    </Typography>

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={() => navigate(ROUTES.ADMIN.AUTH.LOGIN)}
                                        sx={{
                                            py: "14px",
                                            borderRadius: "12px",
                                            bgcolor: "var(--palette-text-primary)",
                                            color: "white",
                                            fontWeight: 700,
                                            fontSize: "1rem",
                                            textTransform: "none",
                                            boxShadow: "0 8px 16px 0 rgba(28, 37, 46, 0.24)",
                                            "&:hover": {
                                                bgcolor: "#454F5B"
                                            }
                                        }}
                                    >
                                        Đăng nhập Ngay
                                    </Button>
                                </motion.div>
                            )}

                            {step === STEPS.ERROR && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ textAlign: "center" }}
                                >
                                    <Box sx={{ 
                                        width: 80, 
                                        height: 80, 
                                        borderRadius: "50%", 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center", 
                                        bgcolor: "rgba(239, 68, 68, 0.1)", 
                                        color: "#EF4444", 
                                        mx: "auto", 
                                        mb: 3 
                                    }}>
                                        <ErrorIcon sx={{ fontSize: 48 }} />
                                    </Box>

                                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: "#EF4444" }}>
                                        Đã xảy ra lỗi
                                    </Typography>
                                    
                                    <Typography variant="body1" sx={{ color: "text.secondary", mb: 4, lineHeight: 1.6 }}>
                                        {errorMessage || "Lời mời của bạn không hợp lệ hoặc đã hết hạn sử dụng."}
                                    </Typography>

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={() => navigate(ROUTES.ADMIN.AUTH.LOGIN)}
                                        sx={{
                                            py: "14px",
                                            borderRadius: "12px",
                                            bgcolor: "var(--palette-text-primary)",
                                            color: "white",
                                            fontWeight: 700,
                                            fontSize: "1rem",
                                            textTransform: "none",
                                            boxShadow: "0 8px 16px 0 rgba(28, 37, 46, 0.24)",
                                            "&:hover": {
                                                bgcolor: "#454F5B"
                                            }
                                        }}
                                    >
                                        Quay lại Đăng nhập
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Paper>
                </Box>
            </div>
        </ThemeProvider>
    );
};
