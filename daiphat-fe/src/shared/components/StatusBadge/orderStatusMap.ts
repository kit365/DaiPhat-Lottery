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
        color: 'var(--palette-warning-dark, #B76E00)',
        bg: 'var(--palette-warning-lighter, #FFF5CC)',
        activeColor: 'var(--palette-warning-contrastText, #1C252E)',
        activeBg: 'var(--palette-warning-main, #FFAB00)',
    },
    [OrderStatus.PENDING_PICKUP]: {
        label: 'Chờ nhận vé',
        color: 'var(--palette-info-dark, #006C9C)',
        bg: 'var(--palette-info-lighter, #CAFDF5)',
        activeColor: 'var(--palette-info-contrastText, #FFFFFF)',
        activeBg: 'var(--palette-info-main, #00B8D9)',
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
    [OrderStatus.PAYMENT_COMPLAINT_PENDING]: {
        label: 'Chờ xác minh thanh toán',
        color: 'var(--palette-warning-dark, #B76E00)',
        bg: 'var(--palette-warning-lighter, #FFF5CC)',
        activeColor: 'var(--palette-warning-contrastText, #1C252E)',
        activeBg: 'var(--palette-warning-main, #FFAB00)',
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

export const getOrderStatusAdminBadgeModifier = (status?: string | null): string => {
    switch (status) {
        case OrderStatus.PENDING_PAYMENT:
        case OrderStatus.PREPARING:
            return 'admin-status-badge--pending';
        case OrderStatus.PAID:
        case OrderStatus.PENDING_PICKUP:
            return 'admin-status-badge--active';
        case OrderStatus.COMPLETED:
            return 'admin-status-badge--success';
        case OrderStatus.CANCELLED:
            return 'admin-status-badge--inactive';
        case OrderStatus.PAYMENT_COMPLAINT_PENDING:
            return 'admin-status-badge--pending';
        default:
            return '';
    }
};
