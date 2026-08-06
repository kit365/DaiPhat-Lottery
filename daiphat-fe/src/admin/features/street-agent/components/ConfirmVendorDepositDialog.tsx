"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { LoadingButton } from "../../../components/ui/LoadingButton";
import { useConfirmVendorAllocation } from "../hooks/useVendorAllocation";
import { useVendorSettingsDefaults } from "../hooks/useVendorSettingsDefaults";
import { StreetAgentProfile, VendorAllocationBatch } from "../types/street-agent.type";
import { formatCommission, formatCurrency } from "../utils/format";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

const getApiErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || fallback;

export const estimateDepositRequired = (
    allocatedQuantity: number,
    unitPrice?: number | null,
    depositRate?: number | null
): number | null => {
    if (
        !Number.isFinite(allocatedQuantity) ||
        allocatedQuantity < 0 ||
        unitPrice == null ||
        depositRate == null ||
        !Number.isFinite(unitPrice) ||
        !Number.isFinite(depositRate)
    ) {
        return null;
    }
    return Math.round(allocatedQuantity * unitPrice * depositRate);
};

interface ConfirmVendorDepositDialogProps {
    open: boolean;
    batch: VendorAllocationBatch | null;
    profile?: StreetAgentProfile | null;
    onClose: () => void;
    onSuccess?: (batch: VendorAllocationBatch) => void;
}

export const ConfirmVendorDepositDialog = ({
    open,
    batch,
    profile,
    onClose,
    onSuccess,
}: ConfirmVendorDepositDialogProps) => {
    const { defaults: vendorDefaults } = useVendorSettingsDefaults();
    const { mutate: confirmDraft, isPending } = useConfirmVendorAllocation();
    const [depositReceived, setDepositReceived] = useState("");

    const unitPriceUsed = useMemo(() => {
        if (!batch) return null;
        if (batch.vendorUnitPriceSnapshot != null && Number.isFinite(batch.vendorUnitPriceSnapshot)) {
            return Number(batch.vendorUnitPriceSnapshot);
        }
        return vendorDefaults.defaultUnitPrice ?? null;
    }, [batch, vendorDefaults.defaultUnitPrice]);

    const depositRateUsed = useMemo(() => {
        if (!batch) return null;
        if (batch.depositRateSnapshot != null && Number.isFinite(batch.depositRateSnapshot)) {
            return Number(batch.depositRateSnapshot);
        }
        return vendorDefaults.depositRate ?? null;
    }, [batch, vendorDefaults.depositRate]);

    const requiredAmount = useMemo(() => {
        if (!batch) return null;
        if (batch.depositRequiredAmount != null && Number.isFinite(batch.depositRequiredAmount)) {
            return Number(batch.depositRequiredAmount);
        }
        return estimateDepositRequired(
            batch.allocatedQuantity,
            unitPriceUsed,
            depositRateUsed
        );
    }, [batch, unitPriceUsed, depositRateUsed]);

    useEffect(() => {
        if (!open) return;
        setDepositReceived(requiredAmount != null ? String(requiredAmount) : "");
    }, [open, requiredAmount, batch?.id]);

    const receivedAmount = Number(depositReceived);
    const receivedValid = Number.isFinite(receivedAmount) && receivedAmount >= 0;
    const insufficient =
        requiredAmount != null && receivedValid && receivedAmount < requiredAmount;
    const balanceBefore = profile?.depositBalance ?? 0;
    const balanceAfter =
        receivedValid ? balanceBefore + receivedAmount : null;

    const canSubmit =
        !!batch &&
        !!profile &&
        requiredAmount != null &&
        receivedValid &&
        !insufficient;

    const handleSubmit = () => {
        if (!batch || !canSubmit) return;
        confirmDraft(
            {
                id: batch.id,
                data: { depositReceivedAmount: receivedAmount },
            },
            {
                onSuccess: (response) => {
                    toast.success(response.message || "Đã xác nhận bàn giao vé và nhận tiền cọc.");
                    if (response.data) onSuccess?.(response.data);
                    onClose();
                },
                onError: (error: any) => {
                    toast.error(getApiErrorMessage(error, "Xác nhận bàn giao thất bại"));
                },
            }
        );
    };

    return (
        <Dialog open={open} onClose={isPending ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>Xác nhận bàn giao & nhận cọc</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Phiếu <strong>{batch?.batchCode || "—"}</strong> ·{" "}
                        {batch?.allocatedQuantity ?? 0} vé
                        {profile
                            ? ` · ${`${profile.lastName || ""} ${profile.firstName || ""}`.trim()}`
                            : ""}
                    </Typography>

                    <TextField
                        label="Cọc cần thu"
                        value={requiredAmount == null ? "—" : formatCurrency(requiredAmount)}
                        InputProps={{ readOnly: true }}
                        helperText={
                            requiredAmount == null
                                ? "Chưa đủ cấu hình giá vendor / tỷ lệ cọc để tính cọc cần thu."
                                : `= ${batch?.allocatedQuantity ?? 0} × ${formatCurrency(
                                      unitPriceUsed
                                  )} × ${formatCommission(depositRateUsed)}${
                                      batch?.vendorUnitPriceSnapshot != null ||
                                      batch?.depositRateSnapshot != null
                                          ? " (theo snapshot phiếu)"
                                          : " (theo cấu hình hệ thống hiện tại)"
                                  }`
                        }
                        sx={fieldSx}
                        fullWidth
                    />

                    <TextField
                        label="Tiền thực nhận *"
                        type="number"
                        value={depositReceived}
                        onChange={(e) => setDepositReceived(e.target.value)}
                        error={insufficient || (depositReceived !== "" && !receivedValid)}
                        helperText={
                            insufficient
                                ? `Tiền cọc thực nhận phải ≥ ${formatCurrency(requiredAmount)}`
                                : "Nhập số tiền cọc thực tế thu được từ đại lý."
                        }
                        inputProps={{ min: 0, step: 1000 }}
                        sx={fieldSx}
                        fullWidth
                    />

                    <TextField
                        label="Số dư cọc sau khi nhận"
                        value={
                            !profile
                                ? "—"
                                : balanceAfter == null
                                  ? "—"
                                  : formatCurrency(balanceAfter)
                        }
                        InputProps={{ readOnly: true }}
                        helperText={
                            !profile
                                ? "Không tải được hồ sơ đại lý — không thể xác nhận cọc."
                                : `Số dư hiện tại: ${formatCurrency(balanceBefore)}`
                        }
                        error={!profile}
                        sx={fieldSx}
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isPending}>
                    Đóng
                </Button>
                <LoadingButton
                    loading={isPending}
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    label="Xác nhận bàn giao"
                    loadingLabel="Đang xác nhận..."
                />
            </DialogActions>
        </Dialog>
    );
};
