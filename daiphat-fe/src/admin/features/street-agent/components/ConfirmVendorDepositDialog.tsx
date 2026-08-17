"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Alert, Box, CircularProgress, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { toast } from "react-toastify";
import { Button } from "../../../components/ui/Button";
import { AdminDialog } from "../../../components/ui/AdminDialog";
import {
    useConfirmVendorAllocation,
    useVendorConfirmationQuote,
} from "../hooks/useVendorAllocation";
import { StreetAgentProfile, VendorAllocationBatch } from "../types/street-agent.type";
import { AdminLuckyDisplay } from "@/shared/lucky-number";
import { formatCommission, formatCurrency, formatDateTime } from "../utils/format";

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

const breakdownRowSx = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1.2fr) minmax(0, 1fr)" },
    gap: 1,
    alignItems: "baseline",
};

const DepositBreakdownRow = ({
    label,
    value,
    description,
    emphasize = false,
}: {
    label: ReactNode;
    value: ReactNode;
    description?: ReactNode;
    emphasize?: boolean;
}) => (
    <Box>
        <Box sx={breakdownRowSx}>
            <Typography
                variant="body2"
                color={emphasize ? "text.primary" : "text.secondary"}
                sx={{ fontWeight: emphasize ? 700 : 500 }}
            >
                {label}
            </Typography>
            <Typography
                variant="body2"
                textAlign={{ xs: "left", sm: "right" }}
                sx={{ fontWeight: emphasize ? 700 : 600, fontVariantNumeric: "tabular-nums" }}
            >
                {value}
            </Typography>
        </Box>
        {description ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                {description}
            </Typography>
        ) : null}
    </Box>
);

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
        <AdminDialog
            open={open}
            title="Xác nhận bàn giao & nhận cọc"
            maxWidth="md"
            disableClose={isPending}
            onClose={onClose}
            actions={
                <>
                    <Button variant="outlined" color="inherit" onClick={onClose} disabled={isPending} label="Quay lại" />
                    <Button
                        loading={isPending}
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        label="Xác nhận bàn giao"
                        loadingLabel="Đang xác nhận..."
                    />
                </>
            }
        >
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Phiếu <strong>{batch?.batchCode || "—"}</strong> ·{" "}
                        <AdminLuckyDisplay
                            component="span"
                            value={`${quote?.allocatedQuantity ?? batch?.allocatedQuantity ?? 0} vé`}
                            fontWeight={700}
                        />
                        {profile
                            ? ` · ${`${profile.lastName || ""} ${profile.firstName || ""}`.trim()}`
                            : ""}
                    </Typography>

                    {quote?.effectiveHandoverDeadlineAt ? (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                            Hạn cuối có thể giao vé trước{" "}
                            <AdminLuckyDisplay
                                component="span"
                                value={formatDateTime(quote.effectiveHandoverDeadlineAt)}
                                fontWeight={700}
                            />
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
                    ) : quote ? (
                        <>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: "var(--shape-borderRadius)",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "action.hover",
                                }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                                    Cách tính tiền cọc
                                </Typography>
                                <Stack spacing={1.25}>
                                    <DepositBreakdownRow
                                        label="Giá bán cho người bán vé số"
                                        value={
                                            <AdminLuckyDisplay
                                                component="span"
                                                value={`${formatCurrency(quote.vendorUnitPrice)}/vé`}
                                            />
                                        }
                                        description="Giá vendor chốt tại thời điểm xác nhận bàn giao."
                                    />
                                    <DepositBreakdownRow
                                        label="Tỷ lệ tiền cọc"
                                        value={
                                            <AdminLuckyDisplay
                                                component="span"
                                                value={formatCommission(quote.depositRate)}
                                            />
                                        }
                                        description="Phần trăm trên tổng giá trị vé giao trong phiếu này."
                                    />
                                    <DepositBreakdownRow
                                        label="Công thức"
                                        value={
                                            <AdminLuckyDisplay
                                                component="span"
                                                value={`${quote.allocatedQuantity} × ${formatCurrency(quote.vendorUnitPrice)} × ${formatCommission(quote.depositRate)} = ${formatCurrency(quote.depositRequiredAmount)}`}
                                                fontWeight={700}
                                            />
                                        }
                                        description="Số vé × giá vendor × % cọc = cọc cần thu."
                                        emphasize
                                    />
                                </Stack>
                            </Box>

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", mb: 0.75, fontWeight: 500 }}
                                >
                                    Cọc cần thu
                                </Typography>
                                <Box
                                    sx={{
                                        px: 1.75,
                                        py: 1.25,
                                        borderRadius: "var(--shape-borderRadius)",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        bgcolor: "background.paper",
                                    }}
                                >
                                    <AdminLuckyDisplay
                                        value={formatCurrency(requiredAmount)}
                                        fontSize="1rem"
                                        fontWeight={800}
                                    />
                                </Box>
                            </Box>
                        </>
                    ) : null}

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
        </AdminDialog>
    );
};
