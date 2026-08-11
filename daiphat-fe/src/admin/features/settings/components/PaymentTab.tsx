"use client";

import { Card, TextField, Button, Typography, Box, Stack, Grid, Divider } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingPaymentSchema, SettingPaymentFormValues } from "@/admin/features/settings/schemas/setting.schema";
import { useSettingPayment, useUpdateSettingPayment } from "../hooks/useSettings";
import { useEffect } from "react";
import { SpinnerLoading } from "@/admin/components/ui/SpinnerLoading";

export const PaymentTab = () => {
    const { data: paymentData, isLoading } = useSettingPayment();
    const { mutate: updatePayment, isPending } = useUpdateSettingPayment();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SettingPaymentFormValues>({
        resolver: zodResolver(settingPaymentSchema),
        defaultValues: {
            zaloAppId: "",
            zaloKey1: "",
            zaloKey2: "",
            zaloDomain: "",
            vnpTmnCode: "",
            vnpHashSecret: "",
            vnpUrl: "",
        },
    });

    useEffect(() => {
        if (paymentData) {
            reset(paymentData);
        }
    }, [paymentData, reset]);

    const onSubmit = (data: SettingPaymentFormValues) => {
        updatePayment(data);
    };

    if (isLoading) return <SpinnerLoading compact />;

    return (
        <Card sx={{ p: 4, borderRadius: "16px", boxShadow: "0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)" }}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={4}>
                    {/* ZaloPay Section */}
                    <Box>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                            Cấu hình ZaloPay
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                            Thông số kết nối cổng thanh toán ZaloPay Sandbox/Ticketion.
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="zaloAppId"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="App Id" error={!!errors.zaloAppId} helperText={errors.zaloAppId?.message} />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="zaloDomain"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Tên miền (Domain)" error={!!errors.zaloDomain} helperText={errors.zaloDomain?.message} />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="zaloKey1"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Key 1" error={!!errors.zaloKey1} helperText={errors.zaloKey1?.message} />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="zaloKey2"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Key 2" error={!!errors.zaloKey2} helperText={errors.zaloKey2?.message} />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    {/* VNPay Section */}
                    <Box>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                            Cấu hình VNPay
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                            Thông số kết nối cổng thanh toán VNPay.
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="vnpTmnCode"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Tmn Code" error={!!errors.vnpTmnCode} helperText={errors.vnpTmnCode?.message} />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Controller
                                    name="vnpUrl"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="VNPay URL" error={!!errors.vnpUrl} helperText={errors.vnpUrl?.message} />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="vnpHashSecret"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField {...field} fullWidth label="Hash Secret" error={!!errors.vnpHashSecret} helperText={errors.vnpHashSecret?.message} />
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
