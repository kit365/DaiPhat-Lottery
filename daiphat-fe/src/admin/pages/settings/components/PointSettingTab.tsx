import { Box, Card, Grid, TextField, Button, Typography, Stack, InputAdornment } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { useSettingPoint, useUpdateSettingPoint } from "../hooks/useSettings";
import { useEffect } from "react";

export const PointSettingTab = () => {
    const { data: pointData, isLoading } = useSettingPoint();
    const { mutate: updatePoint, isPending } = useUpdateSettingPoint();

    const {
        control,
        handleSubmit,
        reset,
    } = useForm({
        defaultValues: {
            MONEY_PER_POINT: 10000,
            POINT_TO_MONEY: 100
        }
    });

    useEffect(() => {
        if (pointData) {
            reset(pointData);
        }
    }, [pointData, reset]);

    const onSubmit = (data: any) => {
        updatePoint(data);
    };

    if (isLoading) return <Typography>Đang tải...</Typography>;

    return (
        <Stack spacing={3}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card sx={{ p: 3, borderRadius: "16px", boxShadow: "var(--customShadows-card)" }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Cấu hình tích điểm</Typography>
                            <Stack spacing={3}>
                                <Controller
                                    name="MONEY_PER_POINT"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            type="number"
                                            label="Số tiền để đổi 1 điểm"
                                            placeholder="Ví dụ: 10000"
                                            InputProps={{
                                                endAdornment: <InputAdornment position="end">VNĐ / điểm</InputAdornment>,
                                            }}
                                            helperText="Ví dụ: 10.000đ được tích 1 điểm"
                                        />
                                    )}
                                />
                                <Controller
                                    name="POINT_TO_MONEY"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            type="number"
                                            label="Số tiền quy đổi từ 1 điểm"
                                            placeholder="Ví dụ: 100"
                                            InputProps={{
                                                endAdornment: <InputAdornment position="end">VNĐ / điểm</InputAdornment>,
                                            }}
                                            helperText="Ví dụ: 1 điểm được giảm 100đ khi thanh toán"
                                        />
                                    )}
                                />
                            </Stack>
                        </Card>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button className="btn-primary-admin"
                                type="submit"
                                variant="contained"
                                disabled={isPending}
                                sx={{
                                    background: "#1C252E",
                                    px: 6,
                                    py: 1.5,
                                    borderRadius: "12px",
                                    fontWeight: 700,
                                    fontSize: "0.875rem",
                                    textTransform: "none",
                                    boxShadow: "0 8px 16px rgba(28, 37, 46, 0.24)",
                                    "&:hover": {
                                        background: "#454F5B",
                                        boxShadow: "none"
                                    }
                                }}
                            >
                                {isPending ? "Đang lưu..." : "Lưu cấu hình"}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Stack>
    );
};
