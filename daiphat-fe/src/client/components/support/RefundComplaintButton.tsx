"use client";

import { useMemo, useState, type MouseEvent } from 'react';
import { RefundRequestResponse } from '../../../types/refund.type';
import {
    DEFAULT_REFUND_COMPLAINT_GRACE_DAYS,
    resolveRefundComplaintEligibility,
    type RefundComplaintEligibilityCode,
} from '../../utils/refundComplaintEligibility.logic';
import { AppToast } from '../../../utils/toast.util';
import { ComplaintFormModal } from './ComplaintFormModal';



interface RefundComplaintButtonProps {
    refund: Pick<RefundRequestResponse, 'id' | 'status' | 'updatedAt'>;
    variant?: 'icon' | 'button';
    className?: string;
}

export const RefundComplaintButton = ({
    refund,
    variant = 'icon',
    className = '',
}: RefundComplaintButtonProps) => {
    const [showModal, setShowModal] = useState(false);

    const eligibility = useMemo(
        () => resolveRefundComplaintEligibility(refund),
        [refund.status, refund.updatedAt]
    );

    const handleClick = (event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();

        if (!eligibility.eligible) {
            AppToast.error(eligibility.message);
            return;
        }

        setShowModal(true);
    };

    const helperText = eligibility.eligible
        ? null
        : eligibility.message;

    if (variant === 'button') {
        return (
            <>
                <div className={`inline-flex flex-col items-start sm:items-end gap-1.5 ${className}`}>
                    <button
                        type="button"
                        onClick={handleClick}
                        aria-label="Gửi khiếu nại"
                        aria-disabled={!eligibility.eligible}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition-all cursor-pointer ${
                            eligibility.eligible
                                ? 'bg-[#ee1314] text-white hover:bg-[#c80f11] border-transparent shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95'
                                : 'bg-[#F4F6F8] text-[#919EAB] border-[#E5E8EB]'
                        }`}
                    >
                        <i className="fa-solid fa-headset text-[12px]"></i>
                        Gửi khiếu nại
                    </button>
                    {helperText && (
                        <div className="bg-[#FFF9F3] border border-[#FFB020]/30 text-[#B76E00] px-3 py-2.5 rounded-xl text-[12px] font-medium leading-relaxed max-w-[280px] mt-1 flex items-start gap-2 shadow-sm text-left">
                            <i className="fa-solid fa-circle-info mt-0.5 text-[#FFB020] shrink-0 text-[13px]"></i>
                            <span>{helperText}</span>
                        </div>
                    )}
                </div>

                <ComplaintFormModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    defaultRefundId={refund.id}
                    defaultCategoryCode={eligibility.categoryCode}
                />
            </>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                title="Gửi khiếu nại"
                aria-label="Gửi khiếu nại"
                aria-disabled={!eligibility.eligible}
                className={`w-8 h-8 shrink-0 rounded-lg border inline-flex items-center justify-center transition-all cursor-pointer ${
                    eligibility.eligible
                        ? 'border-[#ee1314] text-[#ee1314] bg-white hover:bg-[#FFF4F4] hover:scale-105 active:scale-95 shadow-sm'
                        : 'border-[#E5E8EB] text-[#C4CDD5] bg-[#F4F6F8]'
                } ${className}`}
            >
                <i className="fa-solid fa-headset text-[13px]"></i>
            </button>

            <ComplaintFormModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                defaultRefundId={refund.id}
                defaultCategoryCode={eligibility.categoryCode}
            />
        </>
    );
};
