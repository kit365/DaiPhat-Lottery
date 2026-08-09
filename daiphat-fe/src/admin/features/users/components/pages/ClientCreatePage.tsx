"use client";

import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { Title } from '../../../../components/ui/Title';
import { CollapsibleCard } from '../../../../components/ui/CollapsibleCard';
import { useCreateUser, useUploadUserAvatar } from "../../hooks/useUsers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { accountUserSchema } from "../../../../schemas/account-user.schema";
import { ROUTES } from '../../../../constants/routes';
import { toast } from "react-toastify";
import { useNavigate } from '@/components/router-compat';
import {
    Box,
    TextField,
    Stack,
    Alert,
    AlertTitle,
} from "@mui/material";
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { UserAvatarUploader } from '../sections/UserAvatarUploader';

export const ClientCreatePage = () => {
    const navigate = useNavigate();
    const { mutateAsync: create, isPending } = useCreateUser();
    const { mutateAsync: uploadAvatar } = useUploadUserAvatar();
    const [isUploading, setIsUploading] = useState(false);
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
                    setIsUploading(true);
                    await uploadAvatar({ id: String(userId), file: avatarFile });
                } catch {
                    toast.warning("Tài khoản đã được tạo nhưng tải ảnh đại diện thất bại.");
                } finally {
                    setIsUploading(false);
                }
            }

            toast.success("Tạo khách hàng thành công!");
            navigate(ROUTES.ADMIN.ACCOUNTS.USER.LIST);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Tạo thất bại");
        }
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Thêm khách hàng mới" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: ROUTES.ADMIN.ROOT },
                            { label: "Danh sách Khách hàng", to: ROUTES.ADMIN.ACCOUNTS.USER.LIST },
                            { label: "Thêm khách hàng mới" },
                        ]}
                    />
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CollapsibleCard title="Thông tin khách hàng" expanded onToggle={() => undefined}>
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
                                        sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}
                                    />
                                )}
                            />
                        </Box>

                        <Alert severity="info" sx={{ borderRadius: "var(--shape-borderRadius)" }}>
                            <AlertTitle>Thông tin mật khẩu</AlertTitle>
                            Mật khẩu sẽ được hệ thống <strong>tự động tạo</strong> và gửi về email của khách hàng. Người dùng sẽ được yêu cầu đổi mật khẩu trong lần đăng nhập đầu tiên.
                        </Alert>

                        <LoadingButton
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
