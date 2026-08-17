"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "@/admin/components/navigation/AdminLink";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { userService } from "@/shared/auth/services/user.service";
import { toast } from "react-toastify";
import { ROUTES } from "@/admin/constants/routes";
import { PERMISSIONS } from "@/admin/constants/permission.constants";
import { useAdminSession } from "@/admin/context/AdminSessionProvider";
import { useForgotPassword } from "@/shared/auth/hooks/useForgotPassword";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { 
    Box, 
    Button, 
    Checkbox, 
    Container, 
    FormControlLabel, 
    Paper, 
    TextField, 
    Typography, 
    Avatar,
    InputAdornment,
    IconButton,
    CircularProgress,
    ThemeProvider
} from "@mui/material";
import { 
    PhoneOutlined as PhoneIcon,
    Visibility,
    VisibilityOff
} from "@mui/icons-material";
import { SiteLogo } from "@/client/components/layout/SiteLogo";
import { SettingsIcon, EyeIcon, NoEyeIcon } from "@/admin/assets/icons";
import { adminTheme } from "@/admin/config/theme";
import { PasswordRequirementList } from "@/admin/components/auth/PasswordRequirementList";

const setupSchema = z.object({
    password: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    phoneNumber: z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, "Số điện thoại không đúng định dạng"),
    agreedToTerms: z.boolean().refine(val => val === true, "Bạn phải đồng ý với điều khoản sử dụng")
}).refine((data) => {
    if (!data.password && !data.confirmPassword) return true;
    return data.password === data.confirmPassword;
}, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
});

type SetupFormData = z.infer<typeof setupSchema>;

