"use client";

import { Card, TextField, Button, Typography, Box, Stack, Grid } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingAppPasswordSchema, SettingAppPasswordFormValues } from "@/admin/features/settings/schemas/setting.schema";
import { useSettingAppPassword, useUpdateSettingAppPassword } from "../hooks/useSettings";
import { useEffect } from "react";
import { SpinnerLoading } from "@/admin/components/ui/SpinnerLoading";

export const AppPasswordTab = () => {
    const { data: appData, isLoading } = useSettingAppPassword();
    const { mutate: updateAppPassword, isPending } = useUpdateSettingAppPassword();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SettingAppPasswordFormValues>({
        resolver: zodResolver(settingAppPasswordSchema),
        defaultValues: {
            gmailUser: "",
            gmailPassword: "",
        },
    });

    useEffect(() => {
        if (appData) {
            reset(appData);
        }
    }, [appData, reset]);

    const onSubmit = (data: SettingAppPasswordFormValues) => {
        updateAppPassword(data);
    };

    if (isLoading) return <SpinnerLoading compact />;

    return (
        <Card sx={{ p: 4, borderRadius: "16px", boxShadow: "0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)" }}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={4}>
                    <Box>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                            Google App Password
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                            Cấu hình Gmail và Mật khẩu ứng dụng để hệ thống có thể gửi email (thông báo đặt lịch, quên mật khẩu...).
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="gmailUser"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Email người gửi" placeholder="your-email@gmail.com" error={!!errors.gmailUser} helperText={errors.gmailUser?.message} />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="gmailPassword"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth type="password" label="Mật khẩu ứng dụng" placeholder="16 ký tự mã ứng dụng Google" error={!!errors.gmailPassword} helperText={errors.gmailPassword?.message} />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button className="btn-primary-admin"
                            type="submit"
                            variant="contained"
                            disabled={isPending}
                            sx={{
                                background: "#1C252E",
                                px: 4,
                                py: 1.2,
                                borderRadius: "8px",
                                fontWeight: 700,
                                textTransform: "none",
                                "&:hover": {
                                    background: "#454F5B",
                                },
                            }}
                        >
                            {isPending ? "Đang cập nhật..." : "Cập nhật"}
                        </Button>
                    </Box>
                </Stack>
            </Box>
        </Card>
    );
};
