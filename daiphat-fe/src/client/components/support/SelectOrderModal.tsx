import React from 'react';
import { useGetMyOrders } from '../../hooks/useOrder';
import { OrderStatusBadge } from '@/shared/components/StatusBadge';

const ORDER_CANCEL_TYPE_LABELS: Record<string, string> = {
    CUSTOMER_REQUEST: 'Người dùng huỷ',
    ADMIN_FORCE_CANCEL: 'Nhân viên hủy theo yêu cầu từ khách',
    SYSTEM_PAYMENT_TIMEOUT: 'Quá hạn thanh toán',
    OUT_OF_STOCK_INCIDENT: 'Sự cố kho vé'
};

interface SelectOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (orderId: string) => void;
    selectedOrderId?: string;
}

export const SelectOrderModal: React.FC<SelectOrderModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedOrderId,
}) => {
    const { data: ordersData, isLoading } = useGetMyOrders({ page: 1, size: 100 }, isOpen);
    const orders = ordersData?.data?.recordList || [];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[#E5E8EB] bg-white z-10">
                    <h2 className="text-[18px] font-bold text-[#212B36]">Chọn Đơn hàng</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-[#F4F6F8] flex items-center justify-center text-[#637381] cursor-pointer"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 bg-[#F9FAFB]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-[#919EAB]">
                            <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
                            <span className="text-[14px] font-medium">Đang tải danh sách...</span>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-[#919EAB]">
                            <i className="fa-solid fa-box-open text-4xl mb-2 text-[#DFE3E8]"></i>
                            <span className="text-[14px] font-medium">Bạn chưa có đơn hàng nào.</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {orders.map((order) => {
                                const isEligible = (() => {
                                    if (order.complaintEligibility) {
                                        return {
                                            eligible: order.complaintEligibility.eligible,
                                            reason: order.complaintEligibility.message || 'Không đủ điều kiện'
                                        };
                                    }
                                    
                                    // Fallback if complaintEligibility is missing for some reason
                                    if (order.status === 'PENDING_PAYMENT') return { eligible: false, reason: 'Chưa thanh toán' };
                                    if (order.status === 'CANCELLED') {
                                        if (order.cancelType === 'CUSTOMER_REQUEST') return { eligible: false, reason: 'Bạn đã huỷ đơn này' };
                                        if (order.cancelType === 'ADMIN_FORCE_CANCEL') return { eligible: false, reason: 'Nhân viên đã huỷ đơn này' };
                                        if (order.cancelType !== 'SYSTEM_PAYMENT_TIMEOUT' && order.cancelType !== 'OUT_OF_STOCK_INCIDENT') {
                                            return { eligible: false, reason: 'Đơn đã huỷ' };
                                        }
                                    }
                                    return { eligible: true };
                                })();
                                const isSelected = order.id === selectedOrderId;
                                return (
                                    <div
                                        key={order.id}
                                        onClick={() => {
                                            if (!isEligible.eligible) return;
                                            onSelect(order.id);
                                            onClose();
                                        }}
                                        className={`p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 ${
                                            !isEligible.eligible
                                                ? 'bg-[#F9FAFB] border-[#E5E8EB] opacity-60 cursor-not-allowed'
                                                : isSelected
                                                ? 'bg-[#FFF4F4] border-[#ee1314] cursor-pointer'
                                                : 'bg-white border-[#E5E8EB] hover:border-[#ee1314]/50 hover:shadow-sm cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#ee1314]/10 text-[#ee1314]' : 'bg-[#F4F6F8] text-[#637381]'}`}>
                                                <i className="fa-solid fa-file-invoice"></i>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[#212B36] text-[14px]">#{order.id.slice(0, 8).toUpperCase()}</span>
                                                    <OrderStatusBadge status={order.status} />
                                                    {order.status === 'CANCELLED' && order.cancelType && (
                                                        <span className="px-2 py-0.5 bg-[#FFF4F4] text-[#ee1314] text-[10px] font-bold rounded-md uppercase">
                                                            {ORDER_CANCEL_TYPE_LABELS[order.cancelType] || order.cancelType}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[13px] font-semibold text-[#ee1314]">
                                                    {order.totalAmount?.toLocaleString('vi-VN')}đ
                                                </span>
                                                <span className="text-[12px] text-[#919EAB]">
                                                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : ''}
                                                </span>
                                                {!isEligible.eligible && (
                                                    <span className="text-[11px] font-bold text-[#FFB020] mt-1 bg-[#FFF9F3] px-2 py-0.5 rounded w-max">
                                                        {isEligible.reason}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center text-[#ee1314]">
                                            {isSelected ? (
                                                <i className="fa-solid fa-circle-check text-xl"></i>
                                            ) : (
                                                <i className="fa-regular fa-circle text-xl text-[#DFE3E8]"></i>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