export const ProfileSetupPage: React.FC = () => {
    const { user, set } = useAuthStore();
    const { isUserLoading } = useAdminSession();
    const { usePasswordPolicy } = useForgotPassword();
    const { data: passwordPolicy } = usePasswordPolicy();
    
    const router = useAdminRouter();
    const pathname = usePathname() ?? '';
    const searchParamsForLocation = useSearchParams();
    
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const { register, handleSubmit, watch, formState: { errors } } = useForm<SetupFormData>({
        resolver: zodResolver(setupSchema),
        defaultValues: {
            agreedToTerms: false,
            phoneNumber: ""
        }
    });

    const passwordValue = watch("password", "") || "";

    const checkAllMet = () => {
        if (!passwordPolicy) return true; // Minimal fallback
        const { minLength, maxLength, requirements } = passwordPolicy;

        const isMinMet = passwordValue.length >= minLength;
        const isMaxMet = !maxLength || (passwordValue.length <= maxLength && passwordValue.length > 0);

        const filteredReqs = requirements.filter(req =>
            !req.description.toLowerCase().includes(`${minLength} ký tự`) &&
            (!maxLength || !req.description.toLowerCase().includes(`${maxLength} ký tự`))
        );

        const isReqsMet = filteredReqs.every(req => new RegExp(req.regex).test(passwordValue));
        
        return isMinMet && isMaxMet && isReqsMet;
    };

    const isPasswordPolicyValid = !passwordValue || checkAllMet();

    const queryClient = useQueryClient();
    
    const onSubmit = async (data: SetupFormData) => {
        if (!user?.hasPassword && !data.password) {
            toast.warning("Vui lòng thiết lập mật khẩu mới");
            return;
        }
        if (!isPasswordPolicyValid) {
            toast.warning("Mật khẩu chưa đạt yêu cầu bảo mật");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await userService.setupProfile({
                password: data.password,
                phoneNumber: data.phoneNumber,
                agreedToTerms: data.agreedToTerms
            });

            if (response.isSuccess) {
                toast.success("Thiết lập hồ sơ thành công!");
                
                // Invalidate query to ensure fresh profile data
                await queryClient.invalidateQueries({ queryKey: ["admin-me"] });

                if (user) {
                    const isAdmin = user.role?.code?.includes('STAFF') || 
                                   user.permissions?.includes(PERMISSIONS.DASHBOARD.SYSTEM);
                                   
                    set({ 
                        user: { 
                            ...user, 
                            hasPassword: true, 
                            agreedToTerms: true,
                            phone: data.phoneNumber 
                        } 
                    });

                    const destination = isAdmin ? ROUTES.ADMIN.DASHBOARD.ROOT : ROUTES.PUBLIC.HOME;
                    router.replace(destination);
                }
            } else {
                toast.error(response.message || "Có lỗi xảy ra khi cập nhật hồ sơ.");
            }
        } catch (error: any) {
            console.error("Setup profile error:", error);
            toast.error(error?.response?.data?.message || "Không thể kết nối đến máy chủ.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isUserLoading && !user) {
        return (
            <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#F4F6F8" }}>
                <CircularProgress color="primary" />
            </Box>
        );
    }

    if (!user) return null;

    const isAdminRoute = pathname.startsWith("/admin");

    return (
        <ThemeProvider theme={adminTheme}>
            <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] relative overflow-hidden font-public-sans">
                {/* Decorative Background Elements */}
                <Box sx={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    top: 0,
                    left: 0,
                    zIndex: 0,
                    pointerEvents: "none"
                }}>
                    <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-[#1C252E] opacity-[0.03] blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[#1C252E] opacity-[0.03] blur-[100px]" />
                </Box>

                {/* Header with Logo */}
                {isAdminRoute && (
                    <Container
                        disableGutters
                        maxWidth={false}
                        sx={{
                            height: "72px",
                            px: "calc(3 * var(--spacing))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            position: "fixed",
                            top: "0",
                            left: "0",
                            zIndex: "1101",
                            background: "transparent"
                        }}>
                        <Link href="/" className="inline-block w-[40px] h-[40px]">
                            <SiteLogo className="w-10 h-10 rounded" imgClassName="w-full h-full object-contain" />
                        </Link>
                        <IconButton
                            className="hover:scale-[1.04] hover:bg-admin-hoverIcon transition-all duration-150 ease-in-out"
                            sx={{ padding: 0 }}
                        >
                            <SettingsIcon
                                sx={{
                                    color: "var(--palette-text-secondary)",
                                    fontSize: "1.375rem",
                                    animation: "spin 10s linear infinite",
                                    "@keyframes spin": {
                                        "0%": { transform: "rotate(0deg)" },
                                        "100%": { transform: "rotate(360deg)" }
                                    }
                                }}
                            />
                        </IconButton>
                    </Container>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ zIndex: 1, width: "100%", maxWidth: "480px", padding: "16px" }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            padding: { xs: "24px", sm: "40px" },
                            borderRadius: { xs: "16px", sm: "24px" },
                            backgroundColor: "#FFFFFF",
                            boxShadow: "0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)",
                            display: "flex",
                            flexDirection: "column",
                            gap: { xs: "24px", sm: "32px" }
                        }}
                    >
                        <Box sx={{ textAlign: "center" }}>
                            <Avatar 
                                src={user.avatar} 
                                sx={{ 
                                    width: 80, 
                                    height: 80, 
                                    margin: "0 auto 16px",
                                    border: "2px solid #F4F6F8",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                                }} 
                            />
                            <Typography variant="h4" sx={{ 
                                fontWeight: 700, 
                                mb: 1, 
                                color: "var(--palette-text-primary)", 
                                fontSize: { xs: "1.5rem", sm: "1.75rem" } 
                            }}>
                                Chào mừng, {user.firstName || "Sếp"}!
                            </Typography>
                            <Typography variant="body2" sx={{ 
                                color: "var(--palette-text-secondary)", 
                                fontSize: "0.875rem" 
                            }}>
                                Vui lòng hoàn tất thiết lập để bảo mật tài khoản.
                            </Typography>
                        </Box>

                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                                <TextField
                                    fullWidth
                                    label="Số điện thoại"
                                    {...register("phoneNumber")}
                                    error={!!errors.phoneNumber}
                                    helperText={errors.phoneNumber?.message}
                                    placeholder="Ví dụ: 0987654321"
                                    slotProps={{
                                        input: {
                                            sx: { borderRadius: "12px" },
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <PhoneIcon sx={{ color: "var(--palette-text-disabled)", fontSize: "1.25rem" }} />
                                                </InputAdornment>
                                            ),
                                        }
                                    }}
                                />

                                <Box>
                                    <TextField
                                        fullWidth
                                        label={!user.hasPassword ? "Mật khẩu mới *" : "Mật khẩu mới (Tùy chọn)"}
                                        type={showPassword ? "text" : "password"}
                                        {...register("password")}
                                        onFocus={() => setIsPasswordFocused(true)}
                                        onBlur={() => setIsPasswordFocused(false)}
                                        error={!!errors.password}
                                        helperText={errors.password?.message}
                                        slotProps={{
                                            input: {
                                                sx: { borderRadius: "12px" },
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                            {showPassword ? <NoEyeIcon /> : <EyeIcon />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }
                                        }}
                                    />
                                    {passwordPolicy && (isPasswordFocused || passwordValue) && !isPasswordPolicyValid && (
                                        <PasswordRequirementList
                                            password={passwordValue}
                                            policy={passwordPolicy}
                                        />
                                    )}
                                </Box>

                                <TextField
                                    fullWidth
                                    label="Xác nhận mật khẩu"
                                    type={showPassword ? "text" : "password"}
                                    {...register("confirmPassword")}
                                    error={!!errors.confirmPassword}
                                    helperText={errors.confirmPassword?.message}
                                    slotProps={{
                                        input: {
                                            sx: { borderRadius: "12px" }
                                        }
                                    }}
                                />

                                <Box sx={{ textAlign: "left" }}>
                                    <FormControlLabel
                                        control={<Checkbox {...register("agreedToTerms")} color="primary" />}
                                        label={
                                            <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                                                Tôi đồng ý với <strong>điều khoản</strong> của DaiPhat.
                                            </Typography>
                                        }
                                    />
                                    {errors.agreedToTerms && (
                                        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
                                            {errors.agreedToTerms.message}
                                        </Typography>
                                    )}
                                </Box>

                                <Button
                                    fullWidth
                                    type="submit"
                                    variant="contained"
                                    disabled={isSubmitting || !isPasswordPolicyValid}
                                    sx={{ 
                                        py: "14px", 
                                        borderRadius: "12px",
                                        backgroundColor: "var(--palette-text-primary)",
                                        color: "#FFFFFF",
                                        textTransform: "none",
                                        fontSize: "1rem",
                                        fontWeight: 700,
                                        boxShadow: "0 8px 16px 0 rgba(28, 37, 46, 0.24)",
                                        "&:hover": {
                                            backgroundColor: "#454F5B",
                                        },
                                        "&.Mui-disabled": {
                                            backgroundColor: "rgba(145, 158, 171, 0.24)",
                                            color: "rgba(145, 158, 171, 0.8)",
                                            boxShadow: "none"
                                        }
                                    }}
                                >
                                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Hoàn tất thiết lập"}
                                </Button>
                            </Box>
                        </form>
                    </Paper>
                </motion.div>
            </div>
        </ThemeProvider>
    );
};
