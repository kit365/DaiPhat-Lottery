"use client";

import { useEffect, useState } from "react";
import {
    Alert,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
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

const formatVndInput = (digits: string) => {
    if (!digits) return "";
    const amount = Number(digits);
    if (!Number.isFinite(amount)) return "";
    return amount.toLocaleString("vi-VN");
};

const digitsOnly = (value: string) => value.replace(/\D/g, "");

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
        <Dialog
            open={open}
            onClose={isPending ? undefined : onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                className: "admin-theme",
                sx: {
                    borderRadius: "16px",
                    boxShadow: "var(--customShadows-dialog, 0px 24px 48px -8px rgba(0, 0, 0, 0.16))",
                    bgcolor: "#FFFFFF",
                },
            }}
        >
            <DialogTitle
                sx={{
                    m: 0,
                    px: 3,
                    pt: 2.5,
                    pb: 2,
                    fontWeight: 700,
                    fontSize: "1.125rem",
                    borderBottom: "1px solid var(--palette-divider)",
                    bgcolor: "#FFFFFF",
                }}
            >
                Xác nhận bàn giao & nhận cọc
            </DialogTitle>
            <DialogContent sx={{ px: 3, pt: "24px !important", pb: 1, bgcolor: "#FFFFFF" }}>
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Phiếu <strong>{batch?.batchCode || "—"}</strong> ·{" "}
                        {quote?.allocatedQuantity ?? batch?.allocatedQuantity ?? 0} vé
                        {profile
                            ? ` · ${`${profile.lastName || ""} ${profile.firstName || ""}`.trim()}`
                            : ""}
                    </Typography>

                    {quote?.effectiveHandoverDeadlineAt ? (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                            Hạn cuối có thể giao vé trước {formatDateTime(quote.effectiveHandoverDeadlineAt)}
                        </Typography>
                    ) : null}

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
                        </>
                    )}

                    <TextField
                        label="Tiền thực nhận *"
                        value={formatVndInput(depositReceived)}
                        onChange={(e) => setDepositReceived(digitsOnly(e.target.value))}
                        error={insufficient || (depositReceived !== "" && !receivedValid)}
                        helperText={
                            insufficient
                                ? `Tiền cọc thực nhận phải ≥ ${formatCurrency(requiredAmount)}`
                                : "Nhập số tiền cọc thực tế thu được từ đại lý."
                        }
                        inputMode="numeric"
                        sx={fieldSx}
                        fullWidth
                        disabled={!quote}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                        }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions
                sx={{
                    px: 3,
                    py: 2.5,
                    gap: 1.5,
                    borderTop: "1px solid var(--palette-divider)",
                    bgcolor: "#FFFFFF",
                }}
            >
                <Button variant="outlined" color="inherit" onClick={onClose} disabled={isPending} label="Hủy" />
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
