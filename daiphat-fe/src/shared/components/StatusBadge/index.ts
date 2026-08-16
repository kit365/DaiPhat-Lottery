/** Badge đơn hàng dùng chung admin + client. Admin badge khác (ticket, supplier…) → AdminStatusBadge. */
export { StatusBadge, type StatusBadgeProps } from './StatusBadge';
export { OrderStatusBadge, type OrderStatusBadgeProps } from './OrderStatusBadge';
export { OrderDetailStatusBadge, type OrderDetailStatusBadgeProps } from './OrderDetailStatusBadge';
export {
    ORDER_STATUS_BADGE,
    getOrderStatusBadge,
    getOrderStatusAdminBadgeModifier,
    type OrderStatusBadge as OrderStatusBadgeTone,
} from './orderStatusMap';
export type { StatusBadgeTone } from './statusBadge.types';
