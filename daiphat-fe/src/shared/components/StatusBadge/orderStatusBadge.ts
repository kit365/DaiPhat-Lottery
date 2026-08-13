import { OrderStatus } from '@/types/order.type';

import type { StatusBadgeTone } from './statusBadge.types';

export type { StatusBadgeTone as OrderStatusBadge };

export const ORDER_STATUS_BADGE: Record<string, StatusBadgeTone> = {
    [OrderStatus.PENDING_PAYMENT]: {
        label: 'Chờ thanh toán',
        color: 'var(--palette-warning-dark, #B76E00)',
        bg: 'var(--palette-warning-lighter, #FFF5CC)',
        activeColor: 'var(--palette-warning-contrastText, #1C252E)',
        activeBg: 'var(--palette-warning-main, #FFAB00)',
    },
    [OrderStatus.PAID]: {
        label: 'Đã thanh toán',
        color: 'var(--palette-info-dark, #006C9C)',
        bg: 'var(--palette-info-lighter, #CAFDF5)',
        activeColor: 'var(--palette-info-contrastText, #FFFFFF)',
        activeBg: 'var(--palette-info-main, #00B8D9)',
    },
    [OrderStatus.PREPARING]: {
        label: 'Đang chuẩn bị',
        color: '#1A237E',
        bg: '#E8EAF6',
        activeColor: '#FFFFFF',
        activeBg: '#3F51B5',
    },
    [OrderStatus.PENDING_PICKUP]: {
        label: 'Chờ nhận vé',
        color: '#6B21A8',
        bg: '#F3E8FF',
        activeColor: '#FFFFFF',
        activeBg: '#9C27B0',
    },
    [OrderStatus.COMPLETED]: {
        label: 'Hoàn thành',
        color: 'var(--palette-success-dark, #118D57)',
        bg: 'var(--palette-success-lighter, #D3FCD2)',
        activeColor: 'var(--palette-success-contrastText, #FFFFFF)',
        activeBg: 'var(--palette-success-main, #22C55E)',
    },
    [OrderStatus.CANCELLED]: {
        label: 'Đã huỷ',
        color: 'var(--palette-error-dark, #B71D18)',
        bg: 'var(--palette-error-lighter, #FFE9D5)',
        activeColor: 'var(--palette-error-contrastText, #FFFFFF)',
        activeBg: 'var(--palette-error-main, #FF5630)',
    },
};

const FALLBACK: StatusBadgeTone = {
    label: '—',
    color: 'var(--palette-text-disabled, #919EAB)',
    bg: 'var(--palette-action-selected, rgba(145, 158, 171, 0.16))',
    activeColor: 'var(--palette-common-white, #FFFFFF)',
    activeBg: 'var(--palette-grey-800, #1C252E)',
};

export const getOrderStatusBadge = (status?: string | null): StatusBadgeTone => {
    if (!status) return FALLBACK;
    return ORDER_STATUS_BADGE[status] || { ...FALLBACK, label: status };
};
