import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { useUpdateUser, useUserDetail, useDeleteUser } from "./hooks/useAccountUser";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { accountUserSchema } from "../../schemas/account-user.schema";
import { prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
    Box,
    TextField,
    Button,
    Typography,
    Card,
    MenuItem,
    CircularProgress,
    Stack,
    Chip
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { uploadImagesToCloudinary } from "../../api/uploadCloudinary.api";
import { UserUserTicketList } from "./sections/UserUserTicketList";
import { LoadingButton } from "../../components/ui/LoadingButton";

export const AccountUserEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: user, isLoading } = useUserDetail(id);
    const { mutate: update, isPending } = useUpdateUser();
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
            status: "active",
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

    const handleOpenFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Định dạng file không hợp lệ. Vui lòng chọn *.jpeg, *.jpg, *.png, hoặc *.gif");
            event.target.value = "";
            return;
        }

        const maxSize = 3 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("Dung lượng file quá lớn. Tối đa là 3 Mb");
            event.target.value = "";
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

    const onSubmit = (data: any) => {
        update({ id: id!, data }, {
            onSuccess: () => {
                toast.success("Cập nhật tài khoản khách hàng thành công!");
                navigate(`/${prefixAdmin}/account-user/list`);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Cập nhật thất bại");
            }
        });
    };

    if (isLoading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
        </Box>
    );

    return (
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Title title="Chỉnh sửa tài khoản khách hàng" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Khách hàng", to: `/${prefixAdmin}/account-user/list` },
                            { label: "Cập nhật" }
                        ]}
                    />
                </Box>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card sx={{ p: '80px 24px', textAlign: 'center', borderRadius: "var(--shape-borderRadius-lg)", position: 'relative', boxShadow: "var(--customShadows-card)" }}>
                            <Box sx={{ position: 'absolute', top: 24, right: 24 }}>
                                <Chip
                                    label={user?.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                                    sx={{
                                        bgcolor: user?.status === 'active' ? 'rgba(34, 197, 94, 0.16)' : 'rgba(255, 171, 0, 0.16)',
                                        color: user?.status === 'active' ? 'rgb(17, 141, 87)' : 'rgb(183, 110, 0)',
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
                                        border: 'none',
                                    }}
                                >
                                    Xóa tài khoản
                                </Button>
                            </Box>
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
                                            <MenuItem value="active" sx={{ fontSize: '0.875rem' }}>Hoạt động</MenuItem>
                                            <MenuItem value="inactive" sx={{ fontSize: '0.875rem' }}>Tạm dừng</MenuItem>
                                        </TextField>
                                    )}
                                />
                            </Box>

                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
                                <LoadingButton
                                    type="submit"
                                    loading={isPending}
                                    label="Lưu thay đổi"
                                    loadingLabel="Đang lưu..."
                                />
                            </Stack>
                        </Card>

                        {id && <UserUserTicketList userId={id} />}
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};




