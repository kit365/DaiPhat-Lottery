"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Calendar, Hash } from 'lucide-react';
import dayjs from 'dayjs';
import { useGetMyOrderDetail } from '../../hooks/useOrder';
import { useCancelPayment, useProcessPayment, useSyncPaymentFromGateway } from '../../hooks/useTransaction';
import { PaymentGateway, PaymentResult } from '../../../types/transaction.type';
import { AppToast } from '../../../utils/toast.util';
import { PaymentQrDialog } from '../../components/payment/PaymentQrDialog';

type CheckoutFlow = 'return' | 'cancel';

export const CheckoutResultPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const processPaymentMutation = useProcessPayment();
    const cancelPaymentMutation = useCancelPayment();
    const syncPaymentMutation = useSyncPaymentFromGateway();
    const cancelTriggeredRef = useRef(false);
    const syncTriggeredRef = useRef(false);

    const [resultData] = useState(() => ({
        code: searchParams.get('code'),
        orderCode: searchParams.get('orderCode'),
        internalCode: searchParams.get('internalCode'),
        status: searchParams.get('status'),
        cancel: searchParams.get('cancel'),
        orderId: searchParams.get('orderId'),
        transactionId: searchParams.get('transactionId'),
        gateway: searchParams.get('gateway') as PaymentGateway | null,
        flow: (window.location.pathname.includes('/payment/payos/cancel') ? 'cancel' : 'return') as CheckoutFlow
    }));
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
    const [isPreparingPayment, setIsPreparingPayment] = useState(false);

    const { data: orderDetailData, refetch: refetchOrder } = useGetMyOrderDetail(resultData.orderId || '');
    const order = orderDetailData?.data;

    useEffect(() => {
        if (searchParams.toString() || window.location.pathname !== '/checkout/result') {
            navigate('/checkout/result', { replace: true });
        }
    }, [navigate, searchParams]);

    useEffect(() => {
        const transactionId = resultData.transactionId ? Number(resultData.transactionId) : null;

        if (
            resultData.flow !== 'cancel'
            || cancelTriggeredRef.current
            || !resultData.orderId
            || !transactionId
            || !resultData.gateway
        ) {
            return;
        }

        cancelTriggeredRef.current = true;
        cancelPaymentMutation.mutate({
            orderId: resultData.orderId,
            data: {
                transactionId,
                gateway: resultData.gateway,
                reason: 'Khách hủy thanh toán từ trang PayOS.'
            }
        });
    }, [cancelPaymentMutation, resultData]);

    // Khi PayOS trả về thành công: đồng bộ trạng thái đơn (webhook thường không tới localhost)
    useEffect(() => {
        const isSuccessReturn =
            resultData.flow !== 'cancel'
            && resultData.code === '00'
            && resultData.cancel !== 'true'
            && !!resultData.orderId;

        if (!isSuccessReturn || syncTriggeredRef.current) {
            return;
        }

        syncTriggeredRef.current = true;
        syncPaymentMutation.mutate(resultData.orderId!, {
            onSuccess: () => {
                refetchOrder();
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resultData.orderId, resultData.code, resultData.cancel, resultData.flow]);

    const isCancelFlow = resultData.flow === 'cancel';
    const isSuccess = resultData.code === '00' && resultData.cancel !== 'true' && !isCancelFlow;
    const displayCode = resultData.internalCode || resultData.orderCode || order?.orderCode;

    const canContinuePayment = useMemo(() => {
        if (isSuccess || isCancelFlow || !order) {
            return false;
        }

        return order.status === 'PENDING_PAYMENT'
            && order.transactions?.some(
                (transaction) => transaction.type === 'ONLINE' && transaction.status === 'PENDING'
            );
    }, [isCancelFlow, isSuccess, order]);

    const handleContinuePayment = () => {
        if (!order?.id) {
            AppToast.error('Không tìm thấy thông tin đơn hàng');
            return;
        }

        const pendingTransaction = order.transactions?.find(
            (transaction) => transaction.type === 'ONLINE' && transaction.status === 'PENDING'
        );

        if (!pendingTransaction?.id) {
            AppToast.error('Không còn giao dịch thanh toán khả dụng');
            return;
        }

        setPaymentResult(null);
        setPaymentDialogOpen(true);
        setIsPreparingPayment(true);

        processPaymentMutation.mutate({
            orderId: order.id,
            data: {
                transactionId: pendingTransaction.id,
                gateway: pendingTransaction.gateway || PaymentGateway.PAYOS
            }
        }, {
            onSuccess: (paymentRes) => {
                if (paymentRes.success && paymentRes.data) {
                    setPaymentResult(paymentRes.data);
                    if (!paymentRes.data.qrCode && !paymentRes.data.checkoutUrl) {
                        AppToast.error('Không tạo được mã thanh toán');
                    }
                    return;
                }
                AppToast.error('Không lấy được thông tin thanh toán');
            },
            onError: () => {
                AppToast.error('Không thể tạo phiên thanh toán');
            },
            onSettled: () => {
                setIsPreparingPayment(false);
            }
        });
    };

    const handlePaymentPaid = useCallback(() => {
        AppToast.success('Thanh toán thành công!');
        setPaymentDialogOpen(false);
        setPaymentResult(null);
        setIsPreparingPayment(false);
        if (resultData.orderId) {
            navigate(`/profile/orders/${resultData.orderId}`);
        } else {
            navigate('/profile/orders');
        }
    }, [navigate, resultData.orderId]);

    const handlePaymentExpired = useCallback(() => {
        AppToast.error('Phiên thanh toán đã hết hạn. Đơn hàng đã bị hủy.');
        setPaymentDialogOpen(false);
        setPaymentResult(null);
        setIsPreparingPayment(false);
        if (resultData.orderId) {
            navigate(`/profile/orders/${resultData.orderId}`);
        } else {
            navigate('/profile/orders');
        }
    }, [navigate, resultData.orderId]);

    const handlePaymentDialogClose = useCallback(() => {
        setPaymentDialogOpen(false);
        setPaymentResult(null);
        setIsPreparingPayment(false);
    }, []);

    return (
        <div
            className="client-page min-h-screen flex flex-col bg-fixed bg-cover bg-center"
            style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
        >
            <div className="flex-1 w-full mt-[70px] lg:mt-[80px] py-10 px-4 flex items-center justify-center">
                <div className="bg-white rounded-[24px] shadow-xl max-w-[500px] w-full overflow-hidden border border-[#E5E8EB]">
                    <div className={`h-2 w-full ${isSuccess ? 'bg-[#00A76F]' : 'bg-red-500'}`}></div>

                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <div className="absolute -top-4 -left-4 w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                            <div className="absolute top-8 -right-6 w-3 h-3 rounded-full bg-[#3B82F6] opacity-60"></div>
                            <div className="absolute -bottom-2 -left-8 w-2.5 h-2.5 rounded-full bg-[#10B981] opacity-70"></div>

                            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg border-[3px] ${isSuccess ? 'bg-[#E8F5E9] border-[#E8F5E9] text-[#00A76F] shadow-[#00A76F]/20' : 'bg-red-50 border-red-50 text-red-500 shadow-red-500/20'}`}>
                                {isSuccess ? (
                                    <CheckCircle2 size={56} className="fill-[#00A76F] text-white" />
                                ) : (
                                    <XCircle size={56} className="fill-red-500 text-white" />
                                )}
                            </div>
                        </div>

                        <h1 className={`text-[28px] font-black mb-2 ${isSuccess ? 'text-[#00A76F]' : 'text-red-500'}`}>
                            {isSuccess ? 'Thanh toán thành công!' : (isCancelFlow ? 'Đã hủy thanh toán' : 'Thanh toán chưa hoàn tất')}
                        </h1>
                        <p className="text-[#637381] text-[15px] mb-8">
                            {isSuccess
                                ? 'Cảm ơn bạn đã đặt vé tại Đại Phát.'
                                : isCancelFlow
                                    ? 'Phiên thanh toán đã được hủy theo yêu cầu của bạn.'
                                    : 'Bạn có thể tiếp tục thanh toán nếu đơn hàng vẫn còn hiệu lực.'}
                        </p>

                        {displayCode && (
                            <div className="w-full bg-[#FAFBFC] rounded-2xl p-5 mb-8 border border-[#F4F6F8]">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#E5E8EB]">
                                    <div className="flex items-center gap-3 text-[#212B36] font-medium">
                                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#637381]">
                                            <Hash size={16} />
                                        </div>
                                        <span>Mã đơn hàng</span>
                                    </div>
                                    <span className="font-bold text-[#ee1314]">{displayCode.startsWith('ORD-') ? displayCode : `DP${displayCode}`}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[#212B36] font-medium">
                                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#637381]">
                                            <Calendar size={16} />
                                        </div>
                                        <span>Thời gian truy cập</span>
                                    </div>
                                    <span className="font-bold text-[#212B36]">{dayjs().format('DD/MM/YYYY - HH:mm')}</span>
                                </div>
                            </div>
                        )}

                        <div className="w-full flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/"
                                className="flex-1 py-3.5 rounded-xl border-2 border-[#ee1314] text-[#ee1314] font-bold text-[15px] hover:bg-[#FFF4F4] transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-house"></i> Về trang chủ
                            </Link>

                            {canContinuePayment ? (
                                <button
                                    onClick={handleContinuePayment}
                                    disabled={processPaymentMutation.isPending}
                                    className="flex-1 py-3.5 rounded-xl bg-[#ee1314] text-white font-bold text-[15px] hover:bg-[#d00f10] transition-colors shadow-md shadow-[#ee1314]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    <i className={`fa-solid ${processPaymentMutation.isPending ? 'fa-spinner fa-spin' : 'fa-credit-card'}`}></i>
                                    Tiếp tục thanh toán
                                </button>
                            ) : (
                                <Link
                                    to={resultData.orderId ? `/profile/orders/${resultData.orderId}` : '/profile/orders'}
                                    className="flex-1 py-3.5 rounded-xl bg-[#ee1314] text-white font-bold text-[15px] hover:bg-[#d00f10] transition-colors shadow-md shadow-[#ee1314]/20 flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-file-invoice"></i> Xem đơn của tôi
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <PaymentQrDialog
                open={paymentDialogOpen}
                orderId={resultData.orderId || order?.id || ''}
                orderCode={order?.orderCode || resultData.orderCode || undefined}
                amount={Number(order?.totalAmount) || 0}
                payment={paymentResult}
                loading={isPreparingPayment}
                onPaid={handlePaymentPaid}
                onExpired={handlePaymentExpired}
                onClose={handlePaymentDialogClose}
            />
        </div>
    );
};
