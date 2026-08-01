import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Title } from '../../../../components/ui/Title';
import { useCreateUser, useUploadUserAvatar } from "../../hooks/useUsers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { accountUserSchema } from "../../../../schemas/account-user.schema";
import { prefixAdmin } from '../../../../constants/routes';
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
    Box,
    TextField,
    Card,
    Stack,
    Alert,
    AlertTitle
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { UserAvatarUploader } from '../sections/UserAvatarUploader';

export const ClientCreatePage = () => {
    const navigate = useNavigate();
    const { mutateAsync: create, isPending } = useCreateUser();
    const { mutateAsync: uploadAvatar } = useUploadUserAvatar();
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState("");

    const {
        control,
        handleSubmit,
    } = useForm<any>({
        resolver: zodResolver(accountUserSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
        },
    });

    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    const onSubmit = async (data: any) => {
        try {
            const response = await create(data);
            const userId = response.data?.id;

            if (avatarFile && userId) {
                try {
                    await uploadAvatar({ id: String(userId), file: avatarFile });
                } catch {
                    toast.warning("Tài khoản đã được tạo nhưng tải ảnh đại diện thất bại.");
                }
            }

            toast.success("Tạo tài khoản khách hàng thành công!");
            navigate(`/${prefixAdmin}/account-user/list`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Tạo thất bại");
        }
    };

    return (
        <Box sx={{ p: 3, pt: 2, display: "flex", flexDirection: "column", gap: 3, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
            <Box className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Tạo tài khoản khách hàng" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: `/${prefixAdmin}` },
                            { label: "Khách hàng", to: `/${prefixAdmin}/account-user/list` },
                            { label: "Tạo mới" }
                        ]}
                    />
                </div>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <UserAvatarUploader
                            avatarPreview={avatarPreview}
                            onFileSelect={(file, preview) => {
                                setAvatarFile(file);
                                setAvatarPreview(preview);
                            }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 8 }}>
                        <Card sx={{ 
                            p: 4, 
                            borderRadius: '16px',
                            border: '1px solid var(--palette-divider)',
                            boxShadow: 'var(--shadow-sm)',
                            bgcolor: 'var(--palette-background-paper)'
                        }}>
                            <Box sx={{ mb: 3 }}>
                                <Alert severity="info" sx={{ borderRadius: "var(--shape-borderRadius)" }}>
                                    <AlertTitle>Thông tin mật khẩu</AlertTitle>
                                    Mật khẩu sẽ được hệ thống <strong>tự động tạo</strong> và gửi về email của khách hàng. Người dùng sẽ được yêu cầu đổi mật khẩu trong lần đăng nhập đầu tiên.
                                </Alert>
                            </Box>

                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
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
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } }}
                                        />
                                    )}
                                />

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
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } }}
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
                                            sx={{ 
                                                gridColumn: 'span 2',
                                                '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } 
                                            }}
                                        />
                                    )}
                                />
                            </Box>

                            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 4 }}>
                                <LoadingButton
                                    label="Tạo tài khoản"
                                    type="submit"
                                    loading={isPending}
                                    variant="contained"
                                    sx={{
                                        bgcolor: 'var(--palette-text-primary)',
                                        color: 'var(--palette-common-white)',
                                        px: 4,
                                        py: 1,
                                        borderRadius: 'var(--shape-borderRadius)',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        '&:hover': { bgcolor: 'var(--palette-grey-800)' },
                                    }}
                                />
                            </Stack>
                        </Card>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};
