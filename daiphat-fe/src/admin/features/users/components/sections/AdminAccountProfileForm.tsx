"use client";

import { Control, Controller } from "react-hook-form";
import { Box, MenuItem, Stack, TextField } from "@mui/material";
import { CollapsibleCard } from "../../../../components/ui/CollapsibleCard";
import { Button } from "../../../../components/ui/Button";
import { UserAvatarUploader } from "./UserAvatarUploader";
import { UserStatus } from "../../../../../types/user.type";

type RoleOption = { code: string; name: string };

type Props = {
    control: Control<any>;
    avatarUrl?: string;
    isUploading?: boolean;
    isSaving?: boolean;
    roles?: RoleOption[];
    showRoles?: boolean;
    title?: string;
    subheader?: string;
    onAvatarFile: (file: File, previewUrl: string) => void;
    onResetPassword: () => void;
    onDelete: () => void;
};

export const AdminAccountProfileForm = ({
    control,
    avatarUrl,
    isUploading,
    isSaving,
    roles = [],
    showRoles = true,
    title = "Thông tin nhân viên",
    subheader = "Thông tin cơ bản của tài khoản quản trị.",
    onAvatarFile,
    onResetPassword,
    onDelete,
}: Props) => {
    return (
        <CollapsibleCard
            title={title}
            subheader={subheader}
            expanded
            collapsible={false}
            onToggle={() => undefined}
            extraAction={
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onResetPassword}
                    label="Đặt lại mật khẩu"
                    sx={{ fontWeight: 700, borderRadius: "8px" }}
                />
            }
        >
            <Stack spacing={3} sx={{ p: 3 }}>
                <UserAvatarUploader
                    embedded
                    avatarUrl={avatarUrl}
                    uploading={isUploading}
                    onFileSelect={onAvatarFile}
                />

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 3 }}>
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
                                label="Email"
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
                            <TextField {...field} value={field.value || ""} label="Số điện thoại" fullWidth />
                        )}
                    />
                    {showRoles ? (
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
                                onChange={(event) => field.onChange([event.target.value])}
                            >
                                {roles.map((role) => (
                                    <MenuItem key={role.code} value={role.code} sx={{ fontSize: "0.875rem" }}>
                                        {role.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    />
                    ) : null}
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                value={field.value || UserStatus.ACTIVE}
                                label="Trạng thái"
                                select
                                fullWidth
                            >
                                <MenuItem value={UserStatus.ACTIVE} sx={{ fontSize: "0.875rem" }}>Hoạt động</MenuItem>
                                <MenuItem value={UserStatus.LOCKED} sx={{ fontSize: "0.875rem" }}>Tạm dừng</MenuItem>
                                <MenuItem value={UserStatus.BANNED} sx={{ fontSize: "0.875rem" }}>Bị cấm</MenuItem>
                            </TextField>
                        )}
                    />
                </Box>

                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1.5}>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={onDelete}
                        label="Xóa tài khoản"
                        sx={{
                            color: "#B71D18",
                            bgcolor: "rgba(255, 86, 48, 0.08)",
                            "&:hover": { bgcolor: "rgba(255, 86, 48, 0.24)", boxShadow: "none" },
                            boxShadow: "none",
                        }}
                    />
                    <Button
                        type="submit"
                        loading={isSaving}
                        label="Lưu thay đổi"
                        loadingLabel="Đang lưu..."
                    />
                </Stack>
            </Stack>
        </CollapsibleCard>
    );
};
