"use client";

import { useEffect, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
    Box, Card, Stack, Typography, Avatar, CircularProgress, TextField, InputAdornment, IconButton, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import Grid from "@mui/material/Grid";
import { Icon } from '@/admin/components/ui/AdminIcon';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { useUpdateUser } from "../../hooks/useUsers";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountAdminSchema } from "../../../../schemas/account-admin.schema";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { uploadImagesToCloudinary } from "@/admin/shared/services/uploadCloudinary.service";
import { Button } from '../../../../components/ui/Button';
import * as zod from "zod";
import { useAuthStore } from "../../../../../stores/useAuthStore";
import { authService } from "../../../../pages/authen/services/auth.service";
import { PasswordPolicy } from "../../../../pages/authen/types/auth.type";

const passwordSchema = zod.object({
    currentPassword: zod.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: zod.string().min(1, "Vui lòng nhập mật khẩu mới"),
    confirmPassword: zod.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
});

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof AxiosError) {
        return error.response?.data?.message || fallback;
    }
    return fallback;
};

// Component con hiển thị Checklist yêu cầu mật khẩu
const PasswordRequirementList = ({ password, policy }: { password: string; policy: PasswordPolicy }) => {
    const { requirements, minLength, maxLength } = policy;
    const pwd = password || "";

    // Lọc bỏ các requirement từ BE nếu nó trùng lặp với logic minLength/maxLength
    const filteredRequirements = requirements.filter(req =>
        !req.description.toLowerCase().includes(`${minLength} ký tự`) &&
        (!maxLength || !req.description.toLowerCase().includes(`${maxLength} ký tự`))
    );

    const items = [
        {
            id: 'min-length',
            description: `Ít nhất ${minLength} ký tự`,
            isMet: pwd.length >= minLength
        },
        ...filteredRequirements.map(req => ({
            id: req.id,
            description: req.description,
            isMet: new RegExp(req.regex).test(pwd)
        }))
    ];

    if (maxLength) {
        items.push({
            id: 'max-length',
            description: `Tối đa ${maxLength} ký tự`,
            isMet: pwd.length <= maxLength && pwd.length > 0
        });
    }

    return (
        <Stack spacing={1.5} sx={{ mt: 2, p: 2.5, bgcolor: 'var(--palette-background-neutral)', borderRadius: '16px', border: '1px solid var(--palette-divider)' }}>
            <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 800, textTransform: 'uppercase', mb: 1, display: 'block', letterSpacing: 1 }}>
                Yêu cầu mật khẩu
            </Typography>
            {items.map((item) => {
                // Chỉ hiện "Không chứa khoảng trắng" nếu người dùng thực sự nhập sai (có space)
                const isNoSpaceRequirement = item.description.toLowerCase().includes("khoảng trắng");
                if (isNoSpaceRequirement && item.isMet) return null;

                return (
                    <Stack key={item.id} direction="row" spacing={1.5} alignItems="center">
                        <Icon
                            icon={item.isMet ? "solar:check-circle-bold" : "solar:reorder-circle-bold"}
                            color={item.isMet ? "var(--palette-success-main)" : "var(--palette-text-disabled)"}
                            width={20}
                        />
                        <Typography
                            variant="body2"
                            sx={{
                                color: item.isMet ? 'var(--palette-text-primary)' : 'var(--palette-text-secondary)',
                                fontWeight: item.isMet ? 700 : 500,
                                transition: 'all 0.2s'
                            }}
                        >
                            {item.description}
                        </Typography>
                    </Stack>
                );
            })}
        </Stack>
    );
};

