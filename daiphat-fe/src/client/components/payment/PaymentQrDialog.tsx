"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { PaymentResult } from '../../../types/transaction.type';
import {
    useGetPendingPaymentCountdown,
    useSyncPaymentFromGateway,
} from '../../hooks/useTransaction';
import { AppToast as toast } from '../../../utils/toast.util';
import {
    isOrderPaymentCancelled,
    isOrderPaymentSuccessful,
} from '../../utils/paymentStatus.util';

interface PaymentQrDialogProps {
    open: boolean;
    orderId: string;
    orderCode?: string;
    amount: number;
    payment: PaymentResult | null;
    loading?: boolean;
    onPaid: () => void;
    onClose: () => void;
    /** Gọi khi phiên QR hết hạn hoặc đơn bị hủy do không thanh toán. */
    onExpired?: () => void;
}

const formatCountdown = (seconds: number) => {
    const safe = Math.max(0, seconds);
    const mm = String(Math.floor(safe / 60)).padStart(2, '0');
    const ss = String(safe % 60).padStart(2, '0');
    return `${mm}:${ss}`;
};

export const PaymentQrDialog: React.FC<PaymentQrDialogProps> = ({
    open,
    orderId,
    orderCode,
    amount,
    payment,
    loading = false,
    onPaid,
    onClose,
    onExpired,
}) => {
    const resolvedRef = useRef(false);
    const syncInFlightRef = useRef(false);
    const [syncing, setSyncing] = useState(false);
    const { mutateAsync: syncPayment } = useSyncPaymentFromGateway();
    const { data: countdownRes } = useGetPendingPaymentCountdown(open ? orderId : undefined);

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
            toast.error('Phiên thanh toán đã hết hạn. Đơn hàng đã bị hủy.');
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

        // Only treat as expired after backend confirms CANCELLED — never from countdown alone
        // (countdown can flip right after PAID / during late PayOS webhook).
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

    // Poll gateway until paid or cancelled. Keep polling after countdown hits 0 so a late
    // successful transfer still resolves to onPaid instead of a stale expiry toast.
    useEffect(() => {
        if (!open || !orderId) return;

        let cancelled = false;

        const poll = async () => {
            if (cancelled || resolvedRef.current || syncInFlightRef.current) return;
            syncInFlightRef.current = true;
            try {
                const res = await syncPayment(orderId);
                if (!cancelled) {
                    resolvePaymentStatus(res?.data?.status);
                }
            } catch {
                // webhook có thể tới trước — bỏ qua lỗi tạm
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
    }, [open, orderId, resolvePaymentStatus, syncPayment]);

    const handleManualSync = useCallback(async () => {
        if (!orderId || resolvedRef.current || syncInFlightRef.current) return;
        setSyncing(true);
        syncInFlightRef.current = true;
        try {
            const res = await syncPayment(orderId);
            const status = res?.data?.status;
            if (isOrderPaymentSuccessful(status) || isOrderPaymentCancelled(status)) {
                resolvePaymentStatus(status);
            } else {
                toast.info(
                    expired
                        ? 'Phiên sắp hết hạn — đang chờ xác nhận thanh toán từ cổng. Thử lại sau vài giây.'
                        : 'Chưa nhận được thanh toán. Vui lòng thử lại sau vài giây.'
                );
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không kiểm tra được trạng thái thanh toán', {
                toastId: 'payment-manual-sync-error',
            });
        } finally {
            syncInFlightRef.current = false;
            setSyncing(false);
        }
    }, [expired, orderId, resolvePaymentStatus, syncPayment]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
            <div
                role="dialog"
                aria-modal="true"
                className="relative z-10 w-full max-w-[440px] bg-white rounded-[20px] shadow-2xl border border-[#E5E8EB] overflow-hidden"
            >
                <div className="px-5 pt-5 pb-3 border-b border-[#F1F3F5]">
                    <h2 className="text-[18px] font-bold text-[#212B36]">Quét mã QR thanh toán</h2>
                    <p className="text-[13px] text-[#637381] mt-1">
                        Mở app ngân hàng để quét mã. Đơn chỉ hoàn tất sau khi thanh toán thành công.
                    </p>
                </div>

                <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
                    <div className="rounded-xl bg-[#F4F6F8] p-3.5 space-y-2">
                        {orderCode && (
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[13px] text-[#637381]">Mã đơn</span>
                                <span className="text-[13px] font-bold text-[#212B36] text-right">{orderCode}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] text-[#637381]">Số tiền</span>
                            <span className="text-[15px] font-bold text-[#ee1314]">
                                {amount.toLocaleString('vi-VN')}đ
                            </span>
                        </div>
                        {remainingSeconds != null && (
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[13px] text-[#637381]">Hết hạn sau</span>
                                <span className={`text-[13px] font-bold ${expired ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>
                                    {expired ? 'Đã hết hạn' : formatCountdown(remainingSeconds)}
                                </span>
                            </div>
                        )}
                        {payment?.accountNumber && (
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-[13px] text-[#637381] shrink-0">STK</span>
                                <span className="text-[13px] font-semibold text-[#212B36] text-right">
                                    {payment.accountNumber}
                                    {payment.accountName ? ` · ${payment.accountName}` : ''}
                                </span>
                            </div>
                        )}
                        {payment?.description && (
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-[13px] text-[#637381] shrink-0">Nội dung</span>
                                <span className="text-[13px] font-semibold text-[#212B36] text-right">
                                    {payment.description}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="min-h-[220px] flex flex-col items-center justify-center gap-3">
                        {loading && !payment ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin text-[28px] text-[#ee1314]" />
                                <p className="text-[13px] text-[#637381]">Đang tạo mã thanh toán...</p>
                            </>
                        ) : qrPayload ? (
                            <div className="p-3 bg-white rounded-2xl border border-[#E5E8EB] shadow-sm">
                                <QRCode value={qrPayload} size={200} fgColor="#212B36" />
                            </div>
                        ) : checkoutUrl ? (
                            <div className="flex flex-col items-center gap-3 text-center px-2">
                                <p className="text-[13px] text-[#637381]">
                                    Không nhận được mã QR nhúng. Bạn có thể mở trang PayOS để thanh toán.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => window.open(checkoutUrl, '_blank', 'noopener,noreferrer')}
                                    className="px-4 py-2.5 rounded-xl bg-[#ee1314] text-white text-[13px] font-bold hover:bg-[#c70f10] transition-colors"
                                >
                                    Mở trang thanh toán PayOS
                                </button>
                            </div>
                        ) : (
                            <p className="text-[13px] text-[#ee1314] text-center">
                                Không tạo được phiên thanh toán. Vui lòng thử lại.
                            </p>
                        )}
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-[#F1F3F5] flex flex-col sm:flex-row gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-[#DFE3E8] text-[13px] font-semibold text-[#637381] hover:bg-[#F4F6F8] transition-colors"
                    >
                        Đóng (đơn chờ thanh toán)
                    </button>
                    <button
                        type="button"
                        onClick={handleManualSync}
                        disabled={syncing || loading || !orderId}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#212B36] text-white text-[13px] font-bold hover:bg-[#161C24] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                        {syncing ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin" />
                                Đang kiểm tra...
                            </>
                        ) : (
                            'Đã thanh toán — kiểm tra lại'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
