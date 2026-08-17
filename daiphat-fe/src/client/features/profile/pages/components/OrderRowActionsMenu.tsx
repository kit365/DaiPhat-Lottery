"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { OrderResponse, OrderStatus } from '../../../../../types/order.type';
import { canShowRefundRequest } from '../../../../../types/refund.type';
import { ComplaintFormModal } from '../../../../components/support/ComplaintFormModal';
import { PaymentTimeoutComplaintModal } from '../../../../components/payment/PaymentTimeoutComplaintModal';
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

type MenuPos = {
    top: number;
    left: number;
    transform?: string;
};

const MENU_WIDTH = 200;

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
    const [showPaymentTimeoutComplaintModal, setShowPaymentTimeoutComplaintModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [menuPos, setMenuPos] = useState<MenuPos>({ top: 0, left: 0 });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const showRefund = canShowRefundRequest(order, hasPendingRefund);
    const showPayment = order.status === OrderStatus.PENDING_PAYMENT && !!onQuickPayment;
    const isPaymentTimeoutCancellation = order.cancelType === 'SYSTEM_PAYMENT_TIMEOUT';
    const canSubmitPaymentTimeoutComplaint =
        isPaymentTimeoutCancellation && order.status === OrderStatus.CANCELLED;
    const paymentComplaintPending =
        isPaymentTimeoutCancellation && order.status === OrderStatus.PAYMENT_COMPLAINT_PENDING;
    const showGenericComplaint =
        order.status !== OrderStatus.PENDING_PAYMENT && !isPaymentTimeoutCancellation;
    const { data: complaintEligibilityData, isLoading: isLoadingComplaintEligibility } =
        useGetOrderComplaintEligibility(order.id, showGenericComplaint);
    const complaintEligibility = complaintEligibilityData?.data;

    useEffect(() => setMounted(true), []);

    const updatePosition = () => {
        const trigger = triggerRef.current;
        const panel = panelRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const panelHeight = panel?.offsetHeight ?? 180;

        let left = rect.right - MENU_WIDTH;
        left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));

        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < panelHeight + 12 && rect.top > panelHeight + 12;

        if (openUp) {
            setMenuPos({
                top: rect.top - 6,
                left,
                transform: 'translateY(-100%)',
            });
            return;
        }

        setMenuPos({
            top: rect.bottom + 6,
            left,
        });
    };

    useLayoutEffect(() => {
        if (!open) return;

        updatePosition();
        const raf = requestAnimationFrame(updatePosition);

        const onReposition = () => updatePosition();
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onReposition, true);
            window.removeEventListener('resize', onReposition);
        };
    }, [open, showRefund, showPayment, canSubmitPaymentTimeoutComplaint, paymentComplaintPending, showGenericComplaint, isLoadingComplaintEligibility]);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (panelRef.current?.contains(target)) return;
            setOpen(false);
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

    const menuPanel = open ? (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                transform: menuPos.transform,
                width: MENU_WIDTH,
                zIndex: 10000,
            }}
            className="py-1.5 bg-white border border-[#E5E8EB] rounded-xl shadow-[0_8px_24px_rgb(0,0,0,0.12)]"
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

            {canSubmitPaymentTimeoutComplaint && (
                <button
                    type="button"
                    onClick={() => closeAndRun(() => setShowPaymentTimeoutComplaintModal(true))}
                    className="w-full px-4 py-2.5 text-left text-[14px] text-[#ee1314] hover:bg-[#FFF4F4] flex items-center gap-2.5 cursor-pointer transition-colors font-medium"
                >
                    <i className="fa-solid fa-receipt w-4 text-center"></i>
                    Khiếu nại thanh toán
                </button>
            )}

            {paymentComplaintPending && (
                <button
                    type="button"
                    disabled
                    className="w-full px-4 py-2.5 text-left text-[14px] text-[#919EAB] flex items-center gap-2.5 cursor-not-allowed font-medium"
                >
                    <i className="fa-solid fa-clock w-4 text-center"></i>
                    Đang chờ xác minh
                </button>
            )}

            {showGenericComplaint && (
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
    ) : null;

    return (
        <>
            <div className="relative inline-flex">
                <button
                    ref={triggerRef}
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
            </div>

            {mounted && menuPanel ? createPortal(menuPanel, document.body) : null}

            <ComplaintFormModal
                isOpen={showComplaintModal}
                onClose={() => setShowComplaintModal(false)}
                defaultOrderId={order.id}
                defaultCategoryCode={complaintEligibility?.categoryCode || undefined}
                requireEvidence={complaintEligibility?.requiresEvidence}
            />

            <PaymentTimeoutComplaintModal
                isOpen={showPaymentTimeoutComplaintModal}
                orderId={order.id}
                orderCode={order.orderCode}
                amount={order.finalAmount}
                onClose={() => setShowPaymentTimeoutComplaintModal(false)}
            />
        </>
    );
};
