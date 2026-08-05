import { useMemo, useState, type MouseEvent } from 'react';
import { PrizePayoutRequestResponse } from '../../../types/prize-payout.type';
import {
    DEFAULT_PRIZE_PAYOUT_COMPLAINT_GRACE_DAYS,
    DEFAULT_PRIZE_PAYOUT_COMPLAINT_WAIT_HOURS,
    resolvePrizePayoutComplaintEligibility,
} from '../../utils/prizePayoutComplaintEligibility.logic';
import { usePublicSystemConfig } from '../../hooks/useSystemConfig';
import { ComplaintFormModal } from './ComplaintFormModal';

interface PrizePayoutComplaintButtonProps {
    payout: Pick<PrizePayoutRequestResponse, 'id' | 'status' | 'updatedAt' | 'completedAt'>;
    variant?: 'icon' | 'button';
    className?: string;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const PrizePayoutComplaintButton = ({
    payout,
    variant = 'icon',
    className = '',
}: PrizePayoutComplaintButtonProps) => {
    const [showModal, setShowModal] = useState(false);
    const { data: waitHoursConfig } = usePublicSystemConfig('PRIZE_PAYOUT_COMPLAINT_PROCESSING_WAIT_HOURS');
    const { data: graceDaysConfig } = usePublicSystemConfig('PRIZE_PAYOUT_COMPLAINT_GRACE_DAYS');

    const waitHours = parsePositiveInt(waitHoursConfig?.configValue, DEFAULT_PRIZE_PAYOUT_COMPLAINT_WAIT_HOURS);
    const graceDays = parsePositiveInt(graceDaysConfig?.configValue, DEFAULT_PRIZE_PAYOUT_COMPLAINT_GRACE_DAYS);

    const eligibility = useMemo(
        () => resolvePrizePayoutComplaintEligibility(payout, { waitHours, graceDays }),
        [payout.status, payout.updatedAt, payout.completedAt, waitHours, graceDays]
    );

    // Hide CTA entirely whenever complaint is not currently allowed.
    if (!eligibility.eligible) {
        return null;
    }

    const handleClick = (event: MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        setShowModal(true);
    };

    const ctaLabel = 'Khiếu nại giao dịch này';

    if (variant === 'button') {
        return (
            <>
                <div className={`inline-flex flex-col items-start sm:items-end gap-1.5 ${className}`}>
                    <button
                        type="button"
                        onClick={handleClick}
                        aria-label={ctaLabel}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition-all cursor-pointer ${
                            'bg-[#ee1314] text-white hover:bg-[#c80f11] border-transparent shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95'
                        }`}
                    >
                        <i className="fa-solid fa-headset text-[12px]"></i>
                        {ctaLabel}
                    </button>
                </div>

                <ComplaintFormModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    defaultPrizePayoutId={payout.id}
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
                title={ctaLabel}
                aria-label={ctaLabel}
                className={`w-8 h-8 shrink-0 rounded-lg border inline-flex items-center justify-center transition-all cursor-pointer ${
                    'border-[#ee1314] text-[#ee1314] bg-white hover:bg-[#FFF4F4] hover:scale-105 active:scale-95 shadow-sm'
                } ${className}`}
            >
                <i className="fa-solid fa-headset text-[13px]"></i>
            </button>

            <ComplaintFormModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                defaultPrizePayoutId={payout.id}
                defaultCategoryCode={eligibility.categoryCode}
            />
        </>
    );
};
