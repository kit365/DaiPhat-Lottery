"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import { useEffect, useState, useRef } from "react";
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
} from '@mui/material';
import { UserStatus } from "../../../../../types/user.type";
import Grid from "@mui/material/Grid";
import { Icon } from '@/admin/components/ui/AdminIcon';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../components/ui/SpinnerLoading';
import { prefixAdmin } from '../../../../constants/routes';
import {
    useUserDetail,
    useUpdateUser,
    useDeleteUser,
    useConfirmUserPasswordReset,
    useInitiateUserPasswordReset,
    useUploadUserAvatar
} from "../../hooks/useUsers";
import { useRoles } from "../../../role/hooks/useRole";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountAdminSchema } from "../../../../schemas/account-admin.schema";
import { toast } from "react-toastify";
import { Button } from '../../../../components/ui/Button';

export const AdminDetailPage = () => {
    const { id } = useRouteParams();
    const router = useAdminRouter();
    const [currentTab, setCurrentTab] = useState("general");
    const { data: account, isLoading: isAccountLoading } = useUserDetail(id);
    const { mutate: update, isPending: isUpdating } = useUpdateUser();
    const { mutate: removeAccount } = useDeleteUser();
    const { mutate: initiateReset, isPending: isInitiatingReset } = useInitiateUserPasswordReset();
    const { mutate: confirmReset, isPending: isConfirmingReset } = useConfirmUserPasswordReset();
    const { mutateAsync: uploadAvatar } = useUploadUserAvatar();
    const { data: roles = [] } = useRoles();


    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");

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
            status: UserStatus.ACTIVE,
            avatar: "",
        },
    });

    const avatar = watch("avatar");

    useEffect(() => {
        if (account) {
            reset({
                firstName: account.firstName,
                lastName: account.lastName,
                email: account.email,
                phone: account.phone || "",
                roles: account.role ? [account.role.code] : [],
                status: account.status,
                avatar: account.avatarUrl || account.avatar || "",
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
            const response = await uploadAvatar({ id: id!, file });
            const url = response.data?.avatarUrl || response.data?.avatar || "";
            setValue("avatar", url, { shouldValidate: true });
            toast.success("Tải ảnh đại diện thành công!");
        } catch (error) {
            toast.error("Tải ảnh đại diện thất bại!");
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = (data: any) => {
        const payload = { ...data };
        delete payload.avatar;
        update({ id: id!, data: payload }, {
            onSuccess: () => {
                toast.success("Cập nhật quản trị viên thành công!");
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Cập nhật thất bại");
            }
        });
    };

    const handleInitiateReset = () => {
        initiateReset(id!, {
            onSuccess: () => {
                setOtpSent(true);
                toast.success("Mã OTP đã được gửi đến email người dùng.");
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Không thể gửi OTP");
            }
        });
    };

    const handleConfirmReset = () => {
        if (!otp || otp.length < 6) {
            toast.warning("Vui lòng nhập mã OTP hợp lệ");
            return;
        }

        confirmReset({ id: id!, otp }, {
            onSuccess: () => {
                toast.success("Đặt lại mật khẩu thành công! Mật khẩu mới đã được gửi đến email người dùng.");
                setOtpSent(false);
                setOtp("");
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Xác thực OTP thất bại");
            }
        });
    };

    const handleDelete = () => {
        if (window.confirm("Bạn có chắc chắn muốn xóa quản trị viên này?")) {
            removeAccount(id!, {
                onSuccess: () => {
                    toast.success("Xóa quản trị viên thành công!");
                    router.push(`/${prefixAdmin}/account-admin/list`);
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Xóa thất bại");
                }
            });
        }
    };

    if (isAccountLoading) {
        return (
            <div className="p-[24px] pt-[16px] flex flex-col gap-[24px] max-w-[1200px] mx-auto w-full">
                <PageHeader
                    title="Tài khoản"
                    breadcrumbItems={[
                        { label: "Dashboard", to: `/${prefixAdmin}` },
                        { label: "Quản trị viên", to: `/${prefixAdmin}/account-admin/list` },
                        { label: "Chi tiết" }
                    ]}
                />
                <SpinnerLoading />
            </div>
        );
    }

    return (
        <div className="p-[24px] pt-[16px] flex flex-col gap-[24px] max-w-[1200px] mx-auto w-full">
            {/* Header */}
            <PageHeader
                title="Tài khoản"
                breadcrumbItems={[
                    { label: "Dashboard", to: `/${prefixAdmin}` },
                    { label: "Quản trị viên", to: `/${prefixAdmin}/account-admin/list` },
                    { label: account ? `${account.lastName} ${account.firstName}` : "Chi tiết" }
                ]}
            />

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
                        minHeight: 48,
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
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-[24px]">
                        <div className="md:col-span-4">
                            <div className="p-[80px_24px] text-center relative rounded-[16px] border border-[var(--palette-divider)] shadow-sm bg-[var(--palette-background-paper)]">
                                <div className="absolute top-[24px] right-[24px]">
                                    <Chip
                                        label={account?.status === UserStatus.ACTIVE ? 'Hoạt động' : 'Tạm dừng'}
                                        sx={{
                                            bgcolor: account?.status === UserStatus.ACTIVE ? 'rgba(34, 197, 94, 0.16)' : 'rgba(255, 171, 0, 0.16)',
                                            color: account?.status === UserStatus.ACTIVE ? 'rgb(17, 141, 87)' : 'rgb(183, 110, 0)',
                                            borderRadius: "var(--shape-borderRadius-sm)",
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            height: '24px'
                                        }}
                                    />
                                </div>

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

                                <p className="mt-[24px] text-[var(--palette-text-disabled)] text-[0.75rem]">
                                    Allowed *.jpeg, *.jpg, *.png, *.gif <br /> max size of 3 Mb
                                </p>

                                <div className="mt-[32px]">
                                    <Button
                                        variant="contained"
                                        color="error"
                                        onClick={handleDelete}
                                        sx={{
                                            color: '#B71D18',
                                            bgcolor: 'rgba(255, 86, 48, 0.08)',
                                            '&:hover': {
                                                bgcolor: 'rgba(255, 86, 48, 0.32)',
                                                boxShadow: 'none'
                                            },
                                            fontWeight: 700,
                                            fontSize: '0.8125rem',
                                            textTransform: 'none',
                                            px: 2,
                                            py: 1,
                                            borderRadius: "var(--shape-borderRadius)",
                                            boxShadow: 'none',
                                        }}
                                    >
                                        Xóa tài khoản
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-8">
                            <div className="p-[32px] rounded-[16px] border border-[var(--palette-divider)] shadow-sm bg-[var(--palette-background-paper)]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[24px]">
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
                                                SelectProps={{
                                                    multiple: true,
                                                    value: field.value || [],
                                                    renderValue: (selected: any) => {
                                                        const selectedArray = Array.isArray(selected) ? selected : [selected];
                                                        return roles
                                                            .filter((r: any) => selectedArray.includes(r.code))
                                                            .map((r: any) => r.name)
                                                            .join(', ');
                                                    }
                                                }}
                                            >
                                                {roles.map((role: any) => (
                                                    <MenuItem key={role.code} value={role.code} sx={{ fontSize: '0.875rem' }}>
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
                                            >
                                                <MenuItem value={UserStatus.ACTIVE} sx={{ fontSize: '0.875rem' }}>Hoạt động</MenuItem>
                                                <MenuItem value={UserStatus.LOCKED} sx={{ fontSize: '0.875rem' }}>Tạm dừng</MenuItem>
                                                <MenuItem value={UserStatus.BANNED} sx={{ fontSize: '0.875rem' }}>Bị cấm</MenuItem>
                                            </TextField>
                                        )}
                                    />
                                </div>

                                <div className="flex justify-end mt-[24px]">
                                    <Button
                                        type="submit"
                                        loading={isUpdating}
                                        label="Lưu thay đổi"
                                        loadingLabel="Đang lưu..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {currentTab === "security" && (
                <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                    {!otpSent ? (
                        <Stack spacing={3} alignItems="flex-start">
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>Đặt lại mật khẩu</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Hệ thống sẽ gửi mã OTP xác thực đến email người dùng. Sau khi xác nhận, mật khẩu mới sẽ được tạo tự động và gửi qua email.
                            </Typography>
                            <Stack direction="row" justifyContent="flex-end" sx={{ width: '100%' }}>
                                <Button
                                    onClick={handleInitiateReset}
                                    loading={isInitiatingReset}
                                    label="Gửi mã OTP"
                                    loadingLabel="Đang gửi..."
                                    sx={{
                                        bgcolor: 'var(--palette-grey-800)',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: 'var(--palette-grey-900)' }
                                    }}
                                />
                            </Stack>
                        </Stack>
                    ) : (
                        <Stack spacing={3} alignItems="flex-end">
                            <TextField
                                label="Nhập mã OTP"
                                value={otp}
                                onChange={(event) => setOtp(event.target.value)}
                                placeholder="Nhập mã OTP gồm 6 chữ số"
                                fullWidth
                            />
                            <Stack direction="row" spacing={2}>
                                <Button
                                    variant="text"
                                    onClick={() => setOtpSent(false)}
                                >
                                    Quay lại
                                </Button>
                                <Button
                                    onClick={handleConfirmReset}
                                    loading={isConfirmingReset}
                                    disabled={otp.length < 6}
                                    label="Xác nhận đặt lại"
                                    loadingLabel="Đang xác thực..."
                                    sx={{
                                        bgcolor: 'var(--palette-grey-800)',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: 'var(--palette-grey-900)' }
                                    }}
                                />
                            </Stack>
                        </Stack>
                    )}
                </Card>
            )}
        </div>
    );
};
