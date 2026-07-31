import { PrizePayoutRequestStatus } from '../../../../types/prize-payout.type';

export type PrizePayoutStatusBadge = {
    label: string;
    color: string;
    bg: string;
    activeColor: string;
    activeBg: string;
};

export type PrizePayoutStatusTab = PrizePayoutStatusBadge & { value: string };

export const PRIZE_PAYOUT_STATUS_BADGE: Record<PrizePayoutRequestStatus, PrizePayoutStatusBadge> = {
    [PrizePayoutRequestStatus.PENDING]: {
        label: 'Cần xử lý',
        color: 'var(--palette-warning-dark)',
        bg: 'var(--palette-warning-lighter)',
        activeColor: 'var(--palette-warning-contrastText)',
        activeBg: 'var(--palette-warning-main)',
    },
    [PrizePayoutRequestStatus.COMPLETED]: {
        label: 'Đã chuyển',
        color: 'var(--palette-success-dark)',
        bg: 'var(--palette-success-lighter)',
        activeColor: 'var(--palette-success-contrastText)',
        activeBg: 'var(--palette-success-main)',
    },
    [PrizePayoutRequestStatus.REJECTED]: {
        label: 'Từ chối',
        color: 'var(--palette-error-dark)',
        bg: 'var(--palette-error-lighter)',
        activeColor: 'var(--palette-error-contrastText)',
        activeBg: 'var(--palette-error-main)',
    },
    [PrizePayoutRequestStatus.CANCELLED]: {
        label: 'Đã hủy',
        color: 'var(--palette-text-secondary)',
        bg: 'var(--palette-background-neutral)',
        activeColor: 'var(--palette-common-white)',
        activeBg: 'var(--palette-grey-600)',
    },
};

export const PRIZE_PAYOUT_ALL_TAB: PrizePayoutStatusTab = {
    value: '',
    label: 'Tất cả',
    color: 'var(--palette-common-white)',
    bg: 'var(--palette-grey-800)',
    activeColor: 'var(--palette-common-white)',
    activeBg: 'var(--palette-grey-800)',
};

export const PRIZE_PAYOUT_STATUS_TABS: PrizePayoutStatusTab[] = [
    { value: PrizePayoutRequestStatus.PENDING, ...PRIZE_PAYOUT_STATUS_BADGE[PrizePayoutRequestStatus.PENDING] },
    { value: PrizePayoutRequestStatus.COMPLETED, ...PRIZE_PAYOUT_STATUS_BADGE[PrizePayoutRequestStatus.COMPLETED] },
    { value: PrizePayoutRequestStatus.REJECTED, ...PRIZE_PAYOUT_STATUS_BADGE[PrizePayoutRequestStatus.REJECTED] },
    { value: PrizePayoutRequestStatus.CANCELLED, ...PRIZE_PAYOUT_STATUS_BADGE[PrizePayoutRequestStatus.CANCELLED] },
    PRIZE_PAYOUT_ALL_TAB,
];
