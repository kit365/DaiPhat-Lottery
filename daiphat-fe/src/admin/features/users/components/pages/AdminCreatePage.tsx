import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Title } from '../../../../components/ui/Title';
import { useCreateUser, useUploadUserAvatar } from "../../hooks/useUsers";
import { useRoles } from "../../../role/hooks/useRole";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { accountAdminSchema } from "../../../../schemas/account-admin.schema";
import { prefixAdmin } from '../../../../constants/routes';
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
    Box,
    TextField,
    Card,
    MenuItem,
    Stack,
    Alert,
    AlertTitle,
    ListItemText,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { UserAvatarUploader } from '../sections/UserAvatarUploader';

export const AdminCreatePage = () => {
    const navigate = useNavigate();
    const { mutateAsync: create, isPending } = useCreateUser();
    const { mutateAsync: uploadAvatar } = useUploadUserAvatar();
    const { data: roles = [] } = useRoles();
    const [isUploading, setIsUploading] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState("");

    const {
        control,
        handleSubmit,
    } = useForm<any>({
        resolver: zodResolver(accountAdminSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            roles: [],
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
                    setIsUploading(true);
                    await uploadAvatar({ id: String(userId), file: avatarFile });
                } catch {
                    toast.warning("Tài khoản đã được tạo nhưng tải ảnh đại diện thất bại.");
                } finally {
                    setIsUploading(false);
                }
            }

            toast.success("Tạo quản trị viên thành công!");
            navigate(`/${prefixAdmin}/account-admin/list`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Tạo thất bại");
        }
    };

    return (
        <Box sx={{ p: 3, pt: 2, display: "flex", flexDirection: "column", gap: 3, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Title title="Tạo quản trị viên mới" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: `/${prefixAdmin}` },
                            { label: "Quản trị viên", to: `/${prefixAdmin}/account-admin/list` },
                            { label: "Tạo mới" }
                        ]}
                    />
                </Box>
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
                                    Mật khẩu sẽ được hệ thống <strong>tự động tạo</strong> và gửi về email của người dùng. Người dùng sẽ được yêu cầu đổi mật khẩu trong lần đăng nhập đầu tiên.
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
                                            label="Email"
                                            fullWidth
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } }}
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
                                            value={field.value?.[0] || ""}
                                            onChange={(e) => field.onChange([e.target.value])}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: "var(--shape-borderRadius)", fontSize: '0.875rem' } }}
                                        >
                                            {roles.map((role: any) => (
                                                <MenuItem key={role.code} value={role.code} sx={{ fontSize: '0.875rem' }}>
                                                    <ListItemText primary={role.name} />
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />

                            </Box>

                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
                                <LoadingButton
                                    type="submit"
                                    loading={isPending || isUploading}
                                    label="Tạo người dùng"
                                    loadingLabel={isUploading ? "Đang tải ảnh..." : "Đang tạo..."}
                                />
                            </Stack>
                        </Card>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};
