import { Box, Card, Grid, TextField, Button, Typography, Stack, Alert, Link } from "@mui/material";
import { Icon } from "@iconify/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingGeneralSchema, SettingGeneralFormValues } from "../../../schemas/setting.schema";
import { useSettingGeneral, useUpdateSettingGeneral } from "../hooks/useSettings";
import { useEffect } from "react";

export const MapSettingTab = () => {
    const { data: generalData, isLoading: isSettingsLoading } = useSettingGeneral();
    const { mutate: updateGeneral, isPending } = useUpdateSettingGeneral();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<SettingGeneralFormValues>({
        resolver: zodResolver(settingGeneralSchema),
        defaultValues: {
            goongApiKey: "",
            goongMapKey: ""
        }
    });

    useEffect(() => {
        if (generalData) {
            reset({
                ...generalData,
                goongApiKey: generalData.goongApiKey || "",
                goongMapKey: generalData.goongMapKey || ""
            });
        }
    }, [generalData, reset]);

    const onSubmit = (data: SettingGeneralFormValues) => {
        updateGeneral(data);
    };

    if (isSettingsLoading) return <Typography>Đang tải...</Typography>;

    return (
        <Stack spacing={3}>
            <Alert severity="info" sx={{ borderRadius: "12px" }}>
                Hệ thống đang chuyển đổi sang sử dụng <strong>Goong Maps API</strong> để tăng độ chính xác tìm kiếm tại Việt Nam.
                <br />
                Bạn có thể lấy Key tại <Link href="https://account.goong.io" target="_blank" rel="noopener">account.goong.io</Link>
            </Alert>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                        <Card sx={{ p: 4, borderRadius: "16px", boxShadow: "var(--customShadows-card)" }}>
                            <Stack spacing={4}>
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                                        <Icon icon="solar:map-point-bold" width={24} className="text-blue-500" />
                                        Cấu hình Goong Maps
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Vui lòng nhập các khóa bí mật được cung cấp bởi Goong để sử dụng dịch vụ bản đồ và tìm kiếm địa chỉ.
                                    </Typography>
                                </Box>

                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="goongApiKey"
                                            control={control}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    fullWidth
                                                    label="Goong API Key (Search API)"
                                                    placeholder="Nhập API Key cung cấp bởi Goong..."
                                                    error={!!errors.goongApiKey}
                                                    helperText={errors.goongApiKey?.message || "Dùng để tìm kiếm địa chỉ (Geocoding/AutoComplete)"}
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Controller
                                            name="goongMapKey"
                                            control={control}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    fullWidth
                                                    label="Goong Map Key (Tiles API)"
                                                    placeholder="Nhập Map Key cung cấp bởi Goong..."
                                                    error={!!errors.goongMapKey}
                                                    helperText={errors.goongMapKey?.message || "Dùng để hiển thị giao diện bản đồ (Tiles)"}
                                                />
                                            )}
                                        />
                                    </Grid>
                                </Grid>

                                <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
                                    <Button className="btn-primary-admin"
                                        type="submit"
                                        variant="contained"
                                        disabled={isPending}
                                        startIcon={<Icon icon="solar:diskette-bold" />}
                                        sx={{
                                            background: "#1C252E",
                                            px: 6,
                                            py: 1.5,
                                            borderRadius: "12px",
                                            fontWeight: 700,
                                            "&:hover": { background: "#454F5B" }
                                        }}
                                    >
                                        {isPending ? "Đang lưu..." : "Lưu cấu hình bản đồ"}
                                    </Button>
                                </Box>
                            </Stack>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Stack>
    );
};
