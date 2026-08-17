import { PrizePayoutRequestStatus } from '@/types/prize-payout.type';
import { PRIZE_PAYOUT_STATUS_BADGE } from '../constants/prizePayoutStatus.constants';

export const getPrizePayoutStatusLabel = (status?: PrizePayoutRequestStatus | string) => {
    if (!status) return '—';
    const config = PRIZE_PAYOUT_STATUS_BADGE[status as PrizePayoutRequestStatus];
    return config?.label ?? String(status);
};

export const getPrizePayoutStatusBadgeClass = (status?: PrizePayoutRequestStatus | string) => {
    switch (status) {
        case PrizePayoutRequestStatus.PENDING:
            return 'admin-status-badge--pending';
        case PrizePayoutRequestStatus.APPROVED:
            return 'admin-status-badge--active';
        case PrizePayoutRequestStatus.COMPLETED:
            return 'admin-status-badge--success';
        case PrizePayoutRequestStatus.REJECTED:
        case PrizePayoutRequestStatus.MANUAL_RESOLUTION:
            return 'admin-status-badge--inactive';
        case PrizePayoutRequestStatus.CANCELLED:
            return 'admin-status-badge--draft';
        default:
            return 'admin-status-badge--draft';
    }
};
