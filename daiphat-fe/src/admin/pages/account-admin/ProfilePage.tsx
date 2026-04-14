import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Card,
    Stack,
    Typography,
    Avatar,
    CircularProgress,
    TextField,
    Chip,
    InputAdornment,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Button,
    Divider
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { Icon } from "@iconify/react";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useAccountDetail, useUpdateAccount, useChangeAccountPassword } from "./hooks/useAccountAdmin";
import { useRoles } from "../role/hooks/useRole";
import { useTicketServiceOrders } from "../ticket-service-order/hooks/useTicketServiceOrderManagement";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountAdminSchema } from "../../schemas/account-admin.schema";
import { toast } from "react-toastify";
import { uploadImagesToCloudinary } from "../../api/uploadCloudinary.api";
import { LoadingButton } from "../../components/ui/LoadingButton";
import dayjs from "dayjs";
import * as zod from "zod";
import { useAuthStore } from "../../../stores/useAuthStore";
import { authService } from "../authen/services/auth.service";
import { PasswordRequirement, PasswordPolicy } from "../authen/types/auth.type";

const passwordSchema = zod.object({
    password: zod.string().min(1, "Vui lòng nhập mật khẩu mới"),
    confirmPassword: zod.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
});

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
            {items.map((item) => (
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
            ))}
        </Stack>
    );
};

