import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { useUpdateAccount, useAccountDetail, useDeleteAccount } from "./hooks/useAccountAdmin";
import { useRoles } from "../role/hooks/useRole";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { accountAdminSchema } from "../../schemas/account-admin.schema";
import { prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
    Box,
    TextField,
    Typography,
    Card,
    MenuItem,
    CircularProgress,
    Stack,
    Chip
} from "@mui/material";
import { UserStatus } from "../../../types/user.type";
import Grid from "@mui/material/Grid";
import { uploadImagesToCloudinary } from "../../api/uploadCloudinary.api";
import { LoadingButton } from "../../components/ui/LoadingButton";

export const AccountAdminEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: account, isLoading } = useAccountDetail(id);
    const { mutate: update, isPending } = useUpdateAccount();
    const { mutate: removeAccount } = useDeleteAccount();
    const { data: roles = [] } = useRoles();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

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
                roles: account.roles?.map((r: any) => typeof r === 'string' ? r : r.code) || [],
                avatar: account.avatar || "",
            });
        }
    }, [account, reset]);

    const handleOpenFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Định dạng file không hợp lệ. Vui lòng chọn *.jpeg, *.jpg, *.png, hoặc *.gif");
            event.target.value = "";
            return;
        }

        // Validate file size (3MB)
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
        if (window.confirm("Bạn có chắc chắn muốn xóa quản trị viên này?")) {
            removeAccount(id!, {
                onSuccess: () => {
                    toast.success("Xóa quản trị viên thành công!");
                    navigate(`/${prefixAdmin}/account-admin/list`);
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
                toast.success("Cập nhật quản trị viên thành công!");
                navigate(`/${prefixAdmin}/account-admin/list`);
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
                    <Title title="Chỉnh sửa quản trị viên" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Quản trị viên", to: `/${prefixAdmin}/account-admin/list` },
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

                            <Box sx={{ mt: 4 }}>
                                <LoadingButton
                                    variant="contained"
                                    color="error"
                                    onClick={handleDelete}
                                    label="Xóa tài khoản"
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
                                        border: 'none',
                                    }}
                                />
                            </Box>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8 }}>
                        <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
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
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};




