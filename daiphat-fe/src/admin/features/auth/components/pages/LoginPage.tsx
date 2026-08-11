"use client";

import Link from "@/admin/components/navigation/AdminLink";
import { useEffect, useState } from "react"
import {
    Box, Button, TextField, ThemeProvider, Typography, InputAdornment,
    IconButton, Paper, useMediaQuery, useTheme, CircularProgress
} from "@mui/material"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { SiteLogo } from "@/client/components/layout/SiteLogo"
import { SettingsIcon, EyeIcon, NoEyeIcon } from "@/admin/assets/icons"
import { adminTheme } from "@/admin/config/theme"
import { loginSchema, LoginFormValues } from "@/admin/features/auth/schemas/login.schema"
import { useAuth } from "@/admin/features/auth/hooks/useAuth"
import { motion } from "framer-motion"
import { ROUTES } from "@/admin/constants/routes"
import { prefetchAdminPageChunk } from "@/admin/lib/adminPagePrefetchRegistry";

export const LoginPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [showPassword, setShowPassword] = useState(false);
    const handleTogglePasswordVisibility = () => {
        setShowPassword(prev => !prev)
    }

    const {
        control,
        handleSubmit,
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: "",
            password: ""
        },
    })

    const { login: loginMutate, isLoading: isPending, isRedirecting } = useAuth()

    useEffect(() => {
        prefetchAdminPageChunk(ROUTES.ADMIN.DASHBOARD.SYSTEM);
    }, []);

    const onSubmit = (data: LoginFormValues) => {
        loginMutate(data)
    }

    return (
        <>
            <ThemeProvider theme={adminTheme}>
                <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] relative overflow-hidden">
                    {isRedirecting && (
                        <Box
                            sx={{
                                position: "fixed",
                                inset: 0,
                                zIndex: 2000,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 2,
                                bgcolor: "rgba(244, 246, 248, 0.92)",
                            }}
                        >
                            <CircularProgress size={36} thickness={4} sx={{ color: "#B71833" }} />
                            <Typography sx={{ color: "#637381", fontWeight: 600 }}>
                                Đang vào hệ thống...
                            </Typography>
                        </Box>
                    )}
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

                    <Box
                        sx={{
                            height: "72px",
                            px: "calc(3 * var(--spacing))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            position: "fixed",
                            top: "0",
                            left: "0",
                            right: "0",
                            zIndex: "1101",
                            background: "transparent"
                        }}>
                        <Link href="/" className="inline-block w-[40px] h-[40px]">
                            <SiteLogo className="w-10 h-10 rounded" imgClassName="w-full h-full object-contain" />
                        </Link>
                        <Button
                            className="hover:scale-[1.04] hover:bg-admin-hoverIcon transition-all duration-150 ease-in-out"
                            sx={{
                                minWidth: 0,
                                padding: 0,
                            }}>
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
                        </Button>
                    </Box>

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
                                <Typography variant="h4" sx={{ 
                                    fontWeight: 700, 
                                    mb: 1, 
                                    color: "var(--palette-text-primary)", 
                                    fontSize: { xs: "1.75rem", sm: "2rem" } 
                                }}>
                                    Đăng nhập
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                    color: "var(--palette-text-secondary)", 
                                    fontSize: { xs: "0.875rem", sm: "1rem" } 
                                }}>
                                    Nhập chi tiết của bạn bên dưới.
                                </Typography>
                            </Box>

                            <form onSubmit={handleSubmit(onSubmit)}>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                                    <Controller
                                        name="username"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Tên đăng nhập hoặc Email"
                                                fullWidth
                                                disabled={isPending}
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                                slotProps={{
                                                    input: {
                                                        sx: { borderRadius: "12px", fontSize: "1rem" }
                                                    },
                                                    inputLabel: {
                                                        sx: { fontSize: "1rem" }
                                                    }
                                                }}
                                            />
                                        )}
                                    />
                                    
                                    <Box sx={{ position: "relative" }}>
                                        <Controller
                                            name="password"
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    label="Mật khẩu"
                                                    type={showPassword ? "text" : "password"}
                                                    fullWidth
                                                    disabled={isPending}
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    slotProps={{
                                                        input: {
                                                            sx: { borderRadius: "12px", fontSize: "1rem" },
                                                            endAdornment: (
                                                                <InputAdornment position="end">
                                                                    <IconButton
                                                                        onClick={handleTogglePasswordVisibility}
                                                                        edge="end"
                                                                        disabled={isPending}
                                                                    >
                                                                        {showPassword ? <NoEyeIcon /> : <EyeIcon />}
                                                                    </IconButton>
                                                                </InputAdornment>
                                                            )
                                                        },
                                                        inputLabel: {
                                                            sx: { fontSize: "1rem" }
                                                        }
                                                    }}
                                                />
                                            )}
                                        />
                                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                                             <Link href={ROUTES.ADMIN.AUTH.FORGOT_PASSWORD} style={{ fontSize: "0.875rem", color: "var(--palette-text-primary)", fontWeight: 600, textDecoration: "none" }} className="hover:underline">
                                                Quên mật khẩu?
                                             </Link>
                                        </Box>
                                    </Box>

                                     <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={isPending}
                                        fullWidth
                                        sx={{
                                            py: "14px",
                                            borderRadius: "12px",
                                            backgroundColor: "var(--palette-text-primary)",
                                            color: "#FFFFFF",
                                            textTransform: "none",
                                            fontSize: "1rem",
                                            fontWeight: 700,
                                            boxShadow: "0 8px 16px 0 rgba(28, 37, 46, 0.24)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "12px",
                                            "&:hover": {
                                                backgroundColor: "#454F5B",
                                            }
                                        }}
                                    >
                                        {isPending ? (
                                            <>
                                                <CircularProgress size={20} color="inherit" thickness={5} />
                                                <span>Đang xử lý...</span>
                                            </>
                                        ) : (
                                            "Đăng nhập"
                                        )}
                                    </Button>
                                </Box>
                            </form>
                        </Paper>
                    </motion.div>
                </div>
            </ThemeProvider>
        </>
    )
}
