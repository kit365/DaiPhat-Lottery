import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useGetMyOrderDetail } from '../../../hooks/useOrder';
import { useProcessPayment } from '../../../hooks/useTransaction';
import { useGetMyRefunds } from '../../../hooks/useRefund';
import { OrderStatus, OrderType, OrderReceiveType, OrderDetailStatus } from '../../../../types/order.type';
import { RefundRequestStatus, RefundType } from '../../../../types/refund.type';
import { PaymentGateway } from '../../../../types/transaction.type';
import { AppToast } from '../../../utils/toast.util';
import { RefundRequestModal } from '../../../components/refund/RefundRequestModal';
import { isOrderPreparing } from '../../../utils/order.util';
import { format } from 'date-fns';

const ORDER_STATUS_MAP: Record<OrderStatus, { label: string, bg: string, text: string }> = {
    [OrderStatus.PENDING_PAYMENT]: { label: 'Chờ thanh toán', bg: 'bg-[#FFF9F3]', text: 'text-[#FFB020]' },
    [OrderStatus.PAID]: { label: 'Đã thanh toán', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [OrderStatus.PREPARING]: { label: 'Đang chuẩn bị vé', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
    [OrderStatus.PENDING_PICKUP]: { label: 'Chờ nhận vé', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
    [OrderStatus.COMPLETED]: { label: 'Đã hoàn thành', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [OrderStatus.CANCELLED]: { label: 'Đã huỷ', bg: 'bg-[#FFF4F4]', text: 'text-[#ee1314]' }
};

const ORDER_TYPE_MAP: Record<OrderType, { label: string, bg: string, text: string }> = {
    [OrderType.ONLINE]: { label: 'Online', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
    [OrderType.DIRECT]: { label: 'Tại quầy', bg: 'bg-[#FFF9F3]', text: 'text-[#FFB020]' }
};

// Deterministic mock functions for lottery tickets
const getMockTicketNumber = (serialId: number) => {
    const numbers = ["584560", "283749", "102948", "674829", "893041", "456123", "309485", "716253", "524310", "981276"];
    return numbers[serialId % numbers.length];
};

const getMockStation = (serialId: number) => {
    const stations = ["TP. Hồ Chí Minh", "Đồng Nai", "Cần Thơ", "Tây Ninh", "Sóc Trăng", "Vĩnh Long", "Bình Dương", "Long An"];
    return stations[serialId % stations.length];
};

const getMockTicketType = (serialId: number) => {
    const types = [
        "Vé truyền thống (Vé thường)",
        "Cặp nguyên thưởng (Vé lô)",
        "Vé truyền thống (Vé thường)",
        "Vé VIP Đặc Biệt",
        "Vé truyền thống (Vé thường)"
    ];
    return types[serialId % types.length];
};

const OrderStepper = ({ currentStatus }: { currentStatus: OrderStatus }) => {
    if (currentStatus === OrderStatus.CANCELLED) {
        return (
            <div className="bg-[#FFF4F4] rounded-[20px] p-6 lg:p-8 border border-[#FFEBEE] flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="w-14 h-14 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                    <i className="fa-solid fa-xmark"></i>
                </div>
                <div>
                    <h3 className="text-[#ee1314] font-bold text-[18px]">Đơn hàng đã bị huỷ</h3>
                    <p className="text-[#637381] text-[14px] mt-1.5 font-medium">Đơn hàng này đã bị huỷ và không thể tiếp tục thực hiện giao dịch.</p>
                </div>
            </div>
        );
    }

    const steps = [
        { key: 'CREATED', label: 'Đặt hàng', icon: 'fa-solid fa-cart-shopping' },
        { key: OrderStatus.PAID, label: 'Thanh toán', icon: 'fa-solid fa-credit-card' },
        { key: OrderStatus.PREPARING, label: 'Chuẩn bị vé', icon: 'fa-solid fa-box-open' },
        { key: OrderStatus.PENDING_PICKUP, label: 'Chờ nhận vé', icon: 'fa-solid fa-store' },
        { key: OrderStatus.COMPLETED, label: 'Hoàn thành', icon: 'fa-solid fa-check-circle' }
    ];

    const getStepIndex = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING_PAYMENT: return 0; // Đặt hàng xong
            case OrderStatus.PAID: return 1;
            case OrderStatus.PREPARING: return 2;
            case OrderStatus.PENDING_PICKUP: return 3;
            case OrderStatus.COMPLETED: return 4;
            default: return 0;
        }
    };

    const currentIndex = getStepIndex(currentStatus);

    return (
        <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
            <div className="flex items-center justify-between relative max-w-3xl mx-auto">
                {/* Background Line */}
                <div className="absolute top-6 left-0 w-full h-[3px] bg-[#F4F6F8] -translate-y-1/2 z-0 rounded-full"></div>

                {/* Active Line */}
                <div
                    className="absolute top-6 left-0 h-[3px] bg-[#00A76F] -translate-y-1/2 z-0 transition-all duration-700 ease-in-out rounded-full"
                    style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isActive = index === currentIndex;

                    return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center gap-3 bg-white px-2 sm:px-4">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-[16px] transition-all duration-300 ${isCompleted
                                        ? 'bg-[#00A76F] text-white shadow-[0_0_0_6px_#E4F8ED]'
                                        : 'bg-[#F4F6F8] text-[#919EAB] border-[3px] border-white shadow-sm'
                                    } ${isActive ? 'scale-110 shadow-[0_0_0_6px_#E4F8ED]' : ''}`}
                            >
                                <i className={step.icon}></i>
                            </div>
                            <span className={`text-[12px] sm:text-[13px] font-bold text-center ${isCompleted ? 'text-[#212B36]' : 'text-[#919EAB]'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const OrderDetailTab = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { data: orderData, isLoading, isError } = useGetMyOrderDetail(id || '');
    const { data: refundsData } = useGetMyRefunds({ orderId: id, limit: 100, page: 1 }, !!id);
    const processPaymentMutation = useProcessPayment();

    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundModalType, setRefundModalType] = useState<RefundType>(RefundType.FULL_ORDER);
    const [refundModalDetailId, setRefundModalDetailId] = useState<number | undefined>();

    const order = orderData?.data;
    const orderRefunds = refundsData?.data?.recordList || [];

    const pendingFullOrderRefund = useMemo(
        () =>
            orderRefunds.find(
                (r) => r.refundType === RefundType.FULL_ORDER && r.status === RefundRequestStatus.PENDING
            ),
        [orderRefunds]
    );

    const getPendingRefundForDetail = (detailId: number) =>
        orderRefunds.find(
            (r) =>
                r.refundType === RefundType.ORDER_DETAIL &&
                r.orderDetailId === detailId &&
                r.status === RefundRequestStatus.PENDING
        );

    const getRefundForDetail = (detailId: number) =>
        orderRefunds.find(
            (r) => r.refundType === RefundType.ORDER_DETAIL && r.orderDetailId === detailId
        );

    const canRequestRefund = isOrderPreparing(order?.status);

    const openRefundModal = (type: RefundType, detailId?: number) => {
        setRefundModalType(type);
        setRefundModalDetailId(detailId);
        setShowRefundModal(true);
    };

    // Countdown logic for PENDING_PAYMENT
    const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

    useEffect(() => {
        if (!order || order.status !== OrderStatus.PENDING_PAYMENT || !order.createdAt) return;

        const calculateTimeLeft = () => {
            const createdAtTime = new Date(order.createdAt).getTime();
            const expiresAtTime = createdAtTime + 15 * 60 * 1000; // 15 mins expiry
            const now = new Date().getTime();
            const difference = expiresAtTime - now;

            if (difference > 0) {
                setTimeLeft({
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                setTimeLeft({ minutes: 0, seconds: 0 });
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [order]);

    useEffect(() => {
        const state = location.state as { openRefund?: boolean } | null;
        if (!state?.openRefund || !order || !isOrderPreparing(order.status)) {
            return;
        }

        setRefundModalType(RefundType.FULL_ORDER);
        setRefundModalDetailId(undefined);
        setShowRefundModal(true);
        navigate(location.pathname, { replace: true, state: null });
    }, [location.state, location.pathname, order, navigate]);

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
            <div className="flex justify-center items-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <i className="fa-solid fa-circle-exclamation text-4xl text-[#919EAB]"></i>
                    <p className="text-[#212B36] font-medium text-[15px]">Không tìm thấy đơn hàng</p>
                    <button
                        onClick={() => navigate('/profile/orders')}
                        className="bg-[#ee1314] text-white px-5 py-2.5 rounded-xl font-bold text-[14px] hover:bg-[#c80f11] transition-colors cursor-pointer"
                    >
                        Quay lại danh sách
                    </button>
                </div>
            </div>
        );
    }

    const statusConfig = ORDER_STATUS_MAP[order.status];
    const isPendingPayment = order.status === OrderStatus.PENDING_PAYMENT;
    const isPaidOrCompleted = [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.PENDING_PICKUP, OrderStatus.COMPLETED].includes(order.status);

    const handleCopyOrderCode = () => {
        if (order.orderCode) {
            navigator.clipboard.writeText(order.orderCode);
            AppToast.success("Đã sao chép mã đơn hàng!");
        }
    };

    const handlePaymentRedirect = () => {
        const transactionId = order.transactions?.[0]?.id;
        if (transactionId) {
            processPaymentMutation.mutate({
                orderId: order.id,
                data: {
                    transactionId,
                    gateway: PaymentGateway.PAYOS
                }
            }, {
                onSuccess: (paymentRes) => {
                    if (paymentRes.success && paymentRes.data?.checkoutUrl) {
                        window.location.href = paymentRes.data.checkoutUrl;
                    } else {
                        AppToast.error("Không lấy được đường dẫn thanh toán");
                    }
                }
            });
        } else {
            AppToast.error("Không tìm thấy thông tin giao dịch");
        }
    };

    const getTicketStatusBadge = (ticketStatus: string) => {
        if (isPendingPayment) {
            return (
                <span className="text-[11px] font-bold text-[#FFB020] bg-[#FFF9F3] border border-[#FFB020]/20 px-2.5 py-1 rounded-md">
                    Chờ thanh toán
                </span>
            );
        }
        if (order.status === OrderStatus.CANCELLED) {
            return (
                <span className="text-[11px] font-bold text-[#ee1314] bg-[#FFF4F4] border border-[#ee1314]/20 px-2.5 py-1 rounded-md">
                    Đã huỷ
                </span>
            );
        }

        switch (ticketStatus) {
            case 'ACTIVE':
                return (
                    <span className="text-[11px] font-bold text-[#1CD162] bg-[#E4F8ED] border border-[#1CD162]/20 px-2.5 py-1 rounded-md">
                        Đã mua xong
                    </span>
                );
            case 'REFUND_PENDING':
                return (
                    <span className="text-[11px] font-bold text-[#FFB020] bg-[#FFF9F3] border border-[#FFB020]/20 px-2.5 py-1 rounded-md">
                        Chờ hoàn tiền
                    </span>
                );
            case 'REFUNDED':
                return (
                    <span className="text-[11px] font-bold text-[#919EAB] bg-[#F4F6F8] border border-[#919EAB]/20 px-2.5 py-1 rounded-md">
                        Đã hoàn tiền
                    </span>
                );
            default:
                return (
                    <span className="text-[11px] font-bold text-[#2065D1] bg-[#F0F5FF] border border-[#2065D1]/20 px-2.5 py-1 rounded-md">
                        {ticketStatus}
                    </span>
                );
        }
    };

    return (
        <div className={`flex flex-col gap-6 relative ${isPendingPayment ? 'pb-24 md:pb-6' : 'pb-6'}`}>
            {/* Header & Breadcrumbs */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[13px] font-medium text-[#637381]">
                    <Link to="/profile/orders" className="hover:text-[#212B36] transition-colors">Đơn hàng của tôi</Link>
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    <span className="text-[#212B36]">Chi tiết đơn hàng</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-[20px] sm:text-[24px] font-bold text-[#212B36]">Chi tiết đơn hàng</h1>
                        <span className={`text-[13px] font-bold px-2.5 py-1 rounded-md ${statusConfig.bg} ${statusConfig.text} border border-current/10 shadow-sm`}>
                            {statusConfig.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {canRequestRefund && !pendingFullOrderRefund && (
                            <button
                                onClick={() => openRefundModal(RefundType.FULL_ORDER)}
                                className="px-4 py-2 bg-[#ee1314] text-white rounded-xl text-[13px] font-bold hover:bg-[#c80f11] transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                            >
                                <i className="fa-solid fa-rotate-left"></i> Yêu cầu hoàn tiền
                            </button>
                        )}
                        {pendingFullOrderRefund && (
                            <Link
                                to={`/profile/refunds/${pendingFullOrderRefund.id}`}
                                className="px-4 py-2 bg-[#FFF9F3] border border-[#FFB020]/30 text-[#FFB020] rounded-xl text-[13px] font-bold hover:bg-[#FFF4F4] transition-colors flex items-center gap-2"
                            >
                                <i className="fa-solid fa-clock"></i> Xem yêu cầu hoàn tiền
                            </Link>
                        )}
                        <button
                            onClick={() => navigate('/profile/orders')}
                            className="px-4 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold text-[#454F5B] hover:bg-[#F9FAFB] transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                        >
                            <i className="fa-solid fa-arrow-left"></i> Quay lại danh sách
                        </button>
                    </div>
                </div>
            </div>

            {/* Stepper trạng thái đơn hàng */}
            <OrderStepper currentStatus={order.status} />

            {canRequestRefund && !pendingFullOrderRefund && (
                <div className="bg-[#F0F5FF] rounded-[20px] p-6 lg:p-8 border border-[#2065D1]/20 shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#2065D1] text-white flex items-center justify-center text-xl shrink-0">
                            <i className="fa-solid fa-rotate-left"></i>
                        </div>
                        <div>
                            <h3 className="text-[18px] font-bold text-[#212B36]">Bạn muốn hoàn tiền?</h3>
                            <p className="text-[14px] text-[#637381] mt-1">
                                Đơn hàng đang được chuẩn bị. Bạn có thể gửi yêu cầu hoàn tiền trong giai đoạn này.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => openRefundModal(RefundType.FULL_ORDER)}
                        className="w-full sm:w-auto px-6 py-3 bg-[#ee1314] text-white rounded-xl font-bold text-[14px] hover:bg-[#c80f11] transition-colors shadow-md shadow-[#ee1314]/20 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <i className="fa-solid fa-rotate-left"></i>
                        Yêu cầu hoàn tiền
                    </button>
                </div>
            )}

            {pendingFullOrderRefund && (
                <div className="bg-[#FFF9F3] rounded-[20px] p-5 border border-[#FFB020]/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-clock text-[#FFB020] text-xl"></i>
                        <span className="text-[14px] font-medium text-[#637381]">Yêu cầu hoàn tiền đang chờ duyệt</span>
                    </div>
                    <Link
                        to={`/profile/refunds/${pendingFullOrderRefund.id}`}
                        className="px-4 py-2 bg-white border border-[#FFB020]/30 text-[#FFB020] rounded-xl text-[13px] font-bold hover:bg-[#FFF4F4] transition-colors whitespace-nowrap"
                    >
                        Xem chi tiết
                    </Link>
                </div>
            )}

            {/* Pending Payment Card */}
            {isPendingPayment && (
                <div className="bg-[#FFF9F3] rounded-[20px] p-6 lg:p-8 border border-[#FFB020]/30 shadow-[0_4px_20px_rgba(255,176,32,0.06)] flex flex-col md:flex-row items-stretch gap-6 lg:gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-br from-[#FFF9F3] to-transparent rounded-bl-full -z-10"></div>

                    {/* Left: Callout Section "Bạn cần làm gì tiếp theo?" */}
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="bg-[#FFB020] text-white w-5 h-5 rounded-full flex items-center justify-center text-[13px] font-bold">!</span>
                            <h4 className="text-[16px] font-bold text-[#FFB020]">Bạn cần làm gì tiếp theo?</h4>
                        </div>
                        <ul className="text-[13px] text-[#454F5B] space-y-2 mt-2 font-medium">
                            <li className="flex items-start gap-2">
                                <span className="text-[#FFB020] mt-0.5">•</span>
                                <span>Bấm nút <strong>"Tiếp tục thanh toán"</strong> ở góc phải hoặc ở phần thanh toán bên dưới để thực hiện chuyển khoản.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#FFB020] mt-0.5">•</span>
                                <span>Hệ thống sử dụng cổng tự động của <strong>PayOS</strong>, giao dịch sẽ được xác nhận tự động sau vài giây.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-[#FFB020] mt-0.5">•</span>
                                <span>Vui lòng hoàn tất giao dịch trước khi đếm ngược kết thúc để tránh việc hệ thống tự động huỷ vé.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="w-px bg-[#E5E8EB] hidden md:block"></div>

                    {/* Right: Timer and Payment CTA */}
                    <div className="flex flex-col items-center justify-center min-w-[260px] bg-white rounded-2xl p-6 border border-[#FFB020]/20 shadow-sm gap-4">
                        <div className="flex flex-col items-center text-center">
                            <span className="text-[11px] text-[#637381] font-bold uppercase tracking-wider mb-1">Thời gian thanh toán còn lại</span>
                            <div className="flex items-center gap-2 bg-[#FFF4F4] px-4 py-2 rounded-xl border border-[#FFEBEE]">
                                <i className="fa-solid fa-clock text-[#ee1314] animate-pulse text-[15px]"></i>
                                <span className="text-[20px] font-bold text-[#ee1314] font-mono leading-none">
                                    {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handlePaymentRedirect}
                            disabled={processPaymentMutation.isPending}
                            className="w-full bg-[#ee1314] text-white py-3 rounded-xl font-bold text-[14px] hover:bg-[#c80f11] transition-all shadow-md shadow-[#ee1314]/20 hover:shadow-lg active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {processPaymentMutation.isPending ? (
                                <i className="fa-solid fa-spinner fa-spin animate-spin"></i>
                            ) : (
                                <i className="fa-solid fa-credit-card"></i>
                            )}
                            Tiếp tục thanh toán
                        </button>
                    </div>
                </div>
            )}

            {/* Thông tin đơn hàng */}
            <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                        <i className="fa-regular fa-file-lines"></i>
                    </div>
                    <h3 className="text-[20px] font-bold text-[#212B36]">Thông tin đơn hàng</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[14px] text-[#637381]">Mã đơn hàng</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold text-[#212B36]">{order.orderCode}</span>
                            <button
                                onClick={handleCopyOrderCode}
                                className="text-[#919EAB] hover:text-[#ee1314] transition-colors p-1 hover:bg-gray-100 rounded-md cursor-pointer flex items-center justify-center"
                                title="Sao chép mã đơn"
                            >
                                <i className="fa-regular fa-copy text-[14px]"></i>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[14px] text-[#637381]">Ngày đặt</span>
                        <span className="text-[15px] font-semibold text-[#212B36]">
                            {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm') : '-'}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1.5 items-start">
                        <span className="text-[14px] text-[#637381]">Loại đơn</span>
                        <span className={`text-[12px] font-bold px-2.5 py-1 rounded-md ${ORDER_TYPE_MAP[order.orderType].bg} ${ORDER_TYPE_MAP[order.orderType].text}`}>
                            {ORDER_TYPE_MAP[order.orderType].label}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1.5 items-start">
                        <span className="text-[14px] text-[#637381]">Trạng thái</span>
                        <span className={`text-[12px] font-bold px-2.5 py-1 rounded-md ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[14px] text-[#637381]">Giờ lấy vé (dự kiến)</span>
                        <div className="flex items-center gap-1.5">
                            <i className="fa-regular fa-clock text-[#919EAB] text-[14px]"></i>
                            <span className="text-[15px] font-semibold text-[#212B36]">
                                {order.expectedPickupAt ? format(new Date(order.expectedPickupAt), 'dd/MM/yyyy HH:mm') : 'Không có'}
                            </span>
                        </div>
                    </div>

                    {order.transactions?.[0]?.note && order.transactions[0].note.trim() !== '' && (
                        <div className="flex flex-col gap-1.5 lg:col-span-3">
                            <span className="text-[14px] text-[#637381]">Ghi chú</span>
                            <span className="text-[15px] font-semibold text-[#212B36] truncate">
                                {order.transactions[0].note}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Thông tin người đặt */}
            <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                        <i className="fa-regular fa-user"></i>
                    </div>
                    <h3 className="text-[20px] font-bold text-[#212B36]">Thông tin người đặt</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 border-t border-[#F4F6F8] pt-6">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[14px] text-[#637381]">Họ tên</span>
                        <span className="text-[15px] font-semibold text-[#212B36]">{order.name || `Người dùng (ID: ${order.userId ? order.userId.slice(0, 8) : '...'})`}</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[14px] text-[#637381]">Số điện thoại</span>
                        <span className="text-[15px] font-semibold text-[#212B36]">{order.phone || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Danh sách vé */}
            <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                        <i className="fa-solid fa-ticket"></i>
                    </div>
                    <h3 className="text-[20px] font-bold text-[#212B36]">Danh sách vé</h3>
                </div>

                <div className="space-y-4 mt-2">
                    {order.orderDetails && order.orderDetails.length > 0 ? (
                        order.orderDetails.map((detail: any, index: number) => {
                            const serialId = detail.lotteryTicketSerialId || detail.id || index;
                            const isActiveTicket = detail.status === OrderDetailStatus.ACTIVE || detail.status === 'ACTIVE';
                            const pendingDetailRefund = detail.id ? getPendingRefundForDetail(detail.id) : undefined;
                            const detailRefund = detail.id ? getRefundForDetail(detail.id) : undefined;
                            return (
                                <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 border border-[#E5E8EB] rounded-xl hover:border-gray-300 transition-colors bg-gray-50/50">

                                    <div className="w-[120px] sm:w-[180px] h-[100px] rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-gray-100 bg-white p-2">
                                        <img src="https://i.imgur.com/V4b7V3x.jpeg" alt="Vé số" className="w-full h-full object-cover rounded" />
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                                        <div>
                                            <h3 className="font-bold text-[#212B36] text-[15px] mb-1">Xổ số {getMockStation(serialId)}</h3>
                                            <div className="text-[13px] text-[#637381] space-y-1 mt-2 bg-white p-2 rounded border border-[#E5E8EB]">
                                                <p className="flex items-center gap-2"><i className="fa-regular fa-calendar w-4 text-[#ee1314] text-center"></i> <span>Mở thưởng: <strong>16/06/2026</strong></span></p>
                                                <p className="flex items-center gap-2"><i className="fa-regular fa-clock w-4 text-[#ee1314] text-center"></i> <span>Giờ chốt: <strong>15:30</strong></span></p>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2 bg-[#FFF4F4] rounded px-3 py-1.5 w-max border border-[#FFEBEE]">
                                                <span className="text-[12px] text-[#637381]">Mã vé:</span>
                                                <span className="text-[16px] font-bold text-[#ee1314] tracking-widest">{getMockTicketNumber(serialId)}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 justify-center border-t md:border-t-0 md:border-l border-dashed border-[#E5E8EB] pt-3 md:pt-0 md:pl-5">
                                            <div className="mb-2">
                                                {getTicketStatusBadge(detail.status)}
                                            </div>
                                            <span className="text-[13px] font-medium text-[#637381]">Giá vé</span>
                                            <div className="text-[16px] font-bold text-[#ee1314] mt-1 leading-none">
                                                {detail.price.toLocaleString('vi-VN')} đ
                                            </div>
                                            {isPaidOrCompleted && (
                                                <Link
                                                    to="/results"
                                                    className="mt-3 text-[#ee1314] hover:text-[#c80f11] text-[13px] font-bold flex items-center gap-1.5 hover:underline w-max bg-[#FFF4F4] px-3 py-1.5 rounded-lg border border-[#FFEBEE]"
                                                >
                                                    Xem kết quả <i className="fa-solid fa-arrow-up-right-from-square text-[11px]"></i>
                                                </Link>
                                            )}
                                            {canRequestRefund && isActiveTicket && !pendingDetailRefund && !pendingFullOrderRefund && (
                                                <button
                                                    onClick={() => openRefundModal(RefundType.ORDER_DETAIL, detail.id)}
                                                    className="mt-2 text-[#637381] hover:text-[#ee1314] text-[12px] font-bold flex items-center gap-1.5 w-max bg-white px-3 py-1.5 rounded-lg border border-[#E5E8EB] hover:border-[#ee1314] transition-colors cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-rotate-left text-[11px]"></i> Yêu cầu hoàn tiền
                                                </button>
                                            )}
                                            {(pendingDetailRefund || (detail.status === 'REFUND_PENDING' && detailRefund)) && (
                                                <Link
                                                    to={`/profile/refunds/${(pendingDetailRefund || detailRefund)?.id}`}
                                                    className="mt-2 text-[#FFB020] text-[12px] font-bold flex items-center gap-1.5 hover:underline w-max"
                                                >
                                                    <i className="fa-solid fa-clock text-[11px]"></i> Xem yêu cầu hoàn tiền
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-8 text-center text-[14px] text-[#637381] border border-[#E5E8EB] rounded-xl bg-gray-50/50">
                            Không có dữ liệu vé
                        </div>
                    )}
                </div>
            </div>

            {/* Thanh toán */}
            <div className="bg-white rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#E5E8EB] flex flex-col overflow-hidden mt-2">
                <div className="p-6 lg:p-8 flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                            <i className="fa-solid fa-receipt"></i>
                        </div>
                        <h3 className="text-[20px] font-bold text-[#212B36]">Chi tiết thanh toán</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[#F4F6F8] pt-6">
                        {/* Cột trái: Phương thức & Trạng thái */}
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[13px] font-medium text-[#637381]">Phương thức thanh toán</span>
                                <div className="flex items-center gap-3 mt-1 bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E8EB] w-max">
                                    <div className="w-[28px] h-[28px] rounded border border-[#E5E8EB] bg-white flex items-center justify-center p-1 shadow-sm">
                                        <img src="https://payos.vn/wp-content/uploads/sites/13/2023/07/payos-logo.svg" alt="PayOS" className="w-full h-full object-contain" />
                                    </div>
                                    <span className="text-[14px] font-bold text-[#212B36]">Chuyển khoản QR</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 items-start">
                                <span className="text-[13px] font-medium text-[#637381]">Trạng thái thanh toán</span>
                                <span className={`text-[13px] font-bold px-3 py-1.5 rounded-lg ${statusConfig.bg} ${statusConfig.text} mt-1 border border-current/10 shadow-sm`}>
                                    {statusConfig.label}
                                </span>
                            </div>
                        </div>

                        {/* Cột phải: Breakdown chi phí */}
                        <div className="bg-[#F9FAFB] rounded-2xl p-5 sm:p-6 border border-[#E5E8EB] flex flex-col gap-4">
                            <div className="flex justify-between items-center text-[14px]">
                                <span className="text-[#637381]">Tổng số lượng</span>
                                <span className="font-bold text-[#212B36]">{order.orderDetails?.length || 0} vé</span>
                            </div>
                            <div className="flex justify-between items-center text-[14px]">
                                <span className="text-[#637381]">Tạm tính</span>
                                <span className="font-medium text-[#212B36]">{(order.totalAmount || 0).toLocaleString('vi-VN')} đ</span>
                            </div>
                            <div className="flex justify-between items-center text-[14px]">
                                <span className="text-[#637381]">Phí dịch vụ</span>
                                <span className="font-medium text-[#00A76F]">Miễn phí</span>
                            </div>

                            <div className="border-t border-dashed border-[#E5E8EB] my-1"></div>

                            <div className="flex justify-between items-center">
                                <span className="text-[15px] font-bold text-[#212B36]">Tổng thanh toán</span>
                                <span className="text-[24px] font-bold text-[#ee1314] tracking-tight leading-none">{(order.totalAmount || 0).toLocaleString('vi-VN')} đ</span>
                            </div>
                        </div>
                    </div>
                </div>

                {isPendingPayment && (
                    <div className="bg-[#FFF4F4] border-t border-[#FFEBEE] p-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-[13px] text-[#637381] font-bold uppercase tracking-wider">Thời gian còn lại để hoàn tất:</span>
                            <span className="text-[16px] font-bold text-[#ee1314] font-mono bg-white px-3 py-1.5 rounded-lg border border-[#FFEBEE] shadow-sm">
                                {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                            </span>
                        </div>
                        <button
                            onClick={handlePaymentRedirect}
                            disabled={processPaymentMutation.isPending}
                            className="w-full sm:w-auto bg-[#ee1314] text-white px-8 py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#c80f11] transition-all shadow-md shadow-[#ee1314]/20 hover:shadow-lg active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
            </div>

            {/* Footer Notes */}
            {isPendingPayment && (
                <div className="text-center py-4 flex items-center justify-center gap-2 text-[13px] text-[#637381] font-semibold">
                    <i className="fa-regular fa-circle-check text-[#ee1314]"></i>
                    Đơn hàng sẽ được giữ trong 15 phút. Vui lòng thanh toán để xác nhận giữ vé chính thức.
                </div>
            )}

            {/* Guarantees */}
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

            {/* Mobile Sticky Bottom Bar */}
            {isPendingPayment && (
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

            {order && (
                <RefundRequestModal
                    isOpen={showRefundModal}
                    onClose={() => setShowRefundModal(false)}
                    order={order}
                    initialRefundType={refundModalType}
                    initialOrderDetailId={refundModalDetailId}
                />
            )}
        </div>
    );
};
