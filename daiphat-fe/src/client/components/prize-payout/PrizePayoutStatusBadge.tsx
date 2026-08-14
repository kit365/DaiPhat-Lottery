import React from 'react';
import { PrizePayoutRequestStatus, PRIZE_PAYOUT_STATUS_MAP } from '../../../types/prize-payout.type';

interface PrizePayoutStatusBadgeProps {
    status: PrizePayoutRequestStatus;
    className?: string;
}

export const PrizePayoutStatusBadge: React.FC<PrizePayoutStatusBadgeProps> = ({ status, className = '' }) => {
    const config = PRIZE_PAYOUT_STATUS_MAP[status] || {
        label: status,
        bg: 'bg-[#F4F6F8]',
        text: 'text-[#637381]',
    };

    return (
        <span
            className={`status-badge inline-flex items-center justify-center h-6 ${config.bg} ${config.text} px-2.5 rounded-md text-[12px] font-medium leading-none ${className}`}
        >
            {config.label}
        </span>
    );
};
