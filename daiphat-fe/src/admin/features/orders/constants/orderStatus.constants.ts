import { OrderStatus } from '@/types/order.type';
import { ORDER_STATUS_BADGE } from '@/shared/components/StatusBadge';

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
    ...[
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        OrderStatus.PREPARING,
        OrderStatus.PENDING_PICKUP,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
    ].map((value) => ({ value, ...ORDER_STATUS_BADGE[value] })),
];
