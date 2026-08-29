import React from 'react';
import { PrizePayoutRequestStatus, PRIZE_PAYOUT_STATUS_MAP } from '../../../types/prize-payout.type';
import { StatusBadge } from '@/shared/components/StatusBadge';

const PRIZE_PAYOUT_STATUS_TONES: Record<PrizePayoutRequestStatus, { label: string; color: string; bg: string }> = {
    [PrizePayoutRequestStatus.PENDING]: { label: 'Cần xử lý', color: '#B76E00', bg: '#FFF9F3' },
    [PrizePayoutRequestStatus.APPROVED]: { label: 'Đã duyệt', color: '#175CD3', bg: '#EFF8FF' },
    [PrizePayoutRequestStatus.COMPLETED]: { label: 'Đã chuyển', color: '#118D57', bg: '#E4F8ED' },
    [PrizePayoutRequestStatus.REJECTED]: { label: 'Từ chối', color: '#ee1314', bg: '#FFF4F4' },
    [PrizePayoutRequestStatus.MANUAL_RESOLUTION]: { label: 'Cần xử lý tại đại lý', color: '#C62828', bg: '#FFF5F5' },
    [PrizePayoutRequestStatus.CANCELLED]: { label: 'Đã hủy', color: '#637381', bg: '#F4F6F8' },
    [PrizePayoutRequestStatus.AWAITING_FUND]: { label: 'Chờ quỹ', color: '#B76E00', bg: '#FFF9F3' },
};

interface PrizePayoutStatusBadgeProps {
    status: PrizePayoutRequestStatus;
    className?: string;
}

export const PrizePayoutStatusBadge: React.FC<PrizePayoutStatusBadgeProps> = ({ status, className = '' }) => {
    const fromMap = PRIZE_PAYOUT_STATUS_MAP[status];
    const tone = PRIZE_PAYOUT_STATUS_TONES[status] || {
        label: fromMap?.label || status,
        color: '#637381',
        bg: '#F4F6F8',
    };

    return (
        <StatusBadge
            label={tone.label}
            color={tone.color}
            bg={tone.bg}
            className={className}
        />
    );
};
