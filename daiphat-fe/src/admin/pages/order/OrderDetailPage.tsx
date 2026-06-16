import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useOrderDetail, useUpdateOrderStatus } from './hooks/useOrderManagement';
import { OrderStatus, OrderType } from '../../../types/order.type';
import dayjs from 'dayjs';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { Icon } from '@iconify/react';
import { toast } from 'react-toastify';
import { prefixAdmin } from '../../constants/routes';

const ORDER_STATUS_MAP: Record<OrderStatus, { label: string, bg: string, text: string, color: any }> = {
    [OrderStatus.PENDING_PAYMENT]: { label: 'Chờ thanh toán', bg: 'bg-[#FFF9F3]', text: 'text-[#FFB020]', color: 'warning' },
    [OrderStatus.PAID]: { label: 'Đã thanh toán', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]', color: 'success' },
    [OrderStatus.PREPARING]: { label: 'Đang chuẩn bị', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]', color: 'info' },
    [OrderStatus.PENDING_PICKUP]: { label: 'Chờ nhận vé', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]', color: 'primary' },
    [OrderStatus.COMPLETED]: { label: 'Hoàn thành', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]', color: 'success' },
    [OrderStatus.CANCELLED]: { label: 'Đã huỷ', bg: 'bg-[#FFF4F4]', text: 'text-[#ee1314]', color: 'error' }
};

const ORDER_TYPE_MAP: Record<OrderType, { label: string, bg: string, text: string }> = {
    [OrderType.ONLINE]: { label: 'Online', bg: 'bg-[#F0F5FF]', text: 'text-[#2065D1]' },
    [OrderType.DIRECT]: { label: 'Tại quầy', bg: 'bg-[#FFF9F3]', text: 'text-[#FFB020]' }
};

