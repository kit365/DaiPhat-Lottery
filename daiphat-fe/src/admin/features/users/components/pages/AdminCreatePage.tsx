"use client";

import { PageHeader } from '../../../../components/ui/PageHeader';
import { CollapsibleCard } from '../../../../components/ui/CollapsibleCard';
import { useCreateUser, useUploadUserAvatar } from "../../hooks/useUsers";
import { useRoles } from "../../../role/hooks/useRole";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { accountAdminSchema } from "../../../../schemas/account-admin.schema";
import { ROUTES } from '../../../../constants/routes';
import { toast } from "react-toastify";
import { useNavigate } from '@/components/router-compat';
import {
    Box,
    TextField,
    MenuItem,
    Stack,
    Alert,
    AlertTitle,
    ListItemText,
} from "@mui/material";
import { Button } from '../../../../components/ui/Button';
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

            toast.success("Tạo nhân viên thành công!");
            navigate(ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Tạo thất bại");
        }
    };

    return (
        <>
            <PageHeader
                title="Thêm nhân viên mới"
                breadcrumbItems={[
                            { label: "Dashboard", to: ROUTES.ADMIN.ROOT },
                            { label: "Danh sách Nhân viên", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                            { label: "Thêm nhân viên mới" },
                        ]}
            />

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CollapsibleCard title="Thông tin nhân viên" expanded onToggle={() => undefined}>
                    <Stack spacing={3} sx={{ p: 3 }}>
                        <UserAvatarUploader
                            embedded
                            avatarPreview={avatarPreview}
                            onFileSelect={(file, preview) => {
                                setAvatarFile(file);
                                setAvatarPreview(preview);
                            }}
                        />

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
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
                                name="email"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label="Email"
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
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
                                    >
                                        {roles.map((role: any) => (
                                            <MenuItem key={role.code} value={role.code}>
                                                <ListItemText primary={role.name} />
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                        </Box>

                        <Alert severity="info" sx={{ borderRadius: "var(--shape-borderRadius)" }}>
                            <AlertTitle>Thông tin mật khẩu</AlertTitle>
                            Mật khẩu sẽ được hệ thống <strong>tự động tạo</strong> và gửi về email của người dùng. Người dùng sẽ được yêu cầu đổi mật khẩu trong lần đăng nhập đầu tiên.
                        </Alert>

                        <Button
                            type="submit"
                            variant="contained"
                            loading={isPending || isUploading}
                            label="Lưu"
                            loadingLabel={isUploading ? "Đang tải ảnh..." : "Đang lưu..."}
                            sx={{ alignSelf: 'flex-end' }}
                        />
                    </Stack>
                </CollapsibleCard>
            </form>
        </>
    );
};
