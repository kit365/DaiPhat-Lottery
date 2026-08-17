"use client";

import { useState, type MouseEvent } from 'react';
import { useGetOrderComplaintEligibility } from '../../hooks/useSupportTicket';
import { AppToast } from '../../../utils/toast.util';
import { ComplaintFormModal } from './ComplaintFormModal';

interface OrderComplaintButtonProps {
    orderId: string;
    variant?: 'icon' | 'button' | 'outline';
    className?: string;
    showHelperText?: boolean;
}

export const OrderComplaintButton = ({
    orderId,
    variant = 'button',
    className = '',
    showHelperText = true,
}: OrderComplaintButtonProps) => {
    const [showModal, setShowModal] = useState(false);
    const { data, isLoading } = useGetOrderComplaintEligibility(orderId);
    const eligibility = data?.data;

    const eligible = eligibility?.eligible === true;
    const helperText =
        !isLoading && eligibility && !eligibility.eligible ? eligibility.message : null;

    const handleClick = (event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();

        if (isLoading) {
            return;
        }
        if (!eligible) {
            AppToast.error(eligibility?.message || 'Đơn hàng chưa đủ điều kiện gửi khiếu nại.');
            return;
        }
        setShowModal(true);
    };

    const ctaClassName =
        variant === 'outline'
            ? eligible
                ? 'bg-white text-[#ee1314] border-[#ee1314]/35 hover:bg-[#FFF4F4]'
                : 'bg-white text-[#919EAB] border-[#E5E8EB]'
            : eligible
              ? 'bg-[#ee1314] text-white hover:bg-[#c80f11] border-transparent shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95'
              : 'bg-[#F4F6F8] text-[#919EAB] border-[#E5E8EB]';

    if (variant === 'icon') {
        return (
            <>
                <button
                    type="button"
                    onClick={handleClick}
                    title="Gửi khiếu nại"
                    aria-label="Gửi khiếu nại"
                    aria-disabled={!eligible || isLoading}
                    className={`w-8 h-8 shrink-0 rounded-lg border inline-flex items-center justify-center transition-all cursor-pointer ${
                        eligible
                            ? 'border-[#ee1314] text-[#ee1314] bg-white hover:bg-[#FFF4F4] hover:scale-105 active:scale-95 shadow-sm'
                            : 'border-[#E5E8EB] text-[#C4CDD5] bg-[#F4F6F8]'
                    } ${className}`}
                >
                    {isLoading ? (
                        <i className="fa-solid fa-spinner fa-spin text-[12px]"></i>
                    ) : (
                        <i className="fa-solid fa-headset text-[13px]"></i>
                    )}
                </button>
                <ComplaintFormModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    defaultOrderId={orderId}
                    defaultCategoryCode={eligibility?.categoryCode || undefined}
                    requireEvidence={eligibility?.requiresEvidence}
                />
            </>
        );
    }

    return (
        <>
            <div className={`inline-flex flex-col items-start sm:items-end gap-1.5 ${className}`}>
                <button
                    type="button"
                    onClick={handleClick}
                    aria-label="Gửi khiếu nại"
                    aria-disabled={!eligible || isLoading}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition-all cursor-pointer ${ctaClassName}`}
                >
                    {isLoading ? (
                        <i className="fa-solid fa-spinner fa-spin text-[12px]"></i>
                    ) : (
                        <i className="fa-solid fa-headset text-[12px]"></i>
                    )}
                    Gửi khiếu nại
                </button>
                {showHelperText && helperText && (
                    <div className="bg-[#FFF9F3] border border-[#FFB020]/30 text-[#B76E00] px-3 py-2.5 rounded-xl text-[12px] font-medium leading-relaxed max-w-[320px] mt-1 flex items-start gap-2 shadow-sm text-left">
                        <i className="fa-solid fa-circle-info mt-0.5 text-[#FFB020] shrink-0 text-[13px]"></i>
                        <span>{helperText}</span>
                    </div>
                )}
            </div>

            <ComplaintFormModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                defaultOrderId={orderId}
                defaultCategoryCode={eligibility?.categoryCode || undefined}
                requireEvidence={eligibility?.requiresEvidence}
            />
        </>
    );
};
