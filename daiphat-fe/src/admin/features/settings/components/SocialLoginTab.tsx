"use client";

import { Card, TextField, Button, Typography, Box, Stack, Grid, Divider } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingLoginSocialSchema, SettingLoginSocialFormValues } from "@/admin/features/settings/schemas/setting.schema";
import { useSettingLoginSocial, useUpdateSettingLoginSocial } from "../hooks/useSettings";
import { useEffect } from "react";
import { SpinnerLoading } from "@/admin/components/ui/SpinnerLoading";

export const SocialLoginTab = () => {
    const { data: socialData, isLoading } = useSettingLoginSocial();
    const { mutate: updateSocial, isPending } = useUpdateSettingLoginSocial();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SettingLoginSocialFormValues>({
        resolver: zodResolver(settingLoginSocialSchema),
        defaultValues: {
            googleClientId: "",
            googleClientSecret: "",
            googleCallbackUrl: "",
            facebookAppId: "",
            facebookAppSecret: "",
            facebookCallbackUrl: "",
        },
    });

    useEffect(() => {
        if (socialData) {
            reset(socialData);
        }
    }, [socialData, reset]);

    const onSubmit = (data: SettingLoginSocialFormValues) => {
        updateSocial(data);
    };

    if (isLoading) return <SpinnerLoading compact />;

    return (
        <Card sx={{ p: 4, borderRadius: "16px", boxShadow: "0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)" }}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={4}>
                    {/* Google Section */}
                    <Box>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                            Google OAuth
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                            Cấu hình đăng nhập bằng tài khoản Google.
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="googleClientId"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Client Id" error={!!errors.googleClientId} helperText={errors.googleClientId?.message} />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="googleClientSecret"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Client Secret" error={!!errors.googleClientSecret} helperText={errors.googleClientSecret?.message} />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="googleCallbackUrl"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Callback URL" error={!!errors.googleCallbackUrl} helperText={errors.googleCallbackUrl?.message} />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    {/* Facebook Section */}
                    <Box>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                            Facebook Login
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                            Cấu hình đăng nhập bằng tài khoản Facebook.
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="facebookAppId"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="App Id" error={!!errors.facebookAppId} helperText={errors.facebookAppId?.message} />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="facebookAppSecret"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="App Secret" error={!!errors.facebookAppSecret} helperText={errors.facebookAppSecret?.message} />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="facebookCallbackUrl"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Callback URL" error={!!errors.facebookCallbackUrl} helperText={errors.facebookCallbackUrl?.message} />
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
