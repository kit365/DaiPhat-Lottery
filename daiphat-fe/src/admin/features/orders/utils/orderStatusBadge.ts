import { ORDER_STATUS_BADGE } from '../constants/orderStatus.constants';
import type { OrderStatusBadge } from '../types/orderStatus.type';

const FALLBACK: OrderStatusBadge = {
    label: '—',
    color: 'var(--palette-text-disabled)',
    bg: 'var(--palette-background-neutral)',
    activeColor: 'var(--palette-common-white)',
    activeBg: 'var(--palette-grey-800)',
};

export const getOrderStatusBadge = (status?: string): OrderStatusBadge => {
    if (!status) return FALLBACK;
    return ORDER_STATUS_BADGE[status] || { ...FALLBACK, label: status };
};
