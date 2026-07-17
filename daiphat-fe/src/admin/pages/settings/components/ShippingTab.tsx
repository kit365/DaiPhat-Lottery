import { Card, TextField, Button, Typography, Box, Stack } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingShippingSchema, SettingShippingFormValues } from "../../../schemas/setting.schema";
import { useSettingShipping, useUpdateSettingShipping } from "../hooks/useSettings";
import { useEffect } from "react";

export const ShippingTab = () => {
    const { data: shippingData, isLoading } = useSettingShipping();
    const { mutate: updateShipping, isPending } = useUpdateSettingShipping();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SettingShippingFormValues>({
        resolver: zodResolver(settingShippingSchema),
        defaultValues: {
            tokenGoShip: "",
        },
    });

    useEffect(() => {
        if (shippingData) {
            reset(shippingData);
        }
    }, [shippingData, reset]);

    const onSubmit = (data: SettingShippingFormValues) => {
        updateShipping(data);
    };

    if (isLoading) return <Typography>Đang tải...</Typography>;

    return (
        <Card sx={{ p: 4, borderRadius: "16px", boxShadow: "0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)" }}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={4}>
                    <Box>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                            Cấu hình GoShip
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                            Nhập mã truy cập API của GoShip để tích hợp tính năng vận chuyển.
                        </Typography>

                        <Controller
                            name="tokenGoShip"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Token GoShip"
                                    placeholder="Ví dụ: eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs..."
                                    error={!!errors.tokenGoShip}
                                    helperText={errors.tokenGoShip?.message}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '8px',
                                        }
                                    }}
                                />
                            )}
                        />
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
                                }
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