export const ProfilePage = () => {
    const { user } = useAuthStore();
    const id = (user as any)?._id || user?.id;
    const navigate = useNavigate();

    // States
    const [activeTab, setActiveTab] = useState<"general" | "security" | "history">("general");
    const [isEditing, setIsEditing] = useState(false);
    const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);

    const { data: account, isLoading: isAccountLoading } = useAccountDetail(id);
    const { mutate: update, isPending: isUpdating } = useUpdateAccount();
    const { mutate: changePassword, isPending: isChangingPassword } = useChangeAccountPassword();
    const { data: roles = [] } = useRoles();
    const { data: ticketServiceOrdersData, isLoading: isTicketServiceOrdersLoading } = useTicketServiceOrders({ staffId: id });
    const ticketServiceOrders = (ticketServiceOrdersData?.data as any)?.recordList || [];

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
    } = useForm<any>({
        resolver: zodResolver(accountAdminSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            roles: [],
            status: "active",
            avatar: "",
        },
    });

    const passwordForm = useForm<any>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const currentPassword = passwordForm.watch("password");
    const avatar = watch("avatar");

    // Kiểm tra xem mật khẩu có thỏa mãn mọi yêu cầu không
    const checkAllMet = () => {
        if (!passwordPolicy) return false;
        const pwd = currentPassword || "";
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
                roles: account.roles?.map((r: any) => typeof r === 'string' ? r : r._id) || [],
                status: account.status,
                avatar: account.avatarUrl || account.avatar || "",
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

    const onSubmit = (data: any) => {
        update({ id: id!, data }, {
            onSuccess: () => {
                toast.success("Cập nhật thông tin thành công!");
                setIsEditing(false);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Cập nhật thất bại");
            }
        });
    };

    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const onPasswordSubmit = (data: any) => {
        if (!isPasswordValid) {
            toast.error("Mật khẩu chưa thỏa mãn các yêu cầu bảo mật!");
            return;
        }
        changePassword({ id: id!, data: { password: data.password } }, {
            onSuccess: () => {
                toast.success("Đổi mật khẩu thành công!");
                passwordForm.reset();
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Đổi mật khẩu thất bại");
            }
        });
    };

    if (isAccountLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }


    return (
        <Box sx={{ maxWidth: '1200px', mx: 'auto', pb: 10 }}>
            {/* Header Area */}
            <Box sx={{ mb: 4 }}>
                <Title title="Quản lý hồ sơ" />
                <Breadcrumb
                    items={[
                        { label: "Trang chủ", to: "/" },
                        { label: "Admin", to: "#" },
                        { label: "Hồ sơ cá nhân" }
                    ]}
                />
            </Box>

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
                                {roles.find((r: any) => account?.roles?.includes(r._id))?.name || account?.role?.name || "---"}
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
                                { id: "history", label: "Lịch sử", icon: "solar:history-bold" }
                            ].map((tab) => (
                                <ListItemButton
                                    key={tab.id}
                                    selected={activeTab === tab.id}
                                    onClick={() => { setActiveTab(tab.id as any); setIsEditing(false); }}
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
                                            bgcolor: 'rgba(0, 167, 111, 0.12)',
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
                                                boxShadow: '0 0 8px rgba(0, 167, 111, 0.4)'
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
                                        <LoadingButton
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
                                        name="password"
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
                                                {passwordPolicy && (isPasswordFocused || currentPassword) && !allRequirementsMet && (
                                                    <PasswordRequirementList
                                                        password={currentPassword || ""}
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
                                        <LoadingButton
                                            type="submit"
                                            disabled={!isPasswordValid}
                                            loading={isChangingPassword}
                                            label="Cập nhật mật khẩu"
                                            loadingLabel="Đang xử lý..."
                                            sx={{
                                                borderRadius: "10px",
                                                px: 4,
                                                bgcolor: 'var(--palette-grey-800)',
                                                color: 'common.white',
                                                '&:hover': { bgcolor: 'var(--palette-grey-900)' },
                                                '&.Mui-disabled': { bgcolor: 'var(--palette-action-disabledBackground)' }
                                            }}
                                        />
                                    </Stack>
                                </Stack>
                            </form>
                        </Card>
                    )}

                    {activeTab === "history" && (
                        <Card sx={{ borderRadius: "16px", boxShadow: "var(--customShadows-card)", border: '1px solid var(--palette-divider)', overflow: 'hidden' }}>
                            <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>Lịch sử công việc</Typography>
                                <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)', fontWeight: 700 }}>
                                    {ticketServiceOrders.length} ĐƠN GẦN NHẤT
                                </Typography>
                            </Box>

                            <Divider />

                            {isTicketServiceOrdersLoading ? (
                                <Box sx={{ p: 10, textAlign: 'center' }}>
                                    <CircularProgress size={40} />
                                </Box>
                            ) : ticketServiceOrders.length === 0 ? (
                                <Box sx={{ p: 10, textAlign: 'center', color: 'var(--palette-text-disabled)' }}>
                                    <Icon icon="solar:document-text-bold-duotone" width={80} style={{ opacity: 0.15 }} />
                                    <Typography variant="body1" sx={{ mt: 2, fontWeight: 600 }}>Sạch bóng dữ liệu việc làm.</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ overflowX: 'auto', p: 1, mt: 1 }}>
                                    <Box sx={{ minWidth: 900 }}>
                                        {ticketServiceOrders.map((ticketServiceOrder: any) => (
                                            <Box
                                                key={ticketServiceOrder._id}
                                                onClick={() => navigate(`/${prefixAdmin}/ticketServiceOrder/detail/${ticketServiceOrder._id}`)}
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '140px 1fr 200px 160px 160px',
                                                    p: 2.5,
                                                    mx: 1,
                                                    mb: 1,
                                                    borderRadius: '12px',
                                                    border: '1px solid transparent',
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        bgcolor: 'var(--palette-background-neutral)',
                                                        borderColor: 'var(--palette-divider)',
                                                        boxShadow: '0 4px 12px 0 rgba(145, 158, 171, 0.08)'
                                                    },
                                                    alignItems: 'center',
                                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }}
                                            >
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--palette-primary-main)' }}>
                                                    #{ticketServiceOrder.code}
                                                </Typography>
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{ticketServiceOrder.ticketServiceId?.name}</Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontWeight: 500 }}>
                                                        Khách: {ticketServiceOrder.userId?.fullName}
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(ticketServiceOrder.start).format("DD MMM, YYYY")}</Typography>
                                                    <Typography variant="caption" sx={{ color: 'var(--palette-text-secondary)', fontSize: '0.7rem' }}>
                                                        {dayjs(ticketServiceOrder.start).format("HH:mm")} - {dayjs(ticketServiceOrder.end).format("HH:mm")}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="subtitle1" textAlign="right" sx={{ fontWeight: 800 }}>
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticketServiceOrder.total || 0)}
                                                </Typography>
                                                <Box textAlign="center">
                                                    {(() => {
                                                        const statusMap: any = {
                                                            pending: { label: "Chờ duyệt", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
                                                            confirmed: { label: "Xác nhận", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
                                                            delayed: { label: "Trễ hẹn", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
                                                            "in-progress": { label: "Đang làm", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
                                                            completed: { label: "Hoàn tất", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
                                                            cancelled: { label: "Đã hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" }
                                                        };
                                                        const status = statusMap[ticketServiceOrder.ticketServiceOrderStatus] || { label: ticketServiceOrder.ticketServiceOrderStatus, color: 'var(--palette-text-secondary)', bg: "var(--palette-background-neutral)" };
                                                        return (
                                                            <Chip
                                                                label={status.label}
                                                                size="small"
                                                                sx={{
                                                                    borderRadius: "8px",
                                                                    fontWeight: 800,
                                                                    fontSize: '0.65rem',
                                                                    color: status.color,
                                                                    bgcolor: status.bg,
                                                                    height: '24px',
                                                                    textTransform: 'uppercase'
                                                                }}
                                                            />
                                                        );
                                                    })()}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Card>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};
