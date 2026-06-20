import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGetMyOrderDetail } from '../../../hooks/useOrder';
import { useProcessPayment } from '../../../hooks/useTransaction';
import { OrderStatus, OrderType, OrderReceiveType } from '../../../../types/order.type';
import { PaymentGateway } from '../../../../types/transaction.type';
import { AppToast } from '../../../utils/toast.util';
import { format } from 'date-fns';

const ORDER_STATUS_MAP: Record<OrderStatus, { label: string, bg: string, text: string }> = {
    [OrderStatus.PENDING_PAYMENT]: { label: 'Chờ thanh toán', bg: 'bg-[#FFF9F3]', text: 'text-[#FFB020]' },
    [OrderStatus.PAID]: { label: 'Đã thanh toán', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [OrderStatus.PREPARING]: { label: 'Đang xử lý', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
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
        { key: 'PENDING', label: 'Chờ xác nhận', icon: 'fa-regular fa-file-lines', date: '13/03/2025 - 16:37' },
        { key: OrderStatus.PREPARING, label: 'Đang chuẩn bị', icon: 'fa-solid fa-box-open', date: '' },
        { key: OrderStatus.PENDING_PICKUP, label: 'Đang giao vé', icon: 'fa-solid fa-truck', date: '' },
        { key: OrderStatus.COMPLETED, label: 'Hoàn thành', icon: 'fa-solid fa-location-dot', date: '' }
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
                    const isActive = index === currentIndex;

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
                                {step.date && isActive && (
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
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: orderData, isLoading, isError } = useGetMyOrderDetail(id || '');
    const processPaymentMutation = useProcessPayment();

    const order = orderData?.data;

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

    const getPaymentBadge = () => {
        if (order.status === OrderStatus.PENDING_PAYMENT) {
            return (
                <span className="text-[12px] font-bold px-3 py-1 rounded-full border bg-[#FFF9F3] text-[#FFB020] border-[#FFB020]/20 flex items-center gap-1.5">
                    Chưa thanh toán
                </span>
            );
        }
        if (order.status === OrderStatus.CANCELLED) {
            return (
                <span className="text-[12px] font-bold px-3 py-1 rounded-full border bg-[#FFF4F4] text-[#ee1314] border-[#ee1314]/20 flex items-center gap-1.5">
                    Đã huỷ
                </span>
            );
        }
        return (
            <span className="text-[12px] font-bold px-3 py-1 rounded-full border bg-[#E4F8ED] text-[#1CD162] border-[#1CD162]/20 flex items-center gap-1.5">
                <i className="fa-regular fa-circle-check text-[14px]"></i> Đã thanh toán
            </span>
        );
    };

    return (
        <div className={`flex flex-col gap-6 relative ${isPendingPayment ? 'pb-24 md:pb-6' : 'pb-6'}`}>
            {/* Header Title (with back button) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-[14px] font-medium text-[#637381]">
                    <Link to="/" className="hover:text-[#212B36] transition-colors">Trang chủ</Link>
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    <Link to="/profile/orders" className="hover:text-[#212B36] transition-colors">Đơn hàng của tôi</Link>
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    <span className="text-[#212B36] font-bold">Chi tiết đơn hàng</span>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                    <i className="fa-solid fa-file-invoice text-2xl text-[#212B36]"></i>
                    <h1 className="text-[20px] sm:text-[24px] font-bold text-[#212B36]">Chi tiết đơn hàng</h1>
                </div>
                <button
                    onClick={() => navigate('/profile/orders')}
                    className="px-5 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold text-[#454F5B] hover:bg-[#F9FAFB] transition-colors shadow-sm cursor-pointer flex items-center gap-2 w-max"
                >
                    <i className="fa-solid fa-arrow-left"></i> Quay lại
                </button>
            </div>

            {/* Pending Payment Card (kept if user hasn't paid) */}
            {isPendingPayment && (
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
                                <span>Bấm nút <strong>"Tiếp tục thanh toán"</strong> ở góc phải hoặc ở phần thanh toán bên dưới để thực hiện chuyển khoản.</span>
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

            {/* Header Box */}
            <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-[#637381]">Mã đơn hàng</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[16px] font-bold text-[#212B36]">{order.orderCode}</span>
                        <button
                            onClick={handleCopyOrderCode}
                            className="text-[#919EAB] hover:text-[#ee1314] transition-colors cursor-pointer flex items-center justify-center"
                            title="Sao chép mã đơn"
                        >
                            <i className="fa-regular fa-copy text-[14px]"></i>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-[#637381]">Ngày đặt</span>
                    <span className="text-[15px] font-bold text-[#212B36]">
                        {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy - HH:mm') : '-'}
                    </span>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-[#637381]">Loại đơn</span>
                    <span className="text-[15px] font-bold text-[#212B36]">
                        {order.orderType === 'ONLINE' ? 'Mua online' : 'Mua trực tiếp'}
                    </span>
                </div>

                <div className="flex flex-col gap-1.5 items-start">
                    <span className="text-[13px] font-medium text-[#637381]">Thanh toán</span>
                    {getPaymentBadge()}
                </div>

                <div className="flex flex-col gap-1.5 items-start">
                    <span className="text-[13px] font-medium text-[#637381]">Trạng thái</span>
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-full border ${statusConfig.bg} ${statusConfig.text} border-current/20`}>
                        {statusConfig.label}
                    </span>
                </div>
            </div>

            {/* Stepper trạng thái đơn hàng */}
            <OrderStepper currentStatus={order.status} />

            {/* Danh sách vé chi tiết */}
            <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-6 mt-6 mb-6">
                <div className="flex items-center justify-between border-b border-[#F4F6F8] pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                            <i className="fa-solid fa-ticket"></i>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#212B36]">Danh sách vé đã mua</h3>
                    </div>
                    <span className="text-[14px] font-bold text-[#212B36] bg-[#F4F6F8] px-3 py-1.5 rounded-lg">{order.orderDetails?.length || 0} vé</span>
                </div>

                <div className="space-y-4">
                    {order.orderDetails && order.orderDetails.length > 0 ? (
                        order.orderDetails.map((detail: any, index: number) => {
                            const stationName = detail.lotteryTicket?.station?.name || "Miền Nam";
                            const drawDate = detail.lotteryTicket?.drawDate ? format(new Date(detail.lotteryTicket.drawDate), 'dd/MM/yyyy') : (order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy') : '-');
                            const numbers = detail.lotteryTicket?.numbers || "123456";
                            const price = detail.price || 10000;
                            const ticketImg = detail.ticketImg || detail.lotteryTicket?.imageUrl || "https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png";

                            return (
                                <div key={index} className="flex flex-col sm:flex-row gap-5 p-5 border border-[#E5E8EB] rounded-2xl hover:border-gray-300 transition-colors bg-white shadow-sm hover:shadow-md">
                                    <div className="w-full sm:w-[160px] h-[100px] rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-gray-100 bg-[#F9FAFB]">
                                        <img src={ticketImg} alt={`Vé ${stationName}`} className="w-full h-full object-cover mix-blend-multiply" />
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-center">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-bold text-[#212B36] text-[16px]">Xổ số {stationName}</h3>
                                                {getTicketStatusBadge(detail.status || 'ACTIVE')}
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-1">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[12px] text-[#637381]">Kỳ mở thưởng</span>
                                                    <span className="text-[14px] font-bold text-[#212B36] flex items-center gap-1.5">
                                                        <i className="fa-regular fa-calendar text-[#ee1314]"></i> {drawDate}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[12px] text-[#637381]">Dãy số dự thưởng</span>
                                                    <div className="flex items-center gap-1">
                                                        {String(numbers).split('').map((num: string, i: number) => (
                                                            <span key={i} className="w-7 h-7 rounded-full bg-[#FFF4F4] text-[#ee1314] font-bold text-[14px] flex items-center justify-center border border-[#FFEBEE] shadow-sm">{num}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end justify-center border-t md:border-t-0 md:border-l border-dashed border-[#E5E8EB] pt-4 md:pt-0 md:pl-6 min-w-[120px]">
                                            <span className="text-[13px] font-medium text-[#637381]">Giá vé</span>
                                            <div className="text-[18px] font-bold text-[#ee1314] mt-1 leading-none">
                                                {price.toLocaleString('vi-VN')} đ
                                            </div>
                                            {isPaidOrCompleted && (
                                                <Link
                                                    to="/results"
                                                    className="mt-4 text-[#ee1314] hover:text-[#c80f11] text-[13px] font-bold flex items-center gap-1.5 hover:underline bg-[#FFF4F4] px-3 py-1.5 rounded-lg border border-[#FFEBEE]"
                                                >
                                                    Tra kết quả <i className="fa-solid fa-arrow-up-right-from-square text-[11px]"></i>
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

            {/* Grid 3 boxes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Box 1: Thông tin đơn hàng */}
                <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] h-full flex flex-col">
                    <h3 className="text-[16px] font-bold text-[#212B36] mb-6">Thông tin đơn hàng</h3>
                    
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Sản phẩm</span>
                            <span className="text-[15px] font-bold text-[#212B36]">Vé số truyền thống</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Kỳ mở thưởng</span>
                            <span className="text-[15px] font-bold text-[#212B36]">
                                {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy') : '-'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Số lượng vé</span>
                            <span className="text-[15px] font-bold text-[#212B36]">{order.orderDetails?.length || 0} vé</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Tổng tiền hàng</span>
                            <span className="text-[15px] font-bold text-[#212B36]">{(order.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Phí dịch vụ</span>
                            <span className="text-[15px] font-bold text-[#212B36]">10.000đ</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pb-6 border-b border-dashed border-[#E5E8EB] mb-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Phương thức thanh toán</span>
                            <span className="text-[15px] font-bold text-[#212B36]">Thanh toán online</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Ngày thanh toán</span>
                            <span className="text-[15px] font-bold text-[#212B36]">
                                {(!isPendingPayment && order.status !== OrderStatus.CANCELLED) 
                                    ? (order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy - HH:mm') : '-')
                                    : '-'}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-auto">
                        <span className="text-[14px] font-bold text-[#212B36]">Tổng thanh toán</span>
                        <span className="text-[24px] font-bold text-[#ee1314]">{((order.totalAmount || 0) + 10000).toLocaleString('vi-VN')}đ</span>
                    </div>
                </div>

                {/* Right Column: 1 Box */}
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
                        <p className="text-[13px] text-[#637381] mb-4">Quý khách vui lòng mang theo mã đơn hàng và CMND/CCCD để nhận vé.</p>
                        <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E8EB]">
                            <span className="text-[12px] text-[#637381] block mb-1">Địa chỉ nhận vé</span>
                            <span className="text-[14px] text-[#212B36] font-medium leading-relaxed">
                                123 Đường Lý Chính Thắng, Phường 7, Quận 3, TP. Hồ Chí Minh
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
};
