import { OrderStatus } from '../../types/order.type';

const SUCCESSFUL_PAYMENT_STATUSES: OrderStatus[] = [
    OrderStatus.PAID,
    OrderStatus.PREPARING,
    OrderStatus.PENDING_PICKUP,
    OrderStatus.COMPLETED,
];

export const isOrderPaymentSuccessful = (status?: string | null): boolean =>
    !!status && SUCCESSFUL_PAYMENT_STATUSES.includes(status as OrderStatus);

export const isOrderPaymentCancelled = (status?: string | null): boolean =>
    status === OrderStatus.CANCELLED;

export const isOrderAwaitingPayment = (status?: string | null): boolean =>
    status === OrderStatus.PENDING_PAYMENT;
