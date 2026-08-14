"use client";

import { useRouter } from "next/navigation";
import { useRouteParams } from "@/hooks/useRouteParams";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PROVINCE_ICON_FALLBACK } from '../../../../constants/clientBannerAssets';
import QRCode from 'react-qr-code';
import { useGetMyOrderDetail } from '../../../../hooks/useOrder';
import { useGetPendingPaymentCountdown, useProcessPayment, useSyncPaymentFromGateway } from '../../../../hooks/useTransaction';
import { useGetMyRefunds } from '../../../../hooks/useRefund';
import { OrderStatus, OrderType } from '../../../../../types/order.type';
import { OrderDetailStatusBadge, OrderStatusBadge } from '@/shared/components/StatusBadge';
import { RefundRequestStatus, RefundType, formatRefundCountdown, isRefundCandidateStatus } from '../../../../../types/refund.type';
import { PaymentGateway, PaymentResult } from '../../../../../types/transaction.type';
import { AppToast } from '../../../../../utils/toast.util';
import {
    UnavailableReferenceState,
    UNAVAILABLE_REFERENCE_MESSAGE,
} from '../../../../components/notification/UnavailableReferenceState';
import { RefundRequestModal } from '../../../../components/refund/RefundRequestModal';
import { PaymentQrDialog } from '../../../../components/payment/PaymentQrDialog';
import { OrderComplaintButton } from '../../../../components/support/OrderComplaintButton';
import { useGetOrderRefundEligibility } from '../../../../hooks/useRefund';
import { useRefundCountdown } from '../../../../hooks/useRefundCountdown';
import { format } from 'date-fns';

