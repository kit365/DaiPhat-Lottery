"use client";

import { useEffect, useState } from "react";
import {
    Alert,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { toast } from "react-toastify";
import { Button } from "../../../components/ui/Button";
import {
    useConfirmVendorAllocation,
    useVendorConfirmationQuote,
} from "../hooks/useVendorAllocation";
import { StreetAgentProfile, VendorAllocationBatch } from "../types/street-agent.type";
import { formatCurrency, formatDateTime } from "../utils/format";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

const getApiErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || fallback;

const isDepositInsufficientError = (error: any) => {
    const message = String(error?.response?.data?.message || "");
    return (
        message.includes("SAG_022") ||
        message.includes("không đủ") ||
        message.toLowerCase().includes("deposit")
    );
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
    const { mutate: confirmDraft, isPending } = useConfirmVendorAllocation();
    const [depositReceived, setDepositReceived] = useState("");

    const {
        data: quote,
        isLoading: isLoadingQuote,
        isFetching: isFetchingQuote,
        error: quoteError,
        refetch: refetchQuote,
    } = useVendorConfirmationQuote(batch?.id, open && !!batch?.id);

    const requiredAmount =
        quote?.depositRequiredAmount != null && Number.isFinite(quote.depositRequiredAmount)
            ? Number(quote.depositRequiredAmount)
            : null;

    useEffect(() => {
        if (!open) return;
        setDepositReceived(requiredAmount != null ? String(requiredAmount) : "");
    }, [open, requiredAmount, quote?.quotedAt, batch?.id]);

    const receivedAmount = Number(depositReceived);
    const receivedValid = Number.isFinite(receivedAmount) && receivedAmount >= 0;
    const insufficient =
        requiredAmount != null && receivedValid && receivedAmount < requiredAmount;

    const canSubmit =
        !!batch &&
        !!quote &&
        requiredAmount != null &&
        receivedValid &&
        !insufficient &&
        !isLoadingQuote &&
        !isFetchingQuote;

    const handleSubmit = () => {
        if (!batch || !canSubmit) return;
        confirmDraft(
            {
                id: batch.id,
                data: {
                    depositReceivedAmount: receivedAmount,
                    quoteFingerprint: quote.quoteFingerprint,
                },
            },
            {
                onSuccess: (response) => {
                    toast.success(response.message || "Đã xác nhận bàn giao vé và nhận tiền cọc.");
                    if (response.data) onSuccess?.(response.data);
                    onClose();
                },
                onError: (error: any) => {
                    toast.error(getApiErrorMessage(error, "Xác nhận bàn giao thất bại"));
                    if (isDepositInsufficientError(error)) {
                        void refetchQuote();
                    } else {
                        void refetchQuote();
                    }
                },
            }
        );
    };

    const quoteErrorMessage =
        (quoteError as any)?.response?.data?.message ||
        (quoteError ? "Không tải được báo giá cọc từ hệ thống." : null);

    return (
        <Dialog open={open} onClose={isPending ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>Xác nhận bàn giao & nhận cọc</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Phiếu <strong>{batch?.batchCode || "—"}</strong> ·{" "}
                        {quote?.allocatedQuantity ?? batch?.allocatedQuantity ?? 0} vé
                        {profile
                            ? ` · ${`${profile.lastName || ""} ${profile.firstName || ""}`.trim()}`
                            : ""}
                    </Typography>

                    {(isLoadingQuote || isFetchingQuote) && !quote ? (
                        <Stack alignItems="center" py={3}>
                            <CircularProgress size={28} />
                        </Stack>
                    ) : quoteErrorMessage ? (
                        <Alert
                            severity="error"
                            action={
                                <Button color="inherit" size="small" onClick={() => refetchQuote()}>
                                    Thử lại
                                </Button>
                            }
                        >
                            {quoteErrorMessage}
                        </Alert>
                    ) : (
                        <>
                            <TextField
                                label="Cọc cần thu"
                                value={
                                    requiredAmount == null
                                        ? "—"
                                        : formatCurrency(requiredAmount)
                                }
                                InputProps={{ readOnly: true }}
                                sx={fieldSx}
                                fullWidth
                            />

                            {quote?.effectiveHandoverDeadlineAt ? (
                                <Typography variant="caption" color="text.secondary">
                                    Hạn cuối có thể giao vé: {formatDateTime(quote.effectiveHandoverDeadlineAt)}
                                </Typography>
                            ) : null}
                        </>
                    )}

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
                        disabled={!quote}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isPending}>
                    Đóng
                </Button>
                <Button
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
