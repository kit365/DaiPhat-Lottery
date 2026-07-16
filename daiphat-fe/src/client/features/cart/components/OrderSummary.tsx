import React from 'react';

interface OrderSummaryProps {
    totalTickets: number;
    totalAmount: number;
    actions: React.ReactNode;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ totalTickets, totalAmount, actions }) => {
    return (
        <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E8EB] flex flex-col overflow-hidden">
            {/* Red Header */}
            <div className="bg-[#cc0000] text-white px-5 py-4 flex items-center relative overflow-hidden">
                <h3 className="font-bold text-[16px] uppercase relative z-10">Tóm tắt đơn hàng</h3>
                <div className="absolute top-0 right-0 h-full w-32 overflow-hidden pointer-events-none">
                    <i className="fa-solid fa-certificate text-[120px] text-white/10 absolute -right-6 -top-8"></i>
                </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
                <div className="space-y-4 mb-5 text-[14px]">
                    <div className="flex justify-between items-center text-[#637381]">
                        <span>Số lượng vé</span>
                        <span className="text-[#212B36] font-bold">{totalTickets} vé</span>
                    </div>
                    <div className="flex justify-between items-center text-[#637381]">
                        <span>Tạm tính</span>
                        <span className="text-[#ee1314] font-bold">{totalAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                </div>

                <div className="border-t border-dashed border-[#E5E8EB] -mx-6 mb-5"></div>

                <div className="flex justify-between items-center mb-6">
                    <span className="text-[14px] font-bold text-[#212B36] uppercase">Tổng thanh toán</span>
                    <span className="text-[24px] font-black text-[#ee1314] leading-none">{totalAmount.toLocaleString('vi-VN')}đ</span>
                </div>

                <div className="mt-auto flex flex-col gap-3">
                    {actions}
                </div>
            </div>
        </div>
    );
};

export default OrderSummary;