const OrderStepper = ({ order }: { order: any }) => {
    const currentStatus = order?.status;

    if (currentStatus === OrderStatus.CANCELLED) {
        return null;
    }

    const isAtStore = order?.receiveType === 'COUNTER_PICKUP' || order?.orderType === OrderType.DIRECT;

    const steps = [
        { key: 'PAYMENT', label: currentStatus === OrderStatus.PENDING_PAYMENT ? 'Chờ thanh toán' : 'Đã thanh toán', icon: currentStatus === OrderStatus.PENDING_PAYMENT ? 'fa-regular fa-clock' : 'fa-solid fa-check-to-slot', date: order?.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy - HH:mm') : '' },
        { key: OrderStatus.PREPARING, label: 'Đang xử lý', icon: 'fa-solid fa-box-open', date: '' },
        { key: OrderStatus.PENDING_PICKUP, label: isAtStore ? 'Chờ nhận vé' : 'Đang giao vé', icon: isAtStore ? 'fa-solid fa-store' : 'fa-solid fa-truck', date: '' },
        { key: OrderStatus.COMPLETED, label: 'Đã hoàn thành', icon: 'fa-solid fa-location-dot', date: order?.actualPickedUpAt ? format(new Date(order.actualPickedUpAt), 'dd/MM/yyyy - HH:mm') : '' }
    ];

    const getStepIndex = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING_PAYMENT: return 0;
            case OrderStatus.PAID: return 0;
            case OrderStatus.PREPARING: return 1;
            case OrderStatus.PENDING_PICKUP: return 2;
            case OrderStatus.COMPLETED: return 3;
            default: return 0;
        }
    };

    const currentIndex = getStepIndex(currentStatus);

    return (
        <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
            <h3 className="text-[16px] font-bold text-[#212B36] mb-8">Trạng thái đơn hàng</h3>
            <div className="flex items-start justify-between relative max-w-4xl mx-auto px-4">
                {/* Background Dashed Line */}
                <div className="absolute top-6 left-[10%] right-[10%] h-[2px] bg-transparent border-t-2 border-dashed border-[#E5E8EB] -translate-y-1/2 z-0"></div>

                {/* Active Dashed Line */}
                <div
                    className="absolute top-6 left-[10%] h-[2px] bg-transparent border-t-2 border-dashed border-[#ee1314] -translate-y-1/2 z-0 transition-all duration-700 ease-in-out"
                    style={{ width: `${(currentIndex / (steps.length - 1)) * 80}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    
                    return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center gap-3 bg-white px-2">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-[18px] transition-all duration-300 ${isCompleted
                                        ? 'bg-[#FFF4F4] text-[#ee1314] shadow-[0_0_0_6px_white]'
                                        : 'bg-[#F4F6F8] text-[#919EAB] shadow-[0_0_0_6px_white]'
                                    }`}
                            >
                                <i className={step.icon}></i>
                            </div>
                            <div className="flex flex-col items-center mt-1">
                                <span className={`text-[13px] font-bold text-center ${isCompleted ? 'text-[#ee1314]' : 'text-[#919EAB]'}`}>
                                    {step.label}
                                </span>
                                {step.date && isCompleted && (
                                    <span className="text-[11px] text-[#919EAB] mt-0.5">{step.date}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const OrderDetailTab = () => {
    const { id } = useRouteParams();
    const router = useRouter();
    const pathname = usePathname() ?? '';
    const searchParamsForLocation = useSearchParams();
    const { data: orderData, isLoading, isError, refetch: refetchOrder } = useGetMyOrderDetail(id || '');
    const { data: refundsData } = useGetMyRefunds({ orderId: id, limit: 100, page: 1 }, !!id);
    const processPaymentMutation = useProcessPayment();
    const syncPaymentMutation = useSyncPaymentFromGateway();
    const syncTriggeredRef = useRef(false);
    const paymentExpiredHandledRef = useRef(false);

    const [showRefundModal, setShowRefundModal] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
    const [isPreparingPayment, setIsPreparingPayment] = useState(false);

    const order = orderData?.data;
    const { data: countdownData } = useGetPendingPaymentCountdown(
        order?.status === OrderStatus.PENDING_PAYMENT ? order.id : undefined
    );
    const isPaymentCountdownExpired = countdownData?.data?.expired === true;
    const orderRefunds = useMemo(() => refundsData?.data?.recordList || [], [refundsData?.data?.recordList]);

    const handlePaymentPaid = useCallback(() => {
        AppToast.success('Thanh toán thành công!');
        setPaymentDialogOpen(false);
        setPaymentResult(null);
        setIsPreparingPayment(false);
        void refetchOrder();
    }, [refetchOrder]);

    const handlePaymentExpired = useCallback(() => {
        AppToast.error('Phiên thanh toán đã hết hạn. Đơn hàng đã bị hủy.');
        setPaymentDialogOpen(false);
        setPaymentResult(null);
        setIsPreparingPayment(false);
        void refetchOrder();
    }, [refetchOrder]);

    const handlePaymentDialogClose = useCallback(() => {
        setPaymentDialogOpen(false);
        setPaymentResult(null);
        setIsPreparingPayment(false);
    }, []);

    // Nếu đã thanh toán trên PayOS nhưng webhook chưa cập nhật → đồng bộ khi mở chi tiết đơn
    useEffect(() => {
        if (
            !order?.id
            || order.status !== OrderStatus.PENDING_PAYMENT
            || syncTriggeredRef.current
        ) {
            return;
        }

        syncTriggeredRef.current = true;
        syncPaymentMutation.mutate(order.id);
    // Chỉ chạy 1 lần khi đơn đang chờ thanh toán
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.id, order?.status]);

    const pendingFullOrderRefund = useMemo(
        () =>
            orderRefunds.find(
                (r) =>
                    r.refundType === RefundType.FULL_ORDER &&
                    (r.status === RefundRequestStatus.READY_TO_PAY ||
                        r.status === RefundRequestStatus.APPROVED ||
                        r.status === RefundRequestStatus.WAITING_FOR_INFO)
            ),
        [orderRefunds]
    );

    const getPendingRefundForDetail = (detailId: number) =>
        orderRefunds.find(
            (r) =>
                (r.refundType === RefundType.ORDER_DETAIL || r.refundType === RefundType.FULL_ORDER) &&
                (r.orderDetailIds?.includes(detailId) || r.orderDetailId === detailId) &&
                (r.status === RefundRequestStatus.READY_TO_PAY ||
                    r.status === RefundRequestStatus.APPROVED ||
                    r.status === RefundRequestStatus.WAITING_FOR_INFO)
        );

    const getRefundForDetail = (detailId: number) =>
        orderRefunds.find(
            (r) =>
                (r.refundType === RefundType.ORDER_DETAIL || r.refundType === RefundType.FULL_ORDER) &&
                (r.orderDetailIds?.includes(detailId) || r.orderDetailId === detailId)
        );

    const isRefundCandidate =
        !!order && isRefundCandidateStatus(order.status) && !pendingFullOrderRefund;
    const { data: eligibilityData, isLoading: isLoadingEligibility } = useGetOrderRefundEligibility(
        order?.id || '',
        isRefundCandidate
    );
    const eligibility = eligibilityData?.data;
    const refundEligible = eligibility?.eligible === true;
    const refundIneligibleReason = eligibility?.reason;
    const refundRemainingSeconds =
        eligibility?.remainingSeconds ?? order?.refundRemainingSeconds ?? 0;
    const { secondsLeft: refundSecondsLeft, isLowTime: isRefundLowTime, isExpired: isRefundExpired } =
        useRefundCountdown({
            refundDeadlineAt: eligibility?.refundDeadlineAt,
            paymentSuccessAt:
                eligibility?.paymentSuccessAt ?? order?.refundPaymentSuccessAt,
            graceMinutes: eligibility?.graceMinutes ?? order?.refundGraceMinutes,
            remainingSeconds: refundRemainingSeconds,
            enabled: isRefundCandidate && !isLoadingEligibility
        });
    const showRefundAction =
        isRefundCandidate && !isLoadingEligibility && refundEligible && !isRefundExpired;
    const showRefundUnavailable =
        isRefundCandidate &&
        !isLoadingEligibility &&
        (!refundEligible || isRefundExpired) &&
        !pendingFullOrderRefund;

    const openRefundModal = () => {
        setShowRefundModal(true);
    };

    const remainingCountdownSeconds = Math.max(0, countdownData?.data?.remainingSeconds ?? 0);
    const timeLeft = {
        minutes: Math.floor(remainingCountdownSeconds / 60),
        seconds: remainingCountdownSeconds % 60,
    };

    // Countdown hết hạn: chỉ báo lỗi sau khi backend đã CANCELLED (không toast khi vừa PAID).
    useEffect(() => {
        if (!order?.id || order.status !== OrderStatus.PENDING_PAYMENT || !isPaymentCountdownExpired) {
            if (order?.status !== OrderStatus.PENDING_PAYMENT) {
                paymentExpiredHandledRef.current = false;
            }
            return;
        }

        const timer = window.setInterval(() => {
            void refetchOrder();
        }, 3000);

        return () => window.clearInterval(timer);
    }, [order?.id, order?.status, isPaymentCountdownExpired, refetchOrder]);

    useEffect(() => {
        if (!order?.id || order.status !== OrderStatus.CANCELLED || !isPaymentCountdownExpired) {
            return;
        }
        if (paymentExpiredHandledRef.current) {
            return;
        }
        paymentExpiredHandledRef.current = true;
        handlePaymentExpired();
    }, [order?.id, order?.status, isPaymentCountdownExpired, handlePaymentExpired]);

    useEffect(() => {
        if (searchParamsForLocation?.get("openRefund") !== "true" || !order || !isRefundCandidateStatus(order.status) || isLoadingEligibility) {
            return;
        }

        if (refundEligible) {
            setShowRefundModal(true);
        } else if (refundIneligibleReason) {
            AppToast.error(refundIneligibleReason);
        }

        router.replace(pathname);
    }, [searchParamsForLocation, pathname, order, router, isLoadingEligibility, refundEligible, refundIneligibleReason]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-[#ee1314]"></i>
                    <p className="text-[#637381] font-medium text-[14px]">Đang tải chi tiết đơn hàng...</p>
                </div>
            </div>
        );
    }

    if (isError || !order) {
        return (
            <UnavailableReferenceState
                title="Thông báo không còn hiệu lực"
                message={orderData?.message || UNAVAILABLE_REFERENCE_MESSAGE}
                primaryTo="/profile/notifications"
                primaryLabel="Về danh sách thông báo"
                secondaryTo="/profile/orders"
                secondaryLabel="Xem đơn hàng của tôi"
            />
        );
    }

    const isPendingPayment = order.status === OrderStatus.PENDING_PAYMENT;
    /** Chỉ hiện đếm ngược + nút thanh toán khi còn thời gian */
    const showPendingPaymentUi = isPendingPayment && !isPaymentCountdownExpired;
    /** Countdown đã hết nhưng backend chưa kịp hủy → hiển thị như đã huỷ */
    const displayStatus =
        isPendingPayment && isPaymentCountdownExpired ? OrderStatus.CANCELLED : order.status;
    const isPaidOrCompleted = [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.PENDING_PICKUP, OrderStatus.COMPLETED].includes(order.status);

    const handleCopyOrderCode = () => {
        if (order.orderCode) {
            navigator.clipboard.writeText(order.orderCode);
            AppToast.success("Đã sao chép mã đơn hàng!");
        }
    };

    const handlePaymentRedirect = () => {
        if (isPaymentCountdownExpired || remainingCountdownSeconds <= 0) {
            AppToast.error('Phiên thanh toán đã hết hạn. Đơn hàng đã bị hủy.');
            void refetchOrder();
            return;
        }

        const pendingTransaction = order.transactions?.find(
            (tx: any) => tx.type === 'ONLINE' && tx.status === 'PENDING'
        ) || order.transactions?.find((tx: any) => tx.type === 'ONLINE') || order.transactions?.[0];

        const transactionId = pendingTransaction?.id;
        if (!transactionId) {
            AppToast.error("Không tìm thấy thông tin giao dịch");
            return;
        }

        setPaymentResult(null);
        setPaymentDialogOpen(true);
        setIsPreparingPayment(true);

        processPaymentMutation.mutate({
            orderId: order.id,
            data: {
                transactionId,
                gateway: PaymentGateway.PAYOS
            }
        }, {
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
            onSettled: () => {
                setIsPreparingPayment(false);
            }
        });
    };

    return (
        <div className={`flex flex-col gap-6 relative ${showPendingPaymentUi ? 'pb-24 md:pb-6' : 'pb-6'}`}>
            {/* Header Title (with back button) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-[14px] font-medium text-[#637381]">
                    <Link href="/" className="hover:text-[#212B36] transition-colors">Trang chủ</Link>
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    <Link href="/profile/orders" className="hover:text-[#212B36] transition-colors">Đơn hàng của tôi</Link>
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    <span className="text-[#212B36] font-bold">Chi tiết đơn hàng</span>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                    <h1 className="client-heading m-0">Chi tiết đơn hàng</h1>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    {!showPendingPaymentUi && (
                        <OrderComplaintButton
                            orderId={order.id}
                            variant="outline"
                            showHelperText={false}
                        />
                    )}
                    <button
                        onClick={() => router.push('/profile/orders')}
                        className="px-5 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold text-[#454F5B] hover:bg-[#F9FAFB] transition-colors shadow-sm cursor-pointer flex items-center gap-2 w-max"
                    >
                        <i className="fa-solid fa-arrow-left"></i> Quay lại
                    </button>
                </div>
            </div>

            {/* Pending Payment Card — chỉ hiện khi còn thời gian thanh toán */}
            {showPendingPaymentUi && (
                <div className="bg-[#FFF9F3] rounded-[20px] p-6 lg:p-8 border border-[#FFB020]/30 shadow-[0_4px_20px_rgba(255,176,32,0.06)] flex flex-col md:flex-row items-stretch gap-6 lg:gap-8 relative overflow-hidden mb-6">
                    <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-br from-[#FFF9F3] to-transparent rounded-bl-full -z-10"></div>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="bg-[#FFB020] text-white w-6 h-6 rounded-full flex items-center justify-center text-[14px] font-bold shadow-sm">!</div>
                            <h4 className="text-[18px] font-bold text-[#FFB020]">Bạn cần làm gì tiếp theo?</h4>
                        </div>
                        <ul className="text-[14px] text-[#454F5B] space-y-3 mt-4 font-medium leading-relaxed">
                            <li className="flex items-start gap-2.5">
                                <span className="text-[#FFB020] mt-1.5 text-[6px]"><i className="fa-solid fa-circle"></i></span>
                                <span>Bấm nút <strong>&quot;Tiếp tục thanh toán&quot;</strong> ở góc phải hoặc ở phần thanh toán bên dưới để thực hiện chuyển khoản.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="text-[#FFB020] mt-1.5 text-[6px]"><i className="fa-solid fa-circle"></i></span>
                                <span>Hệ thống sử dụng cổng tự động của <strong>PayOS</strong>, giao dịch sẽ được xác nhận tự động sau vài giây.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <span className="text-[#FFB020] mt-1.5 text-[6px]"><i className="fa-solid fa-circle"></i></span>
                                <span>Vui lòng hoàn tất giao dịch trước khi đếm ngược kết thúc để tránh việc hệ thống tự động huỷ vé.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col items-center justify-center min-w-[300px] bg-white rounded-2xl p-6 border border-[#E5E8EB] shadow-sm gap-5">
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-[12px] font-bold text-[#637381] uppercase tracking-wider">Thời gian thanh toán còn lại</span>
                            <div className="flex items-center gap-2.5 bg-[#FFF4F4] px-6 py-2.5 rounded-xl border border-[#FFEBEE]">
                                <i className="fa-solid fa-clock text-[#ee1314] animate-pulse text-[16px]"></i>
                                <span className="text-[24px] font-bold text-[#ee1314] font-mono leading-none tracking-wider">
                                    {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handlePaymentRedirect}
                            disabled={processPaymentMutation.isPending}
                            className="w-full bg-[#ee1314] text-white py-3.5 rounded-xl font-bold text-[15px] hover:bg-[#c80f11] transition-all shadow-[0_4px_12px_rgba(238,19,20,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {processPaymentMutation.isPending ? <i className="fa-solid fa-spinner fa-spin animate-spin"></i> : <i className="fa-solid fa-credit-card"></i>}
                            Tiếp tục thanh toán
                        </button>
                    </div>
                </div>
            )}

            {/* Stepper trạng thái đơn hàng */}
            {order.orderType !== 'DIRECT' && displayStatus !== OrderStatus.CANCELLED && (
                <div className="mt-6">
                    <OrderStepper order={{ ...order, status: displayStatus }} />
                </div>
            )}

            {/* Đơn hàng + thanh toán + vé — cùng 1 khung */}
            <div className={`grid grid-cols-1 ${order.orderType !== 'DIRECT' && order.status === OrderStatus.PENDING_PICKUP ? 'lg:grid-cols-2' : ''} gap-6 mb-6 mt-6`}>
                <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] h-full flex flex-col">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-6 mb-6 border-b border-[#F4F6F8]">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] font-medium text-[#637381]">Mã đơn hàng</span>
                            <div className="flex items-center gap-2 min-h-[26px]">
                                <span className="text-[14px] font-medium text-[#212B36] break-all">{order.orderCode}</span>
                                <button
                                    onClick={handleCopyOrderCode}
                                    className="text-[#919EAB] hover:text-[#ee1314] transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                    title="Sao chép mã đơn"
                                >
                                    <i className="fa-regular fa-copy text-[14px]"></i>
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] font-medium text-[#637381]">Ngày đặt</span>
                            <span className="text-[14px] font-medium text-[#212B36] min-h-[26px] flex items-center">
                                {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy - HH:mm') : '-'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] font-medium text-[#637381]">Loại đơn</span>
                            <span className="text-[14px] font-medium text-[#212B36] min-h-[26px] flex items-center">
                                {order.orderType === 'ONLINE' ? 'Mua online' : 'Mua trực tiếp'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5 sm:items-end">
                            <span className="text-[13px] font-medium text-[#637381]">Trạng thái</span>
                            <div className="flex items-center min-h-[26px]">
                                <OrderStatusBadge status={displayStatus} />
                            </div>
                        </div>
                    </div>

                    <h3 className="text-[16px] font-bold text-[#212B36] mb-6">Thông tin thanh toán</h3>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Kỳ mở thưởng</span>
                            <span className="text-[14px] font-medium text-[#212B36]">
                                {order.orderDetails?.[0]?.drawDate ? format(new Date(order.orderDetails[0].drawDate), 'dd/MM/yyyy') : (order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy') : '-')}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Số lượng vé</span>
                            <span className="text-[14px] font-medium text-[#212B36]">{order.orderDetails?.length || 0} vé</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pb-6 border-b border-dashed border-[#E5E8EB] mb-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Phương thức thanh toán</span>
                            <span className="text-[14px] font-medium text-[#212B36]">
                                {(() => {
                                    if (!order.transactions || order.transactions.length === 0) {
                                        return order.orderType === 'DIRECT' ? 'Thanh toán tiền mặt' : 'Thanh toán online';
                                    }
                                    const types = new Set(order.transactions.map((t: any) => t.type));
                                    if (types.has('OFFLINE') && types.has('ONLINE')) {
                                        return 'Tiền mặt & Online';
                                    }
                                    return types.has('OFFLINE') ? 'Thanh toán tiền mặt' : 'Thanh toán online';
                                })()}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Ngày thanh toán</span>
                            <span className="text-[14px] font-medium text-[#212B36]">
                                {(displayStatus !== OrderStatus.PENDING_PAYMENT && displayStatus !== OrderStatus.CANCELLED)
                                    ? ((order.transactions?.[0] as any)?.createdAt ? format(new Date((order.transactions[0] as any).createdAt), 'dd/MM/yyyy - HH:mm') : (order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy - HH:mm') : '-'))
                                    : '-'}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pb-6 mb-6 border-b border-[#F4F6F8]">
                        <span className="text-[14px] font-bold text-[#212B36]">Tổng thanh toán</span>
                        <span className="text-[24px] font-bold text-[#ee1314]">{(order.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[15px] font-bold text-[#212B36]">Vé đã mua</h4>
                        <span className="text-[13px] font-bold text-[#637381]">{order.orderDetails?.length || 0} vé</span>
                    </div>

                    <div className="flex flex-col gap-3">
                        {order.orderDetails && order.orderDetails.length > 0 ? (
                            order.orderDetails.map((detail: any, index: number) => {
                                const stationName = detail.stationName || detail.lotteryTicket?.station?.name || 'Chưa rõ đài';
                                const drawDate = detail.drawDate
                                    ? format(new Date(detail.drawDate), 'dd/MM/yyyy')
                                    : detail.lotteryTicket?.drawDate
                                        ? format(new Date(detail.lotteryTicket.drawDate), 'dd/MM/yyyy')
                                        : (order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy') : '-');
                                const numbers = detail.numbers || detail.lotteryTicket?.numbers || '---';
                                const price = detail.price || 10000;
                                const quantity = detail.quantity || 1;
                                const pendingDetailRefund = detail.id ? getPendingRefundForDetail(detail.id) : undefined;
                                const detailRefund = detail.id ? getRefundForDetail(detail.id) : undefined;
                                const stationId =
                                    detail.lotteryTicket?.station?.id ??
                                    detail.lotteryTicket?.stationId ??
                                    detail.stationId;
                                const drawDateRaw = detail.drawDate || detail.lotteryTicket?.drawDate;
                                const resultLookupUrl = (() => {
                                    const params = new URLSearchParams();
                                    if (drawDateRaw) params.set('drawDate', String(drawDateRaw).slice(0, 10));
                                    if (stationId != null) params.set('stationId', String(stationId));
                                    const digits = String(numbers).replace(/\D/g, '');
                                    if (digits) params.set('search', digits);
                                    const query = params.toString();
                                    return query ? `/?${query}` : '/';
                                })();

                                return (
                                    <div
                                        key={index}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#E5E8EB] bg-[#F9FAFB]"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                                            <span className="font-bold text-[16px] text-[#212B36] tracking-tight shrink-0 tabular-nums">
                                                {numbers}
                                            </span>
                                            <div className="flex flex-col min-w-0 sm:border-l sm:border-[#E5E8EB] sm:pl-4">
                                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                                    <img src={detail.lotteryTicket?.station?.logoUrl || PROVINCE_ICON_FALLBACK} alt="" className="w-5 h-5 rounded-full border border-gray-200 shrink-0" />
                                                    <span className="font-bold text-[14px] text-[#212B36] truncate">{stationName}</span>
                                                    {detail.status ? (
                                                        <OrderDetailStatusBadge status={detail.status} />
                                                    ) : null}
                                                </div>
                                                <span className="text-[13px] text-[#637381] pl-7">
                                                    {drawDate} • 16:15
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end shrink-0">
                                            <span className="text-[14px] font-bold text-[#212B36] whitespace-nowrap tabular-nums">
                                                {quantity} x {price.toLocaleString('vi-VN')}đ
                                            </span>
                                            {isPaidOrCompleted && (
                                                <Link
                                                    href={resultLookupUrl}
                                                    className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border border-[#FFCDD2] bg-white text-[#ee1314] text-[12px] font-bold no-underline hover:bg-[#FFF4F4] transition-colors whitespace-nowrap"
                                                >
                                                    <i className="fa-solid fa-magnifying-glass text-[11px]"></i>
                                                    Tra kết quả
                                                </Link>
                                            )}
                                            {(pendingDetailRefund || (detail.status === 'REFUND_PENDING' && detailRefund)) && (
                                                <Link
                                                    href={`/profile/refunds/${(pendingDetailRefund || detailRefund)?.id}`}
                                                    className="text-[#FFB020] text-[12px] font-bold hover:underline whitespace-nowrap"
                                                >
                                                    Xem yêu cầu hủy
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="py-4 text-center text-[14px] text-[#637381]">Không có dữ liệu vé</p>
                        )}
                    </div>
                </div>

                {/* Right Column: 1 Box */}
                {(order.orderType as string) !== 'DIRECT' && order.status === OrderStatus.PENDING_PICKUP && (
                    <div className="flex flex-col gap-6">
                        {/* Thông tin nhận vé */}
                        <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col h-full">
                            <h3 className="text-[16px] font-bold text-[#212B36] mb-6">Thông tin nhận vé</h3>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-[14px]">
                                    <i className="fa-solid fa-store"></i>
                                </div>
                                <span className="text-[15px] font-bold text-[#212B36]">Nhận vé tại quầy</span>
                            </div>
                            <p className="text-[13px] text-[#637381] mb-6">
                                {(order.orderType as string) === 'DIRECT'
                                    ? 'Quý khách vui lòng mang theo mã đơn hàng và CMND/CCCD để nhận vé.'
                                    : 'Quý khách vui lòng mang theo mã QR này hoặc mã đơn hàng và CMND/CCCD để nhận vé.'}
                            </p>
                            
                            {(order.orderType as string) !== 'DIRECT' && (
                                <div className="flex flex-col items-center justify-center mb-6 flex-1">
                                    <div className="p-4 bg-white border border-[#E5E8EB] rounded-2xl shadow-sm inline-block">
                                        <QRCode value={order.orderCode} size={140} fgColor="#212B36" />
                                    </div>
                                    <span className="text-[12px] text-[#637381] mt-3">Quét mã QR để nhận vé tại quầy</span>
                                </div>
                            )}
                            <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E8EB]">
                                <span className="text-[12px] text-[#637381] block mb-1">Địa chỉ nhận vé</span>
                                <span className="text-[14px] text-[#212B36] font-medium leading-relaxed">
                                    123 Đường Lý Chính Thắng, Phường 7, Quận 3, TP. Hồ Chí Minh
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Secondary: Cancel order & refund (below payment info) */}
            {isRefundCandidate && isLoadingEligibility && (
                <div className="rounded-2xl px-5 py-4 border border-[#E5E8EB] bg-[#F9FAFB] flex items-center gap-3 mb-6">
                    <i className="fa-solid fa-spinner fa-spin text-[#919EAB] text-[13px]"></i>
                    <p className="text-[13px] text-[#637381]">Đang kiểm tra điều kiện hủy đơn...</p>
                </div>
            )}

            {showRefundAction && (
                <div
                    className={`rounded-2xl px-5 py-4 border mb-6 flex flex-col gap-4 ${
                        isRefundLowTime
                            ? 'bg-[#FFF9F3] border-[#FFB020]/25'
                            : 'bg-[#F8FAFC] border-[#E5E8EB]'
                    }`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isRefundLowTime
                                        ? 'bg-[#FFF4E5] text-[#B76E00]'
                                        : 'bg-white border border-[#E5E8EB] text-[#919EAB]'
                                }`}
                            >
                                <i className="fa-solid fa-rotate-left text-[13px]"></i>
                            </div>
                            <div className="min-w-0 pt-0.5">
                                <p className="text-[14px] font-semibold text-[#212B36] leading-tight">
                                    Hủy đơn & hoàn tiền
                                </p>
                                <p className="text-[12px] text-[#637381] mt-1 leading-relaxed">
                                    Bạn có thể yêu cầu hoàn tiền trong{' '}
                                    {eligibility?.graceMinutes ?? order.refundGraceMinutes ?? 30} phút
                                    kể từ khi thanh toán.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-center pl-0 sm:pl-2">
                            <button
                                onClick={() => openRefundModal()}
                                className="h-9 px-4 rounded-xl bg-[#ee1314] text-white text-[13px] font-semibold hover:bg-[#c80f11] transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shadow-sm shadow-[#ee1314]/15"
                            >
                                <i className="fa-solid fa-rotate-left text-[11px]"></i>
                                Yêu cầu hoàn tiền
                            </button>
                            <div
                                className={`h-9 px-3 rounded-xl border flex flex-col items-center justify-center tabular-nums min-w-[7.25rem] ${
                                    isRefundLowTime
                                        ? 'bg-[#FFF9F3] border-[#FFB020]/40'
                                        : 'bg-[#F0F5FF] border-[#2065D1]/20'
                                }`}
                                title={
                                    isRefundLowTime
                                        ? 'Sắp hết thời gian yêu cầu hoàn tiền'
                                        : 'Thời gian còn lại để yêu cầu hoàn tiền'
                                }
                            >
                                <p
                                    className={`text-[9px] font-medium leading-none tracking-wide uppercase ${
                                        isRefundLowTime ? 'text-[#B76E00]' : 'text-[#637381]'
                                    }`}
                                >
                                    {isRefundLowTime ? 'Sắp hết hạn' : 'Còn lại'}
                                </p>
                                <p
                                    className={`text-[12px] font-bold leading-none mt-1 ${
                                        isRefundLowTime ? 'text-[#B76E00]' : 'text-[#2065D1]'
                                    }`}
                                >
                                    {formatRefundCountdown(refundSecondsLeft)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-[12px] text-[#637381] border-t border-[#E5E8EB] pt-3">
                        <p>
                            Số yêu cầu hôm nay:{' '}
                            <span className="font-semibold text-[#212B36] tabular-nums">
                                {eligibility?.refundRequestsSubmittedToday ?? 0}/
                                {eligibility?.maxRefundRequestsPerDay ?? '—'}
                            </span>
                        </p>
                    </div>
                </div>
            )}

            {showRefundUnavailable && (
                <div className="rounded-2xl px-5 py-4 border border-[#E5E8EB] bg-[#F9FAFB] flex flex-col gap-3 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E8EB] text-[#919EAB] flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-circle-info text-[13px]"></i>
                            </div>
                            <div className="min-w-0 pt-0.5">
                                <p className="text-[14px] font-semibold text-[#212B36] leading-tight">
                                    Hủy đơn & hoàn tiền
                                </p>
                                <div className="mt-1.5 flex flex-col gap-1 text-[12px] text-[#637381]">
                                    <p>
                                        Số yêu cầu hôm nay:{' '}
                                        <span className="font-semibold text-[#212B36] tabular-nums">
                                            {eligibility?.refundRequestsSubmittedToday ?? 0}/
                                            {eligibility?.maxRefundRequestsPerDay ?? '—'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled
                            className="h-9 px-4 rounded-xl bg-[#C4CDD5] text-white text-[13px] font-semibold cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-center opacity-80"
                        >
                            <i className="fa-solid fa-rotate-left text-[11px]"></i>
                            Yêu cầu hoàn tiền
                        </button>
                    </div>
                    {(refundIneligibleReason || isRefundExpired) && (
                        <p className="text-[13px] text-[#637381] leading-relaxed border-t border-[#E5E8EB] pt-3">
                            {isRefundExpired && refundEligible
                                ? 'Đã hết thời gian yêu cầu hoàn tiền cho đơn hàng này.'
                                : refundIneligibleReason}
                        </p>
                    )}
                </div>
            )}

            {pendingFullOrderRefund && (
                <div className="rounded-2xl px-5 py-4 border border-[#FFB020]/25 bg-[#FFF9F3] flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#FFF4E5] text-[#B76E00] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-clock text-[13px]"></i>
                        </div>
                        <div className="min-w-0 pt-0.5">
                            <p className="text-[14px] font-semibold text-[#212B36] leading-tight">
                                {pendingFullOrderRefund.status === RefundRequestStatus.READY_TO_PAY
                                    ? 'Đang chờ chuyển khoản'
                                    : 'Yêu cầu đang chờ duyệt'}
                            </p>
                            <p className="text-[12px] text-[#637381] mt-1 leading-relaxed">
                                {pendingFullOrderRefund.status === RefundRequestStatus.READY_TO_PAY
                                    ? 'Yêu cầu hoàn tiền đã được duyệt và đang chờ chuyển khoản.'
                                    : 'Yêu cầu hủy đơn & hoàn tiền của bạn đang được xử lý.'}
                            </p>
                        </div>
                    </div>
                    <Link
                        href={`/profile/refunds/${pendingFullOrderRefund.id}`}
                        className="h-9 px-4 rounded-xl border border-[#DFE3E8] bg-white text-[#454F5B] text-[13px] font-semibold hover:border-[#C4CDD5] hover:bg-[#F4F6F8] hover:text-[#212B36] transition-colors whitespace-nowrap self-start sm:self-center flex items-center justify-center shadow-[0_1px_2px_rgb(0,0,0,0.04)]"
                    >
                        Xem chi tiết
                    </Link>
                </div>
            )}

            
            {/* Mobile Sticky Bottom Bar */}
            {showPendingPaymentUi && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E8EB] p-4 flex items-center justify-between z-50 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[#637381] font-bold uppercase tracking-wider">Hết hạn sau</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <i className="fa-solid fa-clock text-[#ee1314] text-[12px] animate-pulse"></i>
                            <span className="text-[16px] font-bold text-[#ee1314] font-mono">
                                {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handlePaymentRedirect}
                        disabled={processPaymentMutation.isPending}
                        className="bg-[#ee1314] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#c80f11] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-[#ee1314]/20 active:translate-y-0"
                    >
                        {processPaymentMutation.isPending ? (
                            <i className="fa-solid fa-spinner fa-spin animate-spin"></i>
                        ) : (
                            <i className="fa-solid fa-credit-card"></i>
                        )}
                        Tiếp tục thanh toán
                    </button>
                </div>
            )}

            {/* Footer Notes & Guarantees for Pending Payment */}
            {showPendingPaymentUi && (
                <>
                    <div className="text-center py-4 flex items-center justify-center gap-2 text-[13px] text-[#637381] font-semibold">
                        <i className="fa-regular fa-circle-check text-[#ee1314]"></i>
                        Đơn hàng sẽ được giữ trong thời gian thanh toán còn lại. Vui lòng thanh toán để xác nhận giữ vé chính thức.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 border-t border-[#E5E8EB] pt-8 mb-8">
                        <div className="flex flex-col items-center text-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-[#E4F8ED] text-[#1CD162] flex items-center justify-center text-[20px] mb-1">
                                <i className="fa-solid fa-shield-halved"></i>
                            </div>
                            <h4 className="text-[14px] font-bold text-[#212B36]">Bảo mật thông tin</h4>
                            <p className="text-[12px] text-[#637381]">Cam kết bảo mật tuyệt đối</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 md:border-l md:border-r border-[#E5E8EB]">
                            <div className="w-12 h-12 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-[20px] mb-1">
                                <i className="fa-solid fa-headset"></i>
                            </div>
                            <h4 className="text-[14px] font-bold text-[#212B36]">Hỗ trợ 24/7</h4>
                            <p className="text-[12px] text-[#637381]">1900 636 555</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-[20px] mb-1">
                                <i className="fa-solid fa-user-shield"></i>
                            </div>
                            <h4 className="text-[14px] font-bold text-[#212B36]">Giao dịch an toàn</h4>
                            <p className="text-[12px] text-[#637381]">Được bảo vệ bởi hệ thống</p>
                        </div>
                    </div>
                </>
            )}

            {order && (
                <RefundRequestModal
                    isOpen={showRefundModal}
                    onClose={() => setShowRefundModal(false)}
                    order={order}
                />
            )}

            {order && (
                <PaymentQrDialog
                    open={paymentDialogOpen}
                    orderId={order.id}
                    orderCode={order.orderCode}
                    amount={Number(order.totalAmount) || 0}
                    payment={paymentResult}
                    loading={isPreparingPayment}
                    onPaid={handlePaymentPaid}
                    onExpired={handlePaymentExpired}
                    onClose={handlePaymentDialogClose}
                />
            )}
        </div>
    );
};
