import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    Button
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { Icon } from "@iconify/react";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useUserDetail, useUpdateUser, useDeleteUser } from "./hooks/useAccountUser";
import { UserStatus } from "../../../types/user.type";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountUserSchema } from "../../schemas/account-user.schema";
import { toast } from "react-toastify";
import { uploadImagesToCloudinary } from "../../api/uploadCloudinary.api";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { UserUserTicketList } from "./sections/UserTicketList";
import { UserTicketServiceOrderHistory } from "./sections/UserTicketServiceOrderHistory";
import { UserOrderHistory } from "./sections/UserOrderHistory";
import { UserBoardingHistory } from "./sections/UserBoardingHistory";
import { UserAddressBook } from "./sections/UserAddressBook";

export const AccountUserDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState("general");
    const { data: user, isLoading: isUserLoading } = useUserDetail(id);
    const { mutate: update, isPending: isUpdating } = useUpdateUser();
    const { mutate: removeUser } = useDeleteUser();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
    } = useForm<any>({
        resolver: zodResolver(accountUserSchema),
        defaultValues: {
            fullName: "",
            email: "",
            phone: "",
            status: UserStatus.ACTIVE,
            avatar: "",
        },
    });

    const avatar = watch("avatar");

    useEffect(() => {
        if (user) {
            reset({
                fullName: user.fullName,
                email: user.email,
                phone: user.phone || "",
                status: user.status,
                avatar: user.avatar || "",
            });
        }
    }, [user, reset]);

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
                toast.success("Cập nhật tài khoản khách hàng thành công!");
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Cập nhật thất bại");
            }
        });
    };

    const handleDelete = () => {
        if (window.confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) {
            removeUser(id!, {
                onSuccess: () => {
                    toast.success("Xóa tài khoản thành công!");
                    navigate(`/${prefixAdmin}/account-user/list`);
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Xóa thất bại");
                }
            });
        }
    };

    if (isUserLoading) {
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
                        { label: "Khách hàng", to: `/${prefixAdmin}/account-user/list` },
                        { label: user?.fullName || "Chi tiết" }
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
                    value="ticketServiceOrder"
                    label={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Icon icon="solar:calendar-date-bold" width={20} />
                            <span>Lịch sử dịch vụ</span>
                        </Stack>
                    }
                />
                <Tab
                    disableRipple
                    value="order"
                    label={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Icon icon="solar:cart-large-bold" width={20} />
                            <span>Lịch sử đơn hàng</span>
                        </Stack>
                    }
                />
                <Tab
                    disableRipple
                    value="boarding"
                    label={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Icon icon="solar:home-2-bold" width={20} />
                            <span>Lịch sử khách sạn</span>
                        </Stack>
                    }
                />
                <Tab
                    disableRipple
                    value="address"
                    label={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Icon icon="solar:map-point-bold" width={20} />
                            <span>Địa chỉ</span>
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
                                        label={user?.status === UserStatus.ACTIVE ? 'Hoạt động' : 'Tạm dừng'}
                                        sx={{
                                            bgcolor: user?.status === UserStatus.ACTIVE ? 'rgba(34, 197, 94, 0.16)' : 'rgba(255, 171, 0, 0.16)',
                                            color: user?.status === UserStatus.ACTIVE ? 'rgb(17, 141, 87)' : 'rgb(183, 110, 0)',
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
                                    Định dạng cho phép *.jpeg, *.jpg, *.png, *.gif <br /> dung lượng tối đa 3 Mb
                                </Typography>

                                <Box sx={{ mt: 4 }}>
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
                                            fontSize: '0.875rem',
                                            textTransform: 'none',
                                            px: 2,
                                            py: 1,
                                            borderRadius: "var(--shape-borderRadius)",
                                            boxShadow: 'none',
                                        }}
                                    >
                                        Xóa tài khoản
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, md: 8 }}>
                            <Card sx={{ p: 4, mb: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
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
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="phone"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label="Số điện thoại"
                                                fullWidth
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
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

                            {id && <UserUserTicketList userId={id} />}
                        </Grid>
                    </Grid>
                </form>
            )}

            {currentTab === "ticketServiceOrder" && id && (
                <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", overflow: 'hidden' }}>
                    <Box sx={{ p: 3, borderBottom: '1px dashed var(--palette-divider)' }}>
                        <Typography variant="h6">Lịch sử đặt chỗ dịch vụ</Typography>
                    </Box>
                    <UserTicketServiceOrderHistory userId={id} />
                </Card>
            )}

            {currentTab === "order" && id && (
                <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", overflow: 'hidden' }}>
                    <Box sx={{ p: 3, borderBottom: '1px dashed var(--palette-divider)' }}>
                        <Typography variant="h6">Lịch sử đơn hàng sản phẩm</Typography>
                    </Box>
                    <UserOrderHistory userId={id} />
                </Card>
            )}

            {currentTab === "boarding" && id && (
                <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", overflow: 'hidden' }}>
                    <Box sx={{ p: 3, borderBottom: '1px dashed var(--palette-divider)' }}>
                        <Typography variant="h6">Lịch sử khách sạn (Boarding)</Typography>
                    </Box>
                    <UserBoardingHistory userId={id} />
                </Card>
            )}

            {currentTab === "address" && id && (
                <Card sx={{ borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", p: 3 }}>
                    <UserAddressBook userId={id} />
                </Card>
            )}
        </Box>
    );
};
