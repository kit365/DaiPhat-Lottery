import { OrderStatus } from '../../types/order.type';

export function normalizeOrderStatus(status: unknown): OrderStatus | null {
    if (status == null) return null;

    const raw =
        typeof status === 'object' && status !== null && 'value' in status
            ? String((status as { value: string }).value)
            : String(status);

    const normalized = raw.trim().toUpperCase();
    return (Object.values(OrderStatus) as string[]).includes(normalized)
        ? (normalized as OrderStatus)
        : null;
}

export function isOrderPreparing(status: unknown): boolean {
    return normalizeOrderStatus(status) === OrderStatus.PREPARING;
}

export function isOrderPaid(status: unknown): boolean {
    return normalizeOrderStatus(status) === OrderStatus.PAID;
}
