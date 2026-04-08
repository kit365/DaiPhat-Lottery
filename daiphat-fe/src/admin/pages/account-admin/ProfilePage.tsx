import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Card,
    Stack,
    Typography,
    Tabs,
    Tab,
    CircularProgress,
    TextField,
    MenuItem,
    Chip,
    InputAdornment,
    IconButton
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

const passwordSchema = zod.object({
    password: zod.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: zod.string().min(6, "Mật khẩu xác nhận phải có ít nhất 6 ký tự"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
});

export const ProfilePage = () => {
    const { user } = useAuthStore();
    const id = (user as any)?._id || user?.id;
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState("general");
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

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
    } = useForm<any>({
        resolver: zodResolver(accountAdminSchema),
        defaultValues: {
            fullName: "",
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

    const avatar = watch("avatar");

    useEffect(() => {
        if (account) {
            reset({
                fullName: account.fullName,
                email: account.email,
                phone: account.phone || "",
                roles: account.roles?.map((r: any) => typeof r === 'string' ? r : r._id) || [],
                status: account.status,
                avatar: account.avatar || "",
            });
        }
    }, [account, reset]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setCurrentTab(newValue);
    };

    const handleOpenFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Định dạng file không hợp lệ. Vui lòng chọn *.jpeg, *.jpg, *.png, hoặc *.gif");
            return;
        }
        const maxSize = 3 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("Dung lượng file quá lớn. Tối đa là 3 Mb");
            return;
        }
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
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Cập nhật thất bại");
            }
        });
    };

    const onPasswordSubmit = (data: any) => {
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
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
                <Title title="Tài khoản" />
                <Breadcrumb
                    items={[
                        { label: "Dashboard", to: "/" },
                        { label: "Người dùng", to: "#" },
                        { label: "Tài khoản" }
                    ]}
                />
            </Box>

            <Tabs
                value={currentTab}
                onChange={handleTabChange}
                sx={{
                    mb: 4,
                    '& .MuiTabs-indicator': { bgcolor: 'var(--palette-text-primary)' },
                    '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: 'var(--palette-text-secondary)',
                        minWidth: 0,
                        mr: 4,
                        p: 0,
                        '&.Mui-selected': { color: 'var(--palette-text-primary)' }
                    }
                }}
            >
                <Tab
                    disableRipple
                    value="general"
                    label={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Icon icon="solar:user-id-bold" width={20} />
                            <span>Tổng quan</span>
                        </Stack>
                    }
                />
                <Tab
                    disableRipple
                    value="history"
                    label={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Icon icon="solar:history-bold" width={20} />
                            <span>Lịch sử việc làm</span>
                        </Stack>
                    }
                />
                <Tab
                    disableRipple
                    value="security"
                    label={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Icon icon="solar:key-bold" width={20} />
                            <span>Bảo mật</span>
                        </Stack>
                    }
                />
            </Tabs>

            {currentTab === "general" && (
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card sx={{ p: '80px 24px', textAlign: 'center', borderRadius: "var(--shape-borderRadius-lg)", position: 'relative', boxShadow: "var(--customShadows-card)" }}>
                                <Box sx={{ position: 'absolute', top: 24, right: 24 }}>
                                    <Chip
                                        label={account?.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                                        sx={{
                                            bgcolor: account?.status === 'active' ? 'rgba(34, 197, 94, 0.16)' : 'rgba(255, 171, 0, 0.16)',
                                            color: account?.status === 'active' ? 'rgb(17, 141, 87)' : 'rgb(183, 110, 0)',
                                            borderRadius: "var(--shape-borderRadius-sm)",
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            height: '24px'
                                        }}
                                    />
                                </Box>

                                <div
                                    onClick={handleOpenFile}
                                    className="w-[144px] h-[144px] m-auto cursor-pointer rounded-full p-[8px] border border-dashed border-[var(--palette-text-disabled)33] hover:opacity-75 transition-opacity"
                                >
                                    <div className="w-full h-full rounded-full relative overflow-hidden bg-[var(--palette-text-disabled)14]">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                        {avatar ? (
                                            <img
                                                src={avatar}
                                                alt="avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-[var(--palette-text-disabled)] flex-col gap-[8px]">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true" role="img" className="w-[2rem] h-[2rem]" id="_r_fh_" width="1rem" height="1rem" viewBox="0 0 24 24"><g fill="currentColor" fillRule="evenodd" clipRule="evenodd"><path d="M12 10.25a.75.75 0 0 1 .75.75v1.25H14a.75.75 0 0 1 0 1.5h-1.25V15a.75.75 0 0 1-1.5 0v-1.25H10a.75.75 0 0 1 0-1.5h1.25V11a.75.75 0 0 1 .75-.75"></path><path d="M9.778 21h4.444c3.121 0 4.682 0 5.803-.735a4.4 4.4 0 0 0 1.226-1.204c.749-1.1.749-2.633.749-5.697s0-4.597-.749-5.697a4.4 4.4 0 0 0-1.226-1.204c-.72-.473-1.622-.642-3.003-.702c-.659 0-1.226-.49-1.355-1.125A2.064 2.064 0 0 0 13.634 3h-3.268c-.988 0-1.839.685-2.033 1.636c-.129.635-.696 1.125-1.355 1.125c-1.38.06-2.282.23-3.003.702A4.4 4.4 0 0 0 2.75 7.667C2 8.767 2 10.299 2 13.364s0 4.596.749 5.697c.324.476.74.885 1.226 1.204C5.096 21 6.657 21 9.778 21M16 13a4 4 0 1 1-8 0a4 4 0 0 1 8 0m2-3.75a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5z"></path></g></svg>
                                                <span className="text-[0.75rem]">{isUploading ? "Đang tải..." : "Tải ảnh lên"}</span>
                                            </div>
                                        )}

                                        {avatar && (
                                            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-white flex-col gap-[8px] bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true" role="img" className="w-[2rem] h-[2rem]" id="_r_fh_" width="1rem" height="1rem" viewBox="0 0 24 24"><g fill="currentColor" fillRule="evenodd" clipRule="evenodd"><path d="M12 10.25a.75.75 0 0 1 .75.75v1.25H14a.75.75 0 0 1 0 1.5h-1.25V15a.75.75 0 0 1-1.5 0v-1.25H10a.75.75 0 0 1 0-1.5h1.25V11a.75.75 0 0 1 .75-.75"></path><path d="M9.778 21h4.444c3.121 0 4.682 0 5.803-.735a4.4 4.4 0 0 0 1.226-1.204c.749-1.1.749-2.633.749-5.697s0-4.597-.749-5.697a4.4 4.4 0 0 0-1.226-1.204c-.72-.473-1.622-.642-3.003-.702c-.659 0-1.226-.49-1.355-1.125A2.064 2.064 0 0 0 13.634 3h-3.268c-.988 0-1.839.685-2.033 1.636c-.129.635-.696 1.125-1.355 1.125c-1.38.06-2.282.23-3.003.702A4.4 4.4 0 0 0 2.75 7.667C2 8.767 2 10.299 2 13.364s0 4.596.749 5.697c.324.476.74.885 1.226 1.204C5.096 21 6.657 21 9.778 21M16 13a4 4 0 1 1-8 0a4 4 0 0 1 8 0m2-3.75a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5z"></path></g></svg>
                                                <span className="text-[0.75rem]">Thay đổi ảnh</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Typography variant="body2" sx={{ mt: 3, color: 'var(--palette-text-disabled)', fontSize: '0.75rem' }}>
                                    Allowed *.jpeg, *.jpg, *.png, *.gif <br /> max size of 3 Mb
                                </Typography>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, md: 8 }}>
                            <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                                    <Controller
                                        name="fullName"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Họ và tên"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="email"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Địa chỉ Email"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                                disabled
                                            />
                                        )}
                                    />

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

                                    <Controller
                                        name="roles"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Vai trò"
                                                select
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                                disabled
                                                SelectProps={{
                                                    multiple: true,
                                                    value: field.value || [],
                                                    renderValue: (selected: any) => {
                                                        const selectedArray = Array.isArray(selected) ? selected : [selected];
                                                        return roles
                                                            .filter((r: any) => selectedArray.includes(r._id))
                                                            .map((r: any) => r.name)
                                                            .join(', ');
                                                    }
                                                }}
                                            >
                                                {roles.map((role: any) => (
                                                    <MenuItem key={role._id} value={role._id} sx={{ fontSize: '0.875rem' }}>
                                                        {role.name}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        )}
                                    />

                                    <Controller
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="Trạng thái"
                                                select
                                                fullWidth
                                                disabled
                                            >
                                                <MenuItem value="active" sx={{ fontSize: '0.875rem' }}>Hoạt động</MenuItem>
                                                <MenuItem value="inactive" sx={{ fontSize: '0.875rem' }}>Tạm dừng</MenuItem>
                                            </TextField>
                                        )}
                                    />
                                </Box>

                                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
                                    <LoadingButton
                                        type="submit"
                                        loading={isUpdating}
                                        label="Lưu thay đổi"
                                        loadingLabel="Đang lưu..."
                                    />
                                </Stack>
                            </Card>
                        </Grid>
                    </Grid>
                </form>
            )}

            {currentTab === "history" && (
                <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", overflow: 'hidden' }}>
                    <Box sx={{ p: 3, borderBottom: '1px solid var(--palette-background-neutral)' }}>
                        <Typography variant="h6">Lịch sử việc làm</Typography>
                    </Box>
                    {isTicketServiceOrdersLoading ? (
                        <Box sx={{ p: 5, textAlign: 'center' }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : ticketServiceOrders.length === 0 ? (
                        <Box sx={{ p: 5, textAlign: 'center', color: 'var(--palette-text-disabled)' }}>
                            Chưa có dữ liệu việc làm.
                        </Box>
                    ) : (
                        <Box sx={{ overflowX: 'auto' }}>
                            <Box sx={{ minWidth: 800 }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr 150px 150px 150px', p: 2, bgcolor: 'var(--palette-background-neutral)', fontWeight: 600 }}>
                                    <Box>Mã đơn</Box>
                                    <Box>Dịch vụ / Khách hàng</Box>
                                    <Box>Thời gian</Box>
                                    <Box textAlign="right">Tổng tiền</Box>
                                    <Box textAlign="center">Trạng thái</Box>
                                </Box>
                                {ticketServiceOrders.map((ticketServiceOrder: any) => (
                                    <Box
                                        key={ticketServiceOrder._id}
                                        onClick={() => navigate(`/${prefixAdmin}/ticketServiceOrder/detail/${ticketServiceOrder._id}`)}
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: '150px 1fr 150px 150px 150px',
                                            p: 2,
                                            borderBottom: '1px dashed var(--palette-background-neutral)',
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'var(--palette-action-hover)' },
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--palette-primary-main)' }}>
                                            #{ticketServiceOrder.code}
                                        </Typography>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{ticketServiceOrder.ticketServiceId?.name || "Dịch vụ"}</Typography>
                                            <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                                Khách: {ticketServiceOrder.userId?.fullName || "N/A"}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="body2">{dayjs(ticketServiceOrder.start).format("DD/MM/YYYY")}</Typography>
                                            <Typography variant="caption" sx={{ color: 'var(--palette-text-disabled)' }}>
                                                {dayjs(ticketServiceOrder.start).format("HH:mm")} - {dayjs(ticketServiceOrder.end).format("HH:mm")}
                                            </Typography>
                                        </Box>
                                        <Typography variant="subtitle2" textAlign="right">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticketServiceOrder.total || 0)}
                                        </Typography>
                                        <Box textAlign="center">
                                            {(() => {
                                                const statusMap: any = {
                                                    pending: { label: "Chờ xác nhận", color: "var(--palette-warning-dark)", bg: "var(--palette-warning-lighter)" },
                                                    confirmed: { label: "Đã xác nhận", color: "var(--palette-info-dark)", bg: "var(--palette-info-lighter)" },
                                                    delayed: { label: "Trễ hẹn", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" },
                                                    "in-progress": { label: "Đang thực hiện", color: "var(--palette-primary-dark)", bg: "var(--palette-primary-lighter)" },
                                                    completed: { label: "Hoàn thành", color: "var(--palette-success-dark)", bg: "var(--palette-success-lighter)" },
                                                    cancelled: { label: "Đã hủy", color: "var(--palette-error-dark)", bg: "var(--palette-error-lighter)" }
                                                };
                                                const status = statusMap[ticketServiceOrder.ticketServiceOrderStatus] || { label: ticketServiceOrder.ticketServiceOrderStatus, color: 'var(--palette-text-disabled)', bg: "var(--palette-background-neutral)" };
                                                return (
                                                    <Chip
                                                        label={status.label}
                                                        size="small"
                                                        sx={{
                                                            borderRadius: "var(--shape-borderRadius-sm)",
                                                            fontWeight: 700,
                                                            fontSize: '0.6875rem',
                                                            color: status.color,
                                                            bgcolor: status.bg,
                                                            height: '24px',
                                                            '& .MuiChip-label': { px: '8px' }
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

            {currentTab === "security" && (
                <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                        <Stack spacing={3} alignItems="flex-end">
                            <Controller
                                name="password"
                                control={passwordForm.control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        type={showPassword ? "text" : "password"}
                                        label="Mật khẩu mới"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                        <Icon icon={showPassword ? "solar:eye-bold" : "solar:eye-closed-bold"} />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
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
                                                        <Icon icon={showConfirmPassword ? "solar:eye-bold" : "solar:eye-closed-bold"} />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            />

                            <LoadingButton
                                type="submit"
                                loading={isChangingPassword}
                                label="Lưu thay đổi"
                                sx={{
                                    bgcolor: 'var(--palette-grey-800)',
                                    color: 'common.white',
                                    '&:hover': { bgcolor: 'var(--palette-grey-900)' }
                                }}
                            />
                        </Stack>
                    </form>
                </Card>
            )}
        </Box>
    );
};
