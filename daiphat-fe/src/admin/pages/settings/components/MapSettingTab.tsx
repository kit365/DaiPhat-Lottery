"use client";

import { Box, Card, Grid, TextField, Button, Typography, Stack, Alert, Link } from "@mui/material";
import { Icon } from '@/admin/components/ui/AdminIcon';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const mapSettingSchema = z.object({
    goongApiKey: z.string().optional().or(z.literal("")),
    goongMapKey: z.string().optional().or(z.literal("")),
});

type MapSettingFormValues = z.infer<typeof mapSettingSchema>;

/**
 * Goong keys are secrets — not stored in system_config GENERAL_SETTING.
 * Wire to dedicated secret storage / MAP_SETTING later.
 */
export const MapSettingTab = () => {
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<MapSettingFormValues>({
        resolver: zodResolver(mapSettingSchema),
        defaultValues: {
            goongApiKey: "",
            goongMapKey: "",
        },
    });

    const onSubmit = (_data: MapSettingFormValues) => {
        // Intentionally no-op until secret storage exists.
    };

    return (
        <Stack spacing={3}>
            <Alert severity="warning" sx={{ borderRadius: "12px" }}>
                API key Goong là dữ liệu nhạy cảm — <strong>chưa lưu qua system_config</strong>.
                Tab này tạm khóa lưu; sẽ tách sang secret storage / cấu hình riêng (không dùng mock{" "}
                <code>/admin/setting/general</code>).
            </Alert>

            <Alert severity="info" sx={{ borderRadius: "12px" }}>
                Hệ thống đang chuyển đổi sang sử dụng <strong>Goong Maps API</strong> để tăng độ chính xác tìm kiếm tại Việt Nam.
                <br />
                Bạn có thể lấy Key tại{" "}
                <Link href="https://account.goong.io" target="_blank" rel="noopener">
                    account.goong.io
                </Link>
            </Alert>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                        <Card sx={{ p: 4, borderRadius: "16px", boxShadow: "var(--customShadows-card)" }}>
                            <Stack spacing={4}>
                                <Box>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            mb: 1,
                                            fontWeight: 700,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        <Icon icon="solar:map-point-bold" width={24} className="text-blue-500" />
                                        Cấu hình Goong Maps
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Form chỉ để xem trước UI — chưa kết nối backend.
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
                                                    disabled
                                                    label="Goong API Key (Search API)"
                                                    placeholder="Sẽ cấu hình qua secret storage"
                                                    error={!!errors.goongApiKey}
                                                    helperText="Dùng để tìm kiếm địa chỉ (Geocoding/AutoComplete)"
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
                                                    disabled
                                                    label="Goong Map Key (Tiles API)"
                                                    placeholder="Sẽ cấu hình qua secret storage"
                                                    error={!!errors.goongMapKey}
                                                    helperText="Dùng để hiển thị giao diện bản đồ (Tiles)"
                                                />
                                            )}
                                        />
                                    </Grid>
                                </Grid>

                                <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
                                    <Button
                                        className="btn-primary-admin"
                                        type="submit"
                                        variant="contained"
                                        disabled
                                        startIcon={<Icon icon="solar:diskette-bold" />}
                                        sx={{
                                            background: "#1C252E",
                                            px: 6,
                                            py: 1.5,
                                            borderRadius: "12px",
                                            fontWeight: 700,
                                            "&:hover": { background: "#454F5B" },
                                        }}
                                    >
                                        Lưu cấu hình bản đồ (sắp có)
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
