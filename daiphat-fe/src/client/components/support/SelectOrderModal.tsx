import React from 'react';
import { useGetMyOrders } from '../../hooks/useOrder';

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
    const { data: ordersData, isLoading } = useGetMyOrders({ page: 1, limit: 100 }, isOpen);
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
                                const isSelected = order.id === selectedOrderId;
                                return (
                                    <div
                                        key={order.id}
                                        onClick={() => {
                                            onSelect(order.id);
                                            onClose();
                                        }}
                                        className={`p-4 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-4 ${isSelected ? 'bg-[#FFF4F4] border-[#ee1314]' : 'bg-white border-[#E5E8EB] hover:border-[#ee1314]/50 hover:shadow-sm'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#ee1314]/10 text-[#ee1314]' : 'bg-[#F4F6F8] text-[#637381]'}`}>
                                                <i className="fa-solid fa-file-invoice"></i>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[#212B36] text-[14px]">#{order.id.slice(0, 8).toUpperCase()}</span>
                                                    <span className="px-2 py-0.5 bg-[#F4F6F8] text-[#454F5B] text-[10px] font-bold rounded-md uppercase">
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <span className="text-[13px] font-semibold text-[#ee1314]">
                                                    {order.totalAmount?.toLocaleString('vi-VN')}đ
                                                </span>
                                                <span className="text-[12px] text-[#919EAB]">
                                                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : ''}
                                                </span>
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
