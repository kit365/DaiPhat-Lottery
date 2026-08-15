"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, TextField } from "@mui/material";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { adjustDepositSchema, AdjustDepositFormValues } from "../../schemas/street-agent.schema";
import { Button } from "../../../../components/ui/Button";
import { AdminDialog } from "../../../../components/ui/AdminDialog";

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

    return (
        <AdminDialog
            open={open}
            title="Điều chỉnh cọc"
            maxWidth="xs"
            disableClose={loading}
            onClose={onClose}
            actions={
                <>
                    <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading} label="Quay lại" />
                    <Button
                        type="submit"
                        form="deposit-adjust-form"
                        loading={loading}
                        label="Xác nhận"
                        loadingLabel="Đang lưu..."
                    />
                </>
            }
        >
            <form
                id="deposit-adjust-form"
                onSubmit={handleSubmit((values) => {
                    onConfirm(values);
                })}
            >
                <Stack spacing={2.5}>
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
            </form>
        </AdminDialog>
    );
};
