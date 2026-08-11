import { OrderStatus } from '@/types/order.type';

import type { OrderStatusBadge, OrderStatusTab } from '../types/orderStatus.type';

export type { OrderStatusBadge, OrderStatusTab };

export const ORDER_STATUS_BADGE: Record<string, OrderStatusBadge> = {
    [OrderStatus.PENDING_PAYMENT]: {
        label: 'Chờ thanh toán',
        color: 'var(--palette-warning-dark)',
        bg: 'var(--palette-warning-lighter)',
        activeColor: 'var(--palette-warning-contrastText)',
        activeBg: 'var(--palette-warning-main)',
    },
    [OrderStatus.PAID]: {
        label: 'Đã thanh toán',
        color: 'var(--palette-info-dark)',
        bg: 'var(--palette-info-lighter)',
        activeColor: 'var(--palette-info-contrastText)',
        activeBg: 'var(--palette-info-main)',
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
        color: 'var(--palette-success-dark)',
        bg: 'var(--palette-success-lighter)',
        activeColor: 'var(--palette-success-contrastText)',
        activeBg: 'var(--palette-success-main)',
    },
    [OrderStatus.CANCELLED]: {
        label: 'Đã huỷ',
        color: 'var(--palette-error-dark)',
        bg: 'var(--palette-error-lighter)',
        activeColor: 'var(--palette-error-contrastText)',
        activeBg: 'var(--palette-error-main)',
    },
};

export const ORDER_STATUS_TABS: OrderStatusTab[] = [
    {
        value: 'all',
        label: 'Tất cả',
        color: 'var(--palette-common-white)',
        bg: 'var(--palette-grey-800)',
        activeColor: 'var(--palette-common-white)',
        activeBg: 'var(--palette-grey-800)',
    },
    ...[
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        OrderStatus.PREPARING,
        OrderStatus.PENDING_PICKUP,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
    ].map((value) => ({ value, ...ORDER_STATUS_BADGE[value] })),
];
