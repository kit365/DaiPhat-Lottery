"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from '@mui/material';
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { adjustDepositSchema, AdjustDepositFormValues } from "../../schemas/street-agent.schema";
import { Button } from "../../../../components/ui/Button";

interface DepositAdjustDialogProps {
    open: boolean;
    currentBalance?: number | null;
    loading?: boolean;
    onClose: () => void;
    onConfirm: (values: AdjustDepositFormValues) => void;
}

export const DepositAdjustDialog = ({
    open,
    currentBalance,
    loading = false,
    onClose,
    onConfirm,
}: DepositAdjustDialogProps) => {
    const { control, handleSubmit, reset } = useForm<AdjustDepositFormValues>({
        resolver: zodResolver(adjustDepositSchema) as any,
        defaultValues: {
            depositBalance: 0,
            depositAdjustmentReason: "",
        },
    });

    useEffect(() => {
        if (open) {
            reset({
                depositBalance: currentBalance ?? 0,
                depositAdjustmentReason: "",
            });
        }
    }, [open, currentBalance, reset]);

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ fontWeight: 700 }}>Điều chỉnh cọc</DialogTitle>
            <form
                onSubmit={handleSubmit((values) => {
                    onConfirm(values);
                })}
            >
                <DialogContent>
                    <Stack spacing={2.5} sx={{ pt: 1 }}>
                        <Controller
                            name="depositBalance"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                                    }
                                    type="number"
                                    inputProps={{ min: 0 }}
                                    label="Số tiền cọc đang giữ (VNĐ)"
                                    fullWidth
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />
                        <Controller
                            name="depositAdjustmentReason"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    label="Lý do điều chỉnh"
                                    placeholder="Nhập lý do điều chỉnh cọc legacy"
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={handleClose} disabled={loading}>
                        Hủy
                    </Button>
                    <Button type="submit" loading={loading} label="Xác nhận" loadingLabel="Đang lưu..." />
                </DialogActions>
            </form>
        </Dialog>
    );
};