export const ProfilePage = () => {
    const { user } = useAuthStore();
    const id = user?.id;

    // States
    const [activeTab, setActiveTab] = useState<"general" | "security">("general");
    const [isEditing, setIsEditing] = useState(false);
    const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);

    // Use user from store as source of truth for self profile
    const account = user;

    const { mutate: update, isPending: isUpdating } = useUpdateUser();
    const { mutate: changePassword, isPending: isChangingPassword } = useMutation({
        mutationFn: authService.changePassword,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const res = await authService.getPasswordPolicy();
                if (res.data) setPasswordPolicy(res.data);
            } catch (err) {
                console.error("Failed to fetch password policy", err);
            }
        };
        fetchPolicy();
    }, []);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
    } = useForm<zod.infer<typeof accountAdminSchema>>({
        resolver: zodResolver(accountAdminSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            roles: [],
            status: "ACTIVE",
            avatar: "",
        },
    });

    const passwordForm = useForm<zod.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const newPassword = passwordForm.watch("newPassword");
    const avatar = watch("avatar") ?? undefined;

    // Kiểm tra xem mật khẩu có thỏa mãn mọi yêu cầu không
    const checkAllMet = () => {
        if (!passwordPolicy) return false;
        const pwd = newPassword || "";
        const { minLength, maxLength, requirements } = passwordPolicy;

        const isMinMet = pwd.length >= minLength;
        const isMaxMet = !maxLength || (pwd.length <= maxLength && pwd.length > 0);

        // Chỉ kiểm tra những requirements KHÔNG bị filter ở UI
        const filteredReqs = requirements.filter(req =>
            !req.description.toLowerCase().includes(`${minLength} ký tự`) &&
            (!maxLength || !req.description.toLowerCase().includes(`${maxLength} ký tự`))
        );

        const isReqsMet = filteredReqs.every(req => new RegExp(req.regex).test(pwd));

        return isMinMet && isMaxMet && isReqsMet;
    };

    const allRequirementsMet = checkAllMet();
    const isPasswordValid = allRequirementsMet;

    useEffect(() => {
        if (account) {
            reset({
                firstName: account.firstName || "",
                lastName: account.lastName || "",
                email: account.email,
                phone: account.phone || "",
                roles: account.role ? [account.role.id] : [],
                status: account.status as zod.infer<typeof accountAdminSchema>["status"],
                avatar: account.avatarUrl || account.avatar || undefined,
            });
        }
    }, [account, reset]);

    const handleOpenFile = () => {
        if (isEditing) fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            setIsUploading(true);
            const [url] = await uploadImagesToCloudinary([file]);
            setValue("avatar", url, { shouldValidate: true });
            toast.success("Tải ảnh đại diện thành công!");
        } catch (error) {
            toast.error("Tải ảnh đại diện thất bại!");
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = (data: zod.infer<typeof accountAdminSchema>) => {
        const payload = {
            ...data,
            avatar: data.avatar ?? undefined,
        };

        update({ id: id!, data: payload }, {
            onSuccess: () => {
                toast.success("Cập nhật thông tin thành công!");
                setIsEditing(false);
            },
            onError: (error: unknown) => {
                toast.error(getErrorMessage(error, "Cập nhật thất bại"));
            }
        });
    };

    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const onPasswordSubmit = (data: zod.infer<typeof passwordSchema>) => {
        if (!isPasswordValid) {
            toast.error("Mật khẩu chưa thỏa mãn các yêu cầu bảo mật!");
            return;
        }
        changePassword(data, {
            onSuccess: () => {
                toast.success("Đổi mật khẩu thành công!");
                passwordForm.reset();
            },
            onError: (error: unknown) => {
                toast.error(getErrorMessage(error, "Đổi mật khẩu thất bại"));
            }
        });
    };

    // No more global loading spinner as store data is instant


    return (
        <Box sx={{ maxWidth: '1200px', mx: 'auto', pb: 10 }}>
            {/* Header Area */}
            <PageHeader
                title="Quản lý hồ sơ"
                breadcrumbItems={[
                    { label: "Trang chủ", to: "/" },
                    { label: "Admin", to: "#" },
                    { label: "Hồ sơ cá nhân" }
                ]}
            />

            {/* Profile Header Card */}
            <Card sx={{
                p: { xs: 2.5, md: 3 },
                mb: 4,
                borderRadius: "16px",
                boxShadow: "var(--customShadows-card)",
                display: 'flex',
                alignItems: 'center',
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' },
                gap: 3,
                justifyContent: 'space-between',
                border: '1px solid var(--palette-divider)'
            }}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={3}
                    alignItems="center"
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                    <Box sx={{ position: 'relative' }}>
                        <Avatar
                            src={avatar}
                            onClick={handleOpenFile}
                            sx={{
                                width: 88,
                                height: 88,
                                borderRadius: '50%',
                                cursor: isEditing ? 'pointer' : 'default',
                                bgcolor: 'var(--palette-primary-main)',
                                border: '2px solid var(--palette-background-paper)',
                                boxShadow: '0 0 0 1px var(--palette-divider)',
                                transition: 'all 0.3s',
                                fontSize: '2rem',
                                fontWeight: 800,
                                color: 'white'
                            }}
                        >
                            {account?.firstName || account?.lastName ? (
                                `${account?.lastName?.charAt(0) || ''}${account?.firstName?.charAt(0) || ''}`.toUpperCase()
                            ) : (
                                <Icon icon="solar:user-bold" width={32} />
                            )}
                        </Avatar>
                        {isEditing && (
                            <Box sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                bgcolor: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                transition: 'opacity 0.2s',
                                borderRadius: '50%',
                                '&:hover': { opacity: 0.9 }
                            }}>
                                <Icon icon="solar:camera-bold-duotone" width={28} />
                            </Box>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                        />
                        {isUploading && (
                            <CircularProgress size={24} sx={{ position: 'absolute', top: 32, left: 32, zIndex: 10 }} />
                        )}
                    </Box>

                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--palette-text-primary)', textTransform: 'capitalize' }}>
                            {account?.lastName} {account?.firstName}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Icon icon="solar:shield-check-bold" color="var(--palette-primary-main)" width={16} />
                            <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 600 }}>
                                {account?.role?.name || "Member"}
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>

                {activeTab === "general" && (
                    <Button
                        variant="contained"
                        fullWidth={false}
                        onClick={() => setIsEditing(!isEditing)}
                        sx={{
                            borderRadius: "12px",
                            px: { xs: 2, sm: 2.5 },
                            height: { xs: 40, sm: 42 },
                            width: { xs: '100%', sm: 'auto' },
                            bgcolor: isEditing ? 'var(--palette-error-main)' : 'var(--palette-primary-main)',
                            color: 'white',
                            boxShadow: isEditing ? 'none' : 'var(--customShadows-primary)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                bgcolor: isEditing ? 'var(--palette-error-dark)' : 'var(--palette-primary-dark)',
                                transform: { xs: 'none', sm: 'translateY(-2px)' },
                                boxShadow: isEditing ? 'none' : 'var(--customShadows-z12)',
                            },
                        }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                            <Icon
                                icon={isEditing ? "solar:close-circle-bold" : "solar:pen-bold"}
                                width={20}
                                height={20}
                                style={{ color: 'white' }}
                            />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                                {isEditing ? "Hủy bỏ" : "Chỉnh sửa"}
                            </Typography>
                        </Stack>
                    </Button>
                )}
            </Card>

            <Grid container spacing={4}>
                {/* Sidebar Navigation - Optimized for Responsive */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{
                        borderRadius: "16px",
                        boxShadow: "none",
                        border: '1px solid var(--palette-divider)',
                        bgcolor: 'var(--palette-background-neutral)',
                        overflow: 'hidden'
                    }}>
                        <List
                            component="nav"
                            sx={{
                                p: 1,
                                display: { xs: 'flex', md: 'block' },
                                overflowX: { xs: 'auto', md: 'visible' },
                                whiteSpace: 'nowrap',
                                '&::-webkit-scrollbar': { display: 'none' }, // Ẩn scrollbar cho đẹp
                                msOverflowStyle: 'none',
                                scrollbarWidth: 'none',
                            }}
                        >
                            {[
                                { id: "general", label: "Hồ sơ", icon: "solar:user-id-bold" },
                                { id: "security", label: "Bảo mật", icon: "solar:lock-password-bold" },
                            ].map((tab) => (
                                <ListItemButton
                                    key={tab.id}
                                    selected={activeTab === tab.id}
                                    onClick={() => { setActiveTab(tab.id as "general" | "security"); setIsEditing(false); }}
                                    sx={{
                                        borderRadius: "12px",
                                        mb: { xs: 0, md: 1 },
                                        mr: { xs: 1, md: 0 },
                                        py: { xs: 1.2, md: 1.8 },
                                        px: { xs: 2, md: 2.5 },
                                        minWidth: { xs: 'auto', md: '100%' },
                                        flexShrink: 0,
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        position: 'relative',
                                        '&.Mui-selected': {
                                            bgcolor: 'rgba(255, 48, 48, 0.12)',
                                            color: 'var(--palette-primary-main)',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                left: { xs: '20%', md: 0 },
                                                bottom: { xs: 0, md: 'auto' },
                                                top: { xs: 'auto', md: '15%' },
                                                height: { xs: '3px', md: '70%' },
                                                width: { xs: '60%', md: '4px' },
                                                bgcolor: 'var(--palette-primary-main)',
                                                borderRadius: '4px',
                                                boxShadow: '0 0 8px rgba(255, 48, 48, 0.4)'
                                            },
                                            '& .MuiListItemIcon-root': {
                                                color: 'var(--palette-primary-main)',
                                                transform: 'scale(1.1)'
                                            },
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: { xs: 32, md: 40 }, transition: 'transform 0.2s' }}>
                                        <Icon icon={tab.icon} width={24} />
                                    </ListItemIcon>
                                    <ListItemText primary={tab.label} primaryTypographyProps={{ variant: 'body2', fontWeight: 800, letterSpacing: 0.2 }} />
                                </ListItemButton>
                            ))}
                        </List>
                    </Card>
                </Grid>

                {/* Main Content Area */}
                <Grid size={{ xs: 12, md: 9 }}>
                    {activeTab === "general" && (
                        <Card sx={{ p: { xs: 2.5, sm: 4, md: 5 }, borderRadius: "16px", boxShadow: "var(--customShadows-card)", border: '1px solid var(--palette-divider)' }}>
                            <Typography variant="h6" sx={{ mb: { xs: 3, md: 4 }, fontWeight: 800 }}>Thông tin cá nhân</Typography>

                            <form onSubmit={handleSubmit(onSubmit)}>
                                <Grid container spacing={4}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        {isEditing ? (
                                            <Controller
                                                name="lastName"
                                                control={control}
                                                render={({ field, fieldState }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Họ"
                                                        fullWidth
                                                        error={!!fieldState.error}
                                                        helperText={fieldState.error?.message}
                                                    />
                                                )}
                                            />
                                        ) : (
                                            <Stack spacing={1.2}>
                                                <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>Họ</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'capitalize', color: 'var(--palette-text-primary)' }}>{account?.lastName}</Typography>
                                            </Stack>
                                        )}
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        {isEditing ? (
                                            <Controller
                                                name="firstName"
                                                control={control}
                                                render={({ field, fieldState }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Tên"
                                                        fullWidth
                                                        error={!!fieldState.error}
                                                        helperText={fieldState.error?.message}
                                                    />
                                                )}
                                            />
                                        ) : (
                                            <Stack spacing={1.2}>
                                                <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>Tên</Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'capitalize', color: 'var(--palette-text-primary)' }}>{account?.firstName}</Typography>
                                            </Stack>
                                        )}
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Stack spacing={1.2}>
                                            <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>Địa chỉ Email</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--palette-text-primary)' }}>{account?.email}</Typography>
                                        </Stack>
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        {isEditing ? (
                                            <Controller
                                                name="phone"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="Số điện thoại"
                                                        fullWidth
                                                    />
                                                )}
                                            />
                                        ) : (
                                            <Stack spacing={1.2}>
                                                <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>Số điện thoại</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 700, color: account?.phone ? 'var(--palette-text-primary)' : 'var(--palette-text-disabled)' }}>
                                                    {account?.phone || "---"}
                                                </Typography>
                                            </Stack>
                                        )}
                                    </Grid>

                                </Grid>

                                {isEditing && (
                                    <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 6 }}>
                                        <Button
                                            variant="outlined"
                                            color="inherit"
                                            onClick={() => setIsEditing(false)}
                                            sx={{ borderRadius: "10px", px: 3 }}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            type="submit"
                                            loading={isUpdating}
                                            label="Lưu thay đổi"
                                            loadingLabel="Đang lưu..."
                                            sx={{ borderRadius: "10px", px: 4 }}
                                        />
                                    </Stack>
                                )}
                            </form>
                        </Card>
                    )}

                    {activeTab === "security" && (
                        <Card sx={{ p: { xs: 3, md: 5 }, borderRadius: "16px", boxShadow: "var(--customShadows-card)", border: '1px solid var(--palette-divider)' }}>
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Bảo mật tài khoản</Typography>
                                <Typography variant="body2" sx={{ color: 'var(--palette-text-secondary)', lineHeight: 1.6 }}>
                                    Cập nhật mật khẩu thường xuyên để tăng cường tính bảo mật cho quản trị viên.
                                </Typography>
                            </Box>

                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                                <Stack spacing={4}>
                                    <Controller
                                        name="currentPassword"
                                        control={passwordForm.control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                type={showCurrentPassword ? "text" : "password"}
                                                label="Mật khẩu hiện tại"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end">
                                                                <Icon icon={showCurrentPassword ? "solar:eye-bold-duotone" : "solar:eye-closed-bold-duotone"} />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="newPassword"
                                        control={passwordForm.control}
                                        render={({ field, fieldState }) => (
                                            <Box>
                                                <TextField
                                                    {...field}
                                                    type={showPassword ? "text" : "password"}
                                                    label="Mật khẩu mới"
                                                    fullWidth
                                                    error={!!fieldState.error}
                                                    helperText={fieldState.error?.message}
                                                    onFocus={() => setIsPasswordFocused(true)}
                                                    onBlur={() => setIsPasswordFocused(false)}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                                    <Icon icon={showPassword ? "solar:eye-bold-duotone" : "solar:eye-closed-bold-duotone"} />
                                                                </IconButton>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                                {passwordPolicy && (isPasswordFocused || newPassword) && !allRequirementsMet && (
                                                    <PasswordRequirementList
                                                        password={newPassword || ""}
                                                        policy={passwordPolicy}
                                                    />
                                                )}
                                            </Box>
                                        )}
                                    />

                                    <Controller
                                        name="confirmPassword"
                                        control={passwordForm.control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                type={showConfirmPassword ? "text" : "password"}
                                                label="Xác nhận mật khẩu mới"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                                                                <Icon icon={showConfirmPassword ? "solar:eye-bold-duotone" : "solar:eye-closed-bold-duotone"} />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        )}
                                    />

                                    <Stack direction="row" justifyContent="flex-end">
                                        <Button
                                            type="submit"
                                            disabled={!isPasswordValid}
                                            loading={isChangingPassword}
                                            label="Cập nhật mật khẩu"
                                            loadingLabel="Đang xử lý..."
                                            sx={{
                                                borderRadius: "10px",
                                                px: 4,
                                                bgcolor: 'var(--palette-text-primary)',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'var(--palette-grey-700)' },
                                                '&.Mui-disabled': { bgcolor: 'var(--palette-action-disabledBackground)' }
                                            }}
                                        />
                                    </Stack>
                                </Stack>
                            </form>
                        </Card>
                    )}

                </Grid>
            </Grid>
        </Box>
    );
};
