"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PaymentQrDialog } from "../payment/PaymentQrDialog";
import { usePendingPaymentReminder } from "../../hooks/usePendingPaymentReminder";
import { useProcessPayment } from "../../hooks/useTransaction";
import { PaymentGateway, PaymentResult } from "../../../types/transaction.type";
import { AppToast } from "../../../utils/toast.util";
import { QUERY_KEYS } from "../../../constants/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const PendingPaymentReminderBanner = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { reminder, displaySeconds, isVisible } = usePendingPaymentReminder();
    const processPaymentMutation = useProcessPayment();

    const [liveSeconds, setLiveSeconds] = useState(0);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
    const [isPreparingPayment, setIsPreparingPayment] = useState(false);

    useEffect(() => {
        setLiveSeconds(displaySeconds);
    }, [displaySeconds]);

    useEffect(() => {
        if (!isVisible || !reminder?.expiresAt) {
            return;
        }

        const tick = () => {
            const msLeft = new Date(reminder.expiresAt!).getTime() - Date.now();
            setLiveSeconds(Math.max(0, Math.ceil(msLeft / 1000)));
        };

        tick();
        const timer = window.setInterval(tick, 1_000);
        return () => window.clearInterval(timer);
    }, [isVisible, reminder?.expiresAt]);

    const handlePaymentPaid = useCallback(() => {
        AppToast.success("Thanh toán thành công!");
        const orderId = reminder?.orderId;
        setPaymentDialogOpen(false);
        setPaymentResult(null);
        setIsPreparingPayment(false);
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_PENDING_PAYMENT_REMINDER] });
        if (orderId) {
            router.push(`/profile/orders/${orderId}`);
        }
    }, [queryClient, reminder?.orderId, router]);

    const handlePaymentExpired = useCallback(() => {
        AppToast.error("Phiên thanh toán đã hết hạn. Đơn hàng đã bị hủy.");
        setPaymentDialogOpen(false);
        setPaymentResult(null);
        setIsPreparingPayment(false);
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_PENDING_PAYMENT_REMINDER] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_ORDERS] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_NOTIFICATIONS] });
    }, [queryClient]);

    const handleContinuePayment = () => {
        if (!reminder?.orderId || !reminder.transactionId) {
            AppToast.error("Không còn giao dịch thanh toán khả dụng");
            return;
        }

        setPaymentDialogOpen(true);
        setPaymentResult(null);
        setIsPreparingPayment(true);

        processPaymentMutation.mutate(
            {
                orderId: reminder.orderId,
                data: {
                    transactionId: reminder.transactionId,
                    gateway: reminder.gateway || PaymentGateway.PAYOS,
                },
            },
            {
                onSuccess: (paymentRes) => {
                    if (paymentRes.success && paymentRes.data) {
                        setPaymentResult(paymentRes.data);
                        if (!paymentRes.data.qrCode && !paymentRes.data.checkoutUrl) {
                            AppToast.error("Không tạo được mã thanh toán");
                        }
                    } else {
                        AppToast.error("Không lấy được thông tin thanh toán");
                    }
                },
                onError: () => {
                    AppToast.error("Không thể tạo phiên thanh toán");
                },
                onSettled: () => {
                    setIsPreparingPayment(false);
                },
            },
        );
    };

    if (!isVisible || !reminder) {
        return null;
    }

    return (
        <>
            <div className="sticky top-0 z-[120] border-b border-[#ffd4d4] bg-[#fff4f4]">
                <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ee1314] text-white">
                            <i className="fa-regular fa-clock text-[14px]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[14px] font-bold text-[#212B36]">
                                Bạn có đơn hàng chờ thanh toán
                            </p>
                            <p className="truncate text-[13px] text-[#637381]">
                                Mã đơn <span className="font-semibold text-[#212B36]">{reminder.orderCode}</span>
                                {" · "}
                                {Number(reminder.totalAmount).toLocaleString("vi-VN")}đ
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <div className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-[#ee1314] shadow-sm">
                            Còn lại {formatCountdown(liveSeconds)}
                        </div>
                        <button
                            type="button"
                            onClick={handleContinuePayment}
                            disabled={processPaymentMutation.isPending}
                            className="rounded-lg bg-[#ee1314] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[#d41112] disabled:opacity-60"
                        >
                            {processPaymentMutation.isPending ? "Đang tạo..." : "Thanh toán ngay"}
                        </button>
                        <Link
                            href={`/profile/orders/${reminder.orderId}`}
                            className="text-[13px] font-semibold text-[#637381] underline-offset-2 hover:text-[#212B36] hover:underline"
                        >
                            Xem chi tiết
                        </Link>
                    </div>
                </div>
            </div>

            <PaymentQrDialog
                open={paymentDialogOpen}
                orderId={reminder.orderId}
                orderCode={reminder.orderCode}
                amount={Number(reminder.totalAmount) || 0}
                payment={paymentResult}
                loading={isPreparingPayment}
                onPaid={handlePaymentPaid}
                onExpired={handlePaymentExpired}
                onClose={() => {
                    setPaymentDialogOpen(false);
                    setPaymentResult(null);
                    setIsPreparingPayment(false);
                }}
            />
        </>
    );
};
