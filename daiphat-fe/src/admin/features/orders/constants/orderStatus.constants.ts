import { OrderStatus } from '@/types/order.type';
import { ORDER_STATUS_BADGE } from '@/shared/components/StatusBadge/orderStatusMap';

import type { OrderStatusBadge, OrderStatusTab } from '../types/orderStatus.type';

export type { OrderStatusBadge, OrderStatusTab };
export { ORDER_STATUS_BADGE };

export const ORDER_STATUS_TABS: OrderStatusTab[] = [
    {
        value: 'all',
        label: 'Tất cả',
        color: 'var(--palette-common-white, #FFFFFF)',
        bg: 'var(--palette-grey-800, #1C252E)',
        activeColor: 'var(--palette-common-white, #FFFFFF)',
        activeBg: 'var(--palette-grey-800, #1C252E)',
    },
    {
        value: 'NEED_PROCESSING',
        label: 'Cần xử lý',
        color: 'var(--palette-warning-dark, #B76E00)',
        bg: 'var(--palette-warning-lighter, #FFF5CC)',
        activeColor: 'var(--palette-warning-contrastText, #1C252E)',
        activeBg: 'var(--palette-warning-main, #FFAB00)',
    },
    { value: OrderStatus.PENDING_PAYMENT, ...ORDER_STATUS_BADGE[OrderStatus.PENDING_PAYMENT] },
    { value: OrderStatus.PAID, ...ORDER_STATUS_BADGE[OrderStatus.PAID] },
    { value: OrderStatus.PENDING_PICKUP, ...ORDER_STATUS_BADGE[OrderStatus.PENDING_PICKUP] },
    { value: OrderStatus.COMPLETED, ...ORDER_STATUS_BADGE[OrderStatus.COMPLETED] },
    { value: OrderStatus.CANCELLED, ...ORDER_STATUS_BADGE[OrderStatus.CANCELLED] },
];