const AdminOrderStepper = ({ currentStatus }: { currentStatus: OrderStatus }) => {
    if (currentStatus === OrderStatus.CANCELLED) {
        return (
            <div className="bg-[#FFF4F4] rounded-[16px] p-6 border border-[#FFEBEE] flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="w-14 h-14 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                    <i className="fa-solid fa-xmark"></i>
                </div>
                <div>
                    <h3 className="text-[#ee1314] font-bold text-[18px]">Đơn hàng đã bị huỷ</h3>
                    <p className="text-[#637381] text-[14px] mt-1.5 font-medium">Đơn hàng này đã bị huỷ và không thể tiếp tục thực hiện.</p>
                </div>
            </div>
        );
    }

    const steps = [
        { key: 'CREATED', label: 'Đã đặt đơn' },
        { key: OrderStatus.PAID, label: 'Đã thanh toán' },
        { key: OrderStatus.PREPARING, label: 'Đang chuẩn bị' },
        { key: OrderStatus.PENDING_PICKUP, label: 'Chờ nhận vé' }
    ];

    const getStepIndex = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING_PAYMENT: return 0;
            case OrderStatus.PAID: return 1;
            case OrderStatus.PREPARING: return 2;
            case OrderStatus.PENDING_PICKUP: return 3;
            case OrderStatus.COMPLETED: return 3; // Hoàn thành cũng full step
            default: return 0;
        }
    };

    const currentIndex = getStepIndex(currentStatus);

    return (
        <div className="bg-white rounded-[16px] p-6 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col items-center">
            <div className="flex items-center justify-between relative w-full max-w-4xl mx-auto mb-6 mt-4">
                {/* Background Line */}
                <div className="absolute top-1/2 left-[5%] right-[5%] h-[2px] bg-[#E5E8EB] -translate-y-1/2 z-0"></div>

                {/* Active Line */}
                <div
                    className="absolute top-1/2 left-[5%] h-[2px] bg-[#1CD162] -translate-y-1/2 z-0 transition-all duration-700 ease-in-out"
                    style={{ width: `${(currentIndex / (steps.length - 1)) * 90}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isLastCompleted = index === currentIndex;

                    return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center gap-2 bg-white px-4">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] transition-all duration-300 ${isCompleted
                                        ? 'bg-white text-[#1CD162] border-2 border-[#1CD162]'
                                        : 'bg-white text-[#919EAB] border-2 border-[#E5E8EB]'
                                    }`}
                            >
                                {isCompleted ? <i className="fa-solid fa-check"></i> : (currentStatus === OrderStatus.PENDING_PAYMENT && index === 0 ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-lock text-[12px]"></i>)}
                            </div>
                            <div className="text-center">
                                <span className={`block text-[13px] font-bold ${isCompleted ? 'text-[#212B36]' : 'text-[#919EAB]'}`}>
                                    {step.label}
                                </span>
                                {isLastCompleted && (
                                    <span className="block text-[11px] text-[#919EAB] mt-0.5">
                                        {dayjs().format('DD/MM/YYYY - HH:mm')}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-[#637381] text-[13px] text-center mt-2">
                Đơn hàng sẽ được chuẩn bị và sẵn sàng để bạn đến lấy vé.
            </p>
        </div>
    );
};

export const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: orderRes, isLoading } = useOrderDetail(id || "");
    const { mutate: updateStatus } = useUpdateOrderStatus();

    const order = orderRes?.data;

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!order) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography sx={{ color: 'var(--palette-text-primary)' }}>Không tìm thấy đơn hàng</Typography>
                <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate(-1)}>Quay lại</Button>
            </Box>
        );
    }

    const statusConfig = ORDER_STATUS_MAP[order.status as OrderStatus] || ORDER_STATUS_MAP[OrderStatus.PENDING_PAYMENT];
    const typeConfig = ORDER_TYPE_MAP[order.orderType as OrderType] || ORDER_TYPE_MAP[OrderType.ONLINE];

    const handleCopyOrderCode = () => {
        if (order.orderCode) {
            navigator.clipboard.writeText(order.orderCode);
            toast.success("Đã sao chép mã đơn hàng!");
        }
    };

    const handleStatusChange = (newStatus: OrderStatus) => {
        let reason = undefined;
        if (newStatus === OrderStatus.CANCELLED) {
            const input = window.prompt("Nhập lý do huỷ đơn hàng (tùy chọn):");
            if (input === null) return; // User cancelled
            reason = input;
        }

        updateStatus({ id: order.id, status: newStatus, reason }, {
            onSuccess: () => toast.success("Cập nhật trạng thái thành công"),
            onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Cập nhật trạng thái thất bại")
        });
    };

    const paymentMethod = order.transactions?.[0]?.paymentGateway || 'PayOS (Chuyển khoản QR)';
    const note = order.transactions?.[0]?.note || 'Không có';

    return (
        <div className="max-w-[1200px] mx-auto pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#637381] mb-4">
                <Link to={`/${prefixAdmin}/order/list`} className="hover:text-[#212B36] transition-colors flex items-center gap-1">
                    <i className="fa-solid fa-arrow-left text-[11px]"></i> Đơn mua hộ
                </Link>
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
                <span className="text-[#212B36] underline decoration-gray-300 underline-offset-4 font-semibold">Chi tiết đơn hàng</span>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-[24px] font-bold text-[#212B36]">Chi tiết đơn hàng</h1>
                    <span className={`text-[12px] font-bold px-2.5 py-1 rounded-md ${statusConfig.bg} ${statusConfig.text}`}>
                        <i className="fa-solid fa-check-circle mr-1"></i> {statusConfig.label}
                    </span>
                    <span className={`text-[12px] font-bold px-2.5 py-1 rounded-md ${typeConfig.bg} ${typeConfig.text}`}>
                        {typeConfig.label}
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Select Update Status */}
                    <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                        disabled={order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED}
                        className="h-[38px] px-3 pr-8 bg-white border border-[#E5E8EB] rounded-lg text-[14px] font-semibold text-[#212B36] outline-none cursor-pointer hover:border-[#919EAB] transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#F9FAFB] min-w-[160px]"
                    >
                        {Object.entries(ORDER_STATUS_MAP).map(([value, opt]) => (
                            <option key={value} value={value} className="font-medium">
                                {opt.label}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => navigate(`/${prefixAdmin}/order/list`)}
                        className="px-4 py-2 bg-white border border-[#E5E8EB] rounded-lg text-[14px] font-bold text-[#454F5B] hover:bg-[#F9FAFB] transition-colors shadow-sm cursor-pointer flex items-center gap-2 h-[38px]"
                    >
                        <i className="fa-solid fa-arrow-left"></i> Quay lại danh sách
                    </button>
                </div>
            </div>

            {/* General Info Card */}
            <div className="bg-white rounded-[16px] border border-[#E5E8EB] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] mb-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] text-[#637381]">Mã đơn hàng</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-[#00A76F]">{order.orderCode}</span>
                            <button onClick={handleCopyOrderCode} className="text-[#919EAB] hover:text-[#212B36]">
                                <i className="fa-regular fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] text-[#637381]">Ngày đặt</span>
                        <div className="flex items-center gap-2 text-[14px] font-semibold text-[#212B36]">
                            <i className="fa-regular fa-calendar text-[#919EAB]"></i>
                            {dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] text-[#637381]">Giờ lấy vé (dự kiến)</span>
                        <div className="flex items-center gap-2 text-[14px] font-semibold text-[#212B36]">
                            <i className="fa-regular fa-clock text-[#919EAB]"></i>
                            {order.expectedPickupAt ? dayjs(order.expectedPickupAt).format('DD/MM/YYYY HH:mm') : '-'}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] text-[#637381]">Loại đơn</span>
                        <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded w-max ${typeConfig.bg} ${typeConfig.text}`}>
                            {typeConfig.label}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] text-[#637381]">Trạng thái</span>
                        <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded w-max ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                        </span>
                    </div>
                </div>
                
                <div className="mt-6 border-t border-[#F4F6F8] pt-4">
                    <span className="text-[13px] text-[#637381] block mb-1">Ghi chú</span>
                    <span className="text-[14px] font-semibold text-[#212B36]">{note}</span>
                </div>
            </div>

            {/* Stepper */}
            <div className="mb-6">
                <AdminOrderStepper currentStatus={order.status as OrderStatus} />
            </div>

            {/* User & Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Thông tin người đặt */}
                <div className="bg-white rounded-[16px] border border-[#E5E8EB] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
                    <div className="flex items-center gap-2 mb-6">
                        <i className="fa-regular fa-user text-[#1CD162] text-[18px]"></i>
                        <h3 className="text-[16px] font-bold text-[#212B36]">Thông tin người đặt</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Họ tên</span>
                            <span className="text-[15px] font-semibold text-[#212B36]">{order.name || order.userId || 'Admin Super'}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Số điện thoại</span>
                            <span className="text-[15px] font-semibold text-[#212B36]">{order.phone || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Thanh toán */}
                <div className="bg-white rounded-[16px] border border-[#E5E8EB] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
                    <div className="flex items-center gap-2 mb-6">
                        <i className="fa-solid fa-receipt text-[#1CD162] text-[18px]"></i>
                        <h3 className="text-[16px] font-bold text-[#212B36]">Thanh toán</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Tổng tiền</span>
                            <span className="text-[18px] font-bold text-[#1CD162]">{(order.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Phương thức</span>
                            <div className="flex items-center gap-2 text-[14px] font-semibold text-[#212B36]">
                                <i className="fa-solid fa-money-bill-transfer text-[#919EAB]"></i> {paymentMethod}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[13px] text-[#637381]">Trạng thái thanh toán</span>
                            <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded w-max ${statusConfig.bg} ${statusConfig.text}`}>
                                {statusConfig.label}
                            </span>
                            <span className="text-[11px] text-[#919EAB] mt-1">{dayjs(order.createdAt).format('DD/MM/YYYY - HH:mm')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danh sách vé */}
            <div className="bg-white rounded-[16px] border border-[#E5E8EB] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] mb-6">
                <div className="flex items-center gap-2 mb-6">
                    <i className="fa-solid fa-ticket text-[#1CD162] text-[18px]"></i>
                    <h3 className="text-[16px] font-bold text-[#212B36]">Danh sách vé ({order.orderDetails?.length || 0} vé)</h3>
                </div>

                <div className="space-y-4">
                    {order.orderDetails && order.orderDetails.length > 0 ? (
                        order.orderDetails.map((detail: any, index: number) => (
                            <div key={index} className="flex flex-col md:flex-row items-center gap-4 py-4 border-b border-[#F4F6F8] last:border-0">
                                <div className="w-[60px] h-[60px] bg-[#ee1314] rounded-lg flex items-center justify-center text-white shrink-0">
                                    <i className="fa-solid fa-ticket text-[24px]"></i>
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                                    <div>
                                        <h4 className="text-[14px] font-bold text-[#212B36]">Vé số {detail.lotteryTicket?.province?.name || 'Đồng Nai'}</h4>
                                        <div className="text-[18px] font-bold text-[#212B36] mt-1">{detail.lotteryTicket?.symbol || '283749'} <span className="text-[#ee1314] text-[11px] bg-[#FFF4F4] px-1.5 py-0.5 rounded ml-1">Vé thường</span></div>
                                    </div>
                                    <div>
                                        <span className="text-[13px] text-[#637381] block">Ngày xổ</span>
                                        <div className="flex items-center gap-2 text-[14px] font-semibold text-[#212B36] mt-1">
                                            <i className="fa-regular fa-calendar text-[#919EAB]"></i> 16/06/2026<br/>
                                            <span className="text-[12px] text-[#919EAB] font-normal">(Thứ Hai)</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[13px] text-[#637381] block">Giá</span>
                                        <div className="text-[14px] font-bold text-[#212B36] mt-1">{(detail.price || 10000).toLocaleString('vi-VN')}đ</div>
                                    </div>
                                    <div>
                                        <span className="text-[13px] text-[#637381] block">Trạng thái</span>
                                        <div className="mt-1">
                                            <span className="text-[12px] font-bold px-2.5 py-1 rounded bg-[#E4F8ED] text-[#1CD162]">Đã mua</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    <button className="px-4 py-2 border border-[#E5E8EB] rounded-lg text-[13px] font-bold text-[#1CD162] hover:bg-[#F9FAFB] flex items-center gap-2">
                                        Xem kết quả <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-[#637381] text-[14px]">Không có dữ liệu vé</div>
                    )}
                </div>
            </div>

            {/* Success Banner */}
            {order.status === OrderStatus.PAID && (
                <div className="bg-[#E4F8ED] border border-[#1CD162]/30 rounded-[16px] p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#1CD162] text-white flex items-center justify-center text-[20px] shrink-0">
                            <i className="fa-solid fa-check"></i>
                        </div>
                        <div>
                            <h4 className="text-[#212B36] font-bold text-[15px]">Đơn hàng đã thanh toán thành công!</h4>
                            <p className="text-[#637381] text-[13px] mt-0.5">Vé của bạn đang được chuẩn bị. Vui lòng đến lấy vé đúng giờ hẹn.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
