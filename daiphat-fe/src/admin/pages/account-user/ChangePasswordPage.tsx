import { useState } from "react";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { useChangeUserPassword, useUserDetail } from "./hooks/useAccountUser";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { changePasswordSchema, ChangePasswordFormValues } from "../../schemas/account-user.schema";
import { prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import {
    Box,
    TextField,
    Button,
    Typography,
    Card,
    CircularProgress
} from "@mui/material";
import { useForgotPassword } from "../authen/hooks/use-forgot-password";
import { PasswordRequirementList } from "../../components/auth/PasswordRequirementList";

export const ChangePasswordPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: user, isLoading } = useUserDetail(id);
    const { mutate: changePassword, isPending } = useChangeUserPassword();
    const { usePasswordPolicy } = useForgotPassword();
    const { data: passwordPolicy } = usePasswordPolicy();

    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const {
        control,
        handleSubmit,
        watch,
    } = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const passwordValue = watch("password", "");

    const checkAllMet = () => {
        if (!passwordPolicy) return true;
        const pwd = passwordValue || "";
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

    const onSubmit = (data: ChangePasswordFormValues) => {
        if (!isPasswordValid) {
            toast.warning("Mật khẩu chưa đạt yêu cầu bảo mật");
            return;
        }

        changePassword({ id: id!, data }, {
            onSuccess: () => {
                toast.success("Đổi mật khẩu thành công!");
                navigate(`/${prefixAdmin}/account-user/list`);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Đổi mật khẩu thất bại");
            }
        });
    };

    if (isLoading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
        </Box>
    );

    return (
        <Box sx={{ maxWidth: '600px', mx: 'auto' }}>
            <Box sx={{ mb: 5 }}>
                <Title title="Đổi mật khẩu" />
                <Breadcrumb
                    items={[
                        { label: "Dashboard", to: "/" },
                        { label: "Khách hàng", to: `/${prefixAdmin}/account-user/list` },
                        { label: "Đổi mật khẩu" }
                    ]}
                />
            </Box>

            <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)" }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, fontSize: '1rem' }}>
                    Đổi mật khẩu cho: {user?.fullName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary', fontSize: '0.8125rem' }}>
                    Email: {user?.email}
                </Typography>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Controller
                                name="password"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Mật khẩu mới"
                                        type="password"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        onFocus={() => setIsPasswordFocused(true)}
                                        onBlur={() => setIsPasswordFocused(false)}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } }}
                                    />
                                )}
                            />
                            {passwordPolicy && (isPasswordFocused || passwordValue) && !isPasswordValid && (
                                <PasswordRequirementList
                                    password={passwordValue}
                                    policy={passwordPolicy}
                                />
                            )}
                        </Box>

                        <Controller
                            name="confirmPassword"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    label="Xác nhận mật khẩu mới"
                                    type="password"
                                    fullWidth
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } }}
                                />
                            )}
                        />

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate(-1)}
                                sx={{
                                    borderRadius: "var(--shape-borderRadius)",
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    borderColor: 'rgba(145, 158, 171, 0.3)',
                                    color: 'var(--palette-text-primary)',
                                    '&:hover': {
                                        borderColor: 'var(--palette-text-primary)',
                                        bgcolor: 'rgba(28, 37, 46, 0.04)'
                                    }
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={isPending || !isPasswordValid}
                                sx={{
                                    bgcolor: 'var(--palette-text-primary)',
                                    color: "var(--palette-common-white)",
                                    borderRadius: "var(--shape-borderRadius)",
                                    px: 4,
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    boxShadow: 'none',
                                    '&:hover': { bgcolor: "var(--palette-grey-700)", boxShadow: 'none' },
                                    "&.Mui-disabled": {
                                        backgroundColor: "rgba(145, 158, 171, 0.24)",
                                        color: "rgba(145, 158, 171, 0.8)",
                                        boxShadow: "none"
                                    }
                                }}
                            >
                                {isPending ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                            </Button>
                        </Box>
                    </Box>
                </form>
            </Card>
        </Box>
    );
};
