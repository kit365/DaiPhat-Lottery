import { useEffect, useRef, useState } from 'react';
import { OrderResponse, OrderStatus } from '../../../../../types/order.type';
import { canShowRefundRequest } from '../../../../../types/refund.type';
import { ComplaintFormModal } from '../../../../components/support/ComplaintFormModal';
import { useGetOrderComplaintEligibility } from '../../../../hooks/useSupportTicket';
import { AppToast } from '../../../../../utils/toast.util';

interface OrderRowActionsMenuProps {
    order: OrderResponse;
    hasPendingRefund: boolean;
    isPaying?: boolean;
    onViewDetail: () => void;
    onRequestRefund: () => void;
    onQuickPayment?: () => void;
}

export const OrderRowActionsMenu = ({
    order,
    hasPendingRefund,
    isPaying,
    onViewDetail,
    onRequestRefund,
    onQuickPayment,
}: OrderRowActionsMenuProps) => {
    const [open, setOpen] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const showRefund = canShowRefundRequest(order, hasPendingRefund);
    const showPayment = order.status === OrderStatus.PENDING_PAYMENT && !!onQuickPayment;
    const showComplaint = order.status !== OrderStatus.PENDING_PAYMENT;
    const { data: complaintEligibilityData, isLoading: isLoadingComplaintEligibility } =
        useGetOrderComplaintEligibility(order.id, showComplaint);
    const complaintEligibility = complaintEligibilityData?.data;

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const closeAndRun = (action: () => void) => {
        setOpen(false);
        action();
    };

    return (
        <div className="relative inline-flex" ref={menuRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((prev) => !prev);
                }}
                className="w-8 h-8 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#637381] hover:text-[#212B36] hover:border-[#919EAB] hover:bg-[#F4F6F8] transition-all cursor-pointer"
                title="Thao tác"
                aria-label="Mở menu thao tác"
                aria-expanded={open}
            >
                <i className="fa-solid fa-ellipsis-vertical text-[14px]"></i>
            </button>

            {open && (
                <div
                    className="absolute right-0 top-full mt-1.5 z-20 min-w-[200px] py-1.5 bg-white border border-[#E5E8EB] rounded-xl shadow-[0_8px_24px_rgb(0,0,0,0.12)]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => closeAndRun(onViewDetail)}
                        className="w-full px-4 py-2.5 text-left text-[14px] text-[#212B36] hover:bg-[#F4F6F8] flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                        <i className="fa-regular fa-eye text-[#637381] w-4 text-center"></i>
                        Xem chi tiết
                    </button>

                    {showRefund && (
                        <button
                            type="button"
                            onClick={() => closeAndRun(onRequestRefund)}
                            className="w-full px-4 py-2.5 text-left text-[14px] text-[#ee1314] hover:bg-[#FFF4F4] flex items-center gap-2.5 cursor-pointer transition-colors font-medium"
                        >
                            <i className="fa-solid fa-rotate-left w-4 text-center"></i>
                            Yêu cầu hoàn tiền
                        </button>
                    )}

                    {showPayment && (
                        <button
                            type="button"
                            disabled={isPaying}
                            onClick={() => closeAndRun(onQuickPayment!)}
                            className="w-full px-4 py-2.5 text-left text-[14px] text-[#ee1314] hover:bg-[#FFF4F4] flex items-center gap-2.5 cursor-pointer transition-colors font-medium disabled:opacity-50"
                        >
                            {isPaying ? (
                                <i className="fa-solid fa-spinner fa-spin w-4 text-center"></i>
                            ) : (
                                <i className="fa-solid fa-credit-card w-4 text-center"></i>
                            )}
                            Thanh toán ngay
                        </button>
                    )}

                    {showComplaint && (
                        <button
                            type="button"
                            disabled={isLoadingComplaintEligibility}
                            onClick={() =>
                                closeAndRun(() => {
                                    if (!complaintEligibility?.eligible) {
                                        AppToast.error(
                                            complaintEligibility?.message ||
                                                'Đơn hàng chưa đủ điều kiện gửi khiếu nại.'
                                        );
                                        return;
                                    }
                                    setShowComplaintModal(true);
                                })
                            }
                            className={`w-full px-4 py-2.5 text-left text-[14px] flex items-center gap-2.5 cursor-pointer transition-colors font-medium ${
                                complaintEligibility?.eligible
                                    ? 'text-[#ee1314] hover:bg-[#FFF4F4]'
                                    : 'text-[#919EAB] hover:bg-[#F4F6F8]'
                            }`}
                        >
                            {isLoadingComplaintEligibility ? (
                                <i className="fa-solid fa-spinner fa-spin w-4 text-center"></i>
                            ) : (
                                <i className="fa-solid fa-headset w-4 text-center"></i>
                            )}
                            Gửi khiếu nại
                        </button>
                    )}
                </div>
            )}

            <ComplaintFormModal
                isOpen={showComplaintModal}
                onClose={() => setShowComplaintModal(false)}
                defaultOrderId={order.id}
                defaultCategoryCode={complaintEligibility?.categoryCode || undefined}
                requireEvidence={complaintEligibility?.requiresEvidence}
            />
        </div>
    );
};
