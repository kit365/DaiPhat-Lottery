"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import QRCode from 'react-qr-code';
import { PaymentResult } from '../../../../../types/transaction.type';
import {
    useCounterPaymentCountdown,
    useSyncCounterPayment,
} from '../../hooks/useCounterPayment';
import {
    isOrderPaymentCancelled,
    isOrderPaymentSuccessful,
} from '../../../../../client/utils/paymentStatus.util';

interface CounterPaymentQrDialogProps {
    open: boolean;
    orderId: string;
    orderCode?: string;
    amount: number;
    payment: PaymentResult | null;
    loading?: boolean;
    onPaid: () => void;
    onClose: () => void;
    onExpired?: () => void;
}

const formatCountdown = (seconds: number) => {
    const safe = Math.max(0, seconds);
    const mm = String(Math.floor(safe / 60)).padStart(2, '0');
    const ss = String(safe % 60).padStart(2, '0');
    return `${mm}:${ss}`;
};

export const CounterPaymentQrDialog = ({
    open,
    orderId,
    orderCode,
    amount,
    payment,
    loading = false,
    onPaid,
    onClose,
    onExpired,
}: CounterPaymentQrDialogProps) => {
    const resolvedRef = useRef(false);
    const syncInFlightRef = useRef(false);
    const [syncing, setSyncing] = useState(false);
    const { mutateAsync: syncPayment } = useSyncCounterPayment();
    const { data: countdownRes } = useCounterPaymentCountdown(orderId, open && !!orderId);

    const remainingSeconds = countdownRes?.data?.remainingSeconds ?? null;
    const expired = countdownRes?.data?.expired === true;
    const qrPayload = payment?.qrCode?.trim() || '';
    const checkoutUrl = payment?.checkoutUrl?.trim() || '';

    const handleExpired = useCallback(() => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        if (onExpired) {
            onExpired();
        } else {
            onClose();
        }
    }, [onClose, onExpired]);

    const resolvePaymentStatus = useCallback((status?: string | null) => {
        if (resolvedRef.current || !status) return;

        if (isOrderPaymentSuccessful(status)) {
            resolvedRef.current = true;
            onPaid();
            return;
        }

        if (isOrderPaymentCancelled(status)) {
            handleExpired();
        }
    }, [handleExpired, onPaid]);

    useEffect(() => {
        if (!open) {
            resolvedRef.current = false;
            return;
        }
    }, [open]);

    useEffect(() => {
        if (!open || !expired || resolvedRef.current) return;
        handleExpired();
    }, [open, expired, handleExpired]);

    useEffect(() => {
        if (!open || expired) return;

        let cancelled = false;

        const poll = async () => {
            if (cancelled || resolvedRef.current || !orderId || syncInFlightRef.current) return;
            syncInFlightRef.current = true;
            try {
                const res = await syncPayment(orderId);
                if (!cancelled) {
                    resolvePaymentStatus(res?.data?.status);
                }
            } catch {
                // webhook có thể tới trước sync — bỏ qua lỗi tạm thời
            } finally {
                syncInFlightRef.current = false;
            }
        };

        poll();
        const timer = window.setInterval(poll, 3000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [open, expired, orderId, resolvePaymentStatus, syncPayment]);

    const handleManualSync = async () => {
        if (!orderId || resolvedRef.current || expired || syncInFlightRef.current) return;
        setSyncing(true);
        syncInFlightRef.current = true;
        try {
            const res = await syncPayment(orderId);
            const status = res?.data?.status;
            if (isOrderPaymentSuccessful(status) || isOrderPaymentCancelled(status)) {
                resolvePaymentStatus(status);
            }
        } finally {
            syncInFlightRef.current = false;
            setSyncing(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => {}}
            disableEscapeKeyDown
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle sx={{ pb: 1 }}>Quét mã QR thanh toán</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Yêu cầu khách quét mã bằng app ngân hàng. Chỉ hoàn tất đơn sau khi thanh toán thành công.
                </Typography>

                <Box
                    sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 1,
                        bgcolor: 'var(--palette-background-neutral)',
                    }}
                >
                    <Stack spacing={1}>
                        {orderCode && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Mã đơn:</Typography>
                                <Typography variant="subtitle2" fontWeight={700}>{orderCode}</Typography>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Số tiền:</Typography>
                            <Typography variant="subtitle2" color="error.main" fontWeight={700}>
                                {amount.toLocaleString('vi-VN')}đ
                            </Typography>
                        </Box>
                        {remainingSeconds != null && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">Hết hạn sau:</Typography>
                                <Typography
                                    variant="subtitle2"
                                    fontWeight={700}
                                    color={expired ? 'error.main' : 'text.primary'}
                                >
                                    {expired ? 'Đã hết hạn' : formatCountdown(remainingSeconds)}
                                </Typography>
                            </Box>
                        )}
                        {payment?.accountNumber && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">STK:</Typography>
                                <Typography variant="subtitle2" fontWeight={600} textAlign="right">
                                    {payment.accountNumber}
                                    {payment.accountName ? ` · ${payment.accountName}` : ''}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </Box>

                <Box
                    sx={{
                        minHeight: 240,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 2,
                    }}
                >
                    {loading && !payment ? (
                        <>
                            <CircularProgress size={36} />
                            <Typography variant="body2" color="text.secondary">
                                Đang tạo mã thanh toán...
                            </Typography>
                        </>
                    ) : qrPayload ? (
                        <Box
                            sx={{
                                p: 2,
                                bgcolor: '#fff',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <QRCode value={qrPayload} size={200} fgColor="#212B36" />
                        </Box>
                    ) : checkoutUrl ? (
                        <Stack spacing={1.5} alignItems="center">
                            <Typography variant="body2" color="text.secondary" textAlign="center">
                                Không nhận được mã QR nhúng. Mở trang PayOS để khách thanh toán.
                            </Typography>
                            <Button
                                variant="contained"
                                className="btn-primary-admin"
                                onClick={() => window.open(checkoutUrl, '_blank', 'noopener,noreferrer')}
                            >
                                Mở trang thanh toán PayOS
                            </Button>
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="error.main">
                            Không tạo được phiên thanh toán. Thử đóng và chốt lại đơn.
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 1, flexWrap: 'wrap' }}>
                <Button
                    onClick={onClose}
                    color="inherit"
                    variant="outlined"
                    sx={{ borderColor: 'divider' }}
                >
                    Đóng (đơn chờ thanh toán)
                </Button>
                <Button
                    onClick={handleManualSync}
                    variant="contained"
                    className="btn-primary-admin"
                    disabled={syncing || loading || !orderId || expired}
                    startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {syncing ? 'Đang kiểm tra...' : 'Đã thanh toán — kiểm tra lại'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
