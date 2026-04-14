import { useState } from "react"
import { Box, Button, Container, TextField, ThemeProvider, Typography, InputAdornment, IconButton, Paper, useMediaQuery, useTheme, CircularProgress } from "@mui/material"
import { Link } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { LogoAdmin } from "../../../assets/admin/logo"
import { SettingsIcon, EyeIcon, NoEyeIcon } from "../../assets/icons"
import { adminTheme } from "../../config/theme"
import { loginSchema, LoginFormValues } from "../../schemas/login.schema"
import { useLogin } from "./hooks/use-login"
import { motion, AnimatePresence } from "framer-motion"

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.87 14.13c-.22-.67-.35-1.39-.35-2.13s.13-1.46.35-2.13V7.03H2.18C1.43 8.52 1 10.21 1 12s.43 3.48 1.18 4.97l3.69-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.69 2.84c.86-2.59 3.28-4.51 6.13-4.51z" fill="#EA4335" />
    </svg>
)

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

    const { mutate: loginMutate, isPending } = useLogin()

    const onSubmit = (data: LoginFormValues) => {
        loginMutate(data)
    }

    return (
        <>
            <ThemeProvider theme={adminTheme}>
                <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] relative overflow-hidden">
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
                        <Link to="/" className="inline-block w-[40px] h-[40px]">
                            <LogoAdmin />
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
                    </Container>

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
                                                label="Tên đăng nhập"
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
                                             <Link to='/admin/auth/forgot-password' style={{ fontSize: "0.875rem", color: "var(--palette-text-primary)", fontWeight: 600, textDecoration: "none" }} className="hover:underline">
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

                            <DividerWithText text="HOẶC" />

                            <motion.div
                                whileHover={{ scale: 1.02, boxShadow: "0 8px 16px rgba(0,0,0,0.05)" }}
                                whileTap={{ scale: 0.98 }}
                            >
                                 <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<GoogleIcon />}
                                    sx={{
                                        py: "12px",
                                        borderRadius: "12px",
                                        borderColor: "#DFE3E8",
                                        color: "var(--palette-text-primary)",
                                        textTransform: "none",
                                        fontWeight: 600,
                                        fontSize: "1rem",
                                        backgroundColor: "#FFFFFF",
                                        "&:hover": {
                                            borderColor: "#1C252E",
                                            backgroundColor: "rgba(28, 37, 46, 0.04)"
                                        }
                                    }}
                                >
                                    Đăng nhập bằng Google
                                </Button>
                            </motion.div>
                        </Paper>
                    </motion.div>
                </div>
            </ThemeProvider>
        </>
    )
}

const DividerWithText = ({ text }: { text: string }) => (
    <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
        <Box sx={{ flex: 1, height: "1px", backgroundColor: "#DFE3E8" }} />
        <Typography variant="overline" sx={{ px: 2, color: "var(--palette-text-disabled)", fontWeight: 700 }}>
            {text}
        </Typography>
        <Box sx={{ flex: 1, height: "1px", backgroundColor: "#DFE3E8" }} />
    </Box>
)
