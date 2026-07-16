import { useMemo, useState, type MouseEvent } from 'react';
import { RefundRequestResponse } from '../../../types/refund.type';
import { resolveRefundComplaintEligibility } from '../../utils/refundComplaintEligibility.logic';
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

    const title = eligibility.eligible
        ? 'Gửi khiếu nại'
        : eligibility.message;

    if (variant === 'button') {
        return (
            <>
                <button
                    type="button"
                    onClick={handleClick}
                    title={title}
                    aria-label="Gửi khiếu nại"
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition-all cursor-pointer ${
                        eligibility.eligible
                            ? 'border-[#ee1314] text-[#ee1314] bg-white hover:bg-[#FFF4F4]'
                            : 'border-[#E5E8EB] text-[#919EAB] bg-[#F9FAFB] opacity-70'
                    } ${className}`}
                >
                    <i className="fa-solid fa-headset text-[12px]"></i>
                    Gửi khiếu nại
                </button>

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
                title={title}
                aria-label="Gửi khiếu nại"
                className={`w-8 h-8 shrink-0 rounded-lg border inline-flex items-center justify-center transition-all cursor-pointer ${
                    eligibility.eligible
                        ? 'border-[#E5E8EB] text-[#919EAB] hover:text-[#ee1314] hover:border-[#ee1314] hover:bg-[#FFF4F4]'
                        : 'border-[#E5E8EB] text-[#C4CDD5] bg-[#F9FAFB] opacity-70'
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
