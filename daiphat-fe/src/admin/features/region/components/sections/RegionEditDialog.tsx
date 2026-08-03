"use client";

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    ThemeProvider,
    createTheme,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { LoadingButton } from "../../../../components/ui/LoadingButton";
import { CanAccess } from "../../../../components/auth/CanAccess";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { updateRegionSchema, UpdateRegionFormValues } from "../../schemas/region.schema";
import { formatRegionDefaultDrawTime, LotteryRegionResponse } from "../../types/region.type";
import { useUpdateRegion } from "../../hooks/useRegion";

interface RegionEditDialogProps {
    region: LotteryRegionResponse | null;
    onClose: () => void;
}

export const RegionEditDialog = ({ region, onClose }: RegionEditDialogProps) => {
    const { mutate: updateRegion, isPending } = useUpdateRegion();
    const outerTheme = useTheme();
    const isMobile = useMediaQuery(outerTheme.breakpoints.down("sm"));
    const localTheme = createTheme(outerTheme, {
        components: {
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: "16px",
                        padding: "16px",
                        width: "100%",
                        maxWidth: "500px",
                        margin: isMobile ? "16px" : "32px",
                        backgroundImage: "none",
                        backgroundColor: outerTheme.palette.background.paper,
                        boxShadow: "var(--customShadows-dialog)",
                    },
                },
            },
        },
    });

    const { control, handleSubmit, reset } = useForm<UpdateRegionFormValues>({
        resolver: zodResolver(updateRegionSchema),
        defaultValues: {
            minNumber: 0,
            maxNumber: 999999,
            defaultDrawTime: "16:15",
        },
    });

    useEffect(() => {
        if (region) {
            reset({
                minNumber: region.minNumber,
                maxNumber: region.maxNumber,
                defaultDrawTime: formatRegionDefaultDrawTime(region.defaultDrawTime),
            });
        }
    }, [region, reset]);

    const onSubmit = (data: UpdateRegionFormValues) => {
        if (!region) return;

        updateRegion(
            { code: region.code, data },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        toast.success("Cập nhật cấu hình miền thành công!");
                        onClose();
                    } else {
                        toast.error(res.message || "Cập nhật cấu hình miền thất bại!");
                    }
                },
                onError: (err: unknown) => {
                    const message =
                        (err as { response?: { data?: { message?: string } }; message?: string })
                            ?.response?.data?.message ||
                        (err as { message?: string })?.message ||
                        "Cập nhật thất bại!";
                    toast.error(message);
                },
            }
        );
    };

    return (
        <ThemeProvider theme={localTheme}>
            <Dialog open={!!region} onClose={onClose} maxWidth="sm" fullWidth>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogTitle sx={{ pb: 2, fontWeight: 700, fontSize: "1.25rem" }}>
                        Cấu hình số vé - {region?.name}
                    </DialogTitle>
                    <DialogContent sx={{ py: "24px !important" }}>
                        <Stack spacing={3}>
                            <Box>
                                <Controller
                                    name="minNumber"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            type="number"
                                            label="Số nhỏ nhất"
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Box>
                            <Box>
                                <Controller
                                    name="maxNumber"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            type="number"
                                            label="Số lớn nhất"
                                            error={!!fieldState.error}
                                            helperText={fieldState.error?.message}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                            fullWidth
                                        />
                                    )}
                                />
                            </Box>
                            <Box>
                                <Controller
                                    name="defaultDrawTime"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TimePicker
                                            label="Giờ quay mặc định"
                                            value={field.value ? dayjs(`2000-01-01T${field.value}`) : null}
                                            onChange={(newValue) => {
                                                field.onChange(newValue ? newValue.format("HH:mm") : "");
                                            }}
                                            localeText={{ cancelButtonLabel: "Hủy" }}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    error: !!fieldState.error,
                                                    helperText:
                                                        fieldState.error?.message ||
                                                        "Giờ quay mặc định khi tạo nhà đài trong miền này",
                                                    InputLabelProps: { shrink: true },
                                                },
                                            }}
                                        />
                                    )}
                                />
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ pt: 2, px: 3, pb: 2 }}>
                        <Button onClick={onClose} variant="outlined" color="inherit" disabled={isPending}>
                            Hủy
                        </Button>
                        <CanAccess permission={PERMISSIONS.REGION.EDIT}>
                            <LoadingButton
                                type="submit"
                                loading={isPending}
                                label="Lưu thay đổi"
                                loadingLabel="Đang lưu..."
                                variant="contained"
                                className="btn-primary-admin"
                            />
                        </CanAccess>
                    </DialogActions>
                </form>
            </Dialog>
        </ThemeProvider>
    );
};
