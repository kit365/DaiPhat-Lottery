import { TransactionResponse } from './transaction.type';

export enum OrderReceiveType {
    COUNTER_PICKUP = 'COUNTER_PICKUP'
}

export enum OrderStatus {
    PENDING_PAYMENT = 'PENDING_PAYMENT',
    PAID = 'PAID',
    PREPARING = 'PREPARING',
    PENDING_PICKUP = 'PENDING_PICKUP',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum OrderType {
    DIRECT = 'DIRECT',
    ONLINE = 'ONLINE'
}

export enum OrderDetailStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    REFUND_PENDING = 'REFUND_PENDING',
    REFUNDED = 'REFUNDED'
}

export const ORDER_DETAIL_STATUS_LABELS: Record<OrderDetailStatus, string> = {
    [OrderDetailStatus.ACTIVE]: 'Đang hiệu lực',
    [OrderDetailStatus.INACTIVE]: 'Không còn hiệu lực',
    [OrderDetailStatus.REFUND_PENDING]: 'Chờ hoàn tiền',
    [OrderDetailStatus.REFUNDED]: 'Đã hoàn tiền',
};

export const ORDER_DETAIL_STATUS_BADGE: Record<
    OrderDetailStatus,
    { label: string; bg: string; text: string; color?: string; bgcolor?: string }
> = {
    [OrderDetailStatus.ACTIVE]: {
        label: ORDER_DETAIL_STATUS_LABELS[OrderDetailStatus.ACTIVE],
        bg: 'bg-[#E4F8ED]',
        text: 'text-[#1CD162]',
        color: 'var(--palette-success-dark)',
        bgcolor: 'var(--palette-success-lighter)',
    },
    [OrderDetailStatus.INACTIVE]: {
        label: ORDER_DETAIL_STATUS_LABELS[OrderDetailStatus.INACTIVE],
        bg: 'bg-[#F4F6F8]',
        text: 'text-[#637381]',
        color: 'var(--palette-text-secondary)',
        bgcolor: 'var(--palette-background-neutral)',
    },
    [OrderDetailStatus.REFUND_PENDING]: {
        label: ORDER_DETAIL_STATUS_LABELS[OrderDetailStatus.REFUND_PENDING],
        bg: 'bg-[#FFF9F3]',
        text: 'text-[#B76E00]',
        color: 'var(--palette-warning-dark)',
        bgcolor: 'var(--palette-warning-lighter)',
    },
    [OrderDetailStatus.REFUNDED]: {
        label: ORDER_DETAIL_STATUS_LABELS[OrderDetailStatus.REFUNDED],
        bg: 'bg-[#F0F5FF]',
        text: 'text-[#2065D1]',
        color: 'var(--palette-info-dark)',
        bgcolor: 'var(--palette-info-lighter)',
    },
};

export function resolveOrderDetailStatusBadge(status?: string | null) {
    if (!status) {
        return ORDER_DETAIL_STATUS_BADGE[OrderDetailStatus.ACTIVE];
    }
    const key = status as OrderDetailStatus;
    return ORDER_DETAIL_STATUS_BADGE[key] ?? {
        label: status,
        bg: 'bg-[#F4F6F8]',
        text: 'text-[#637381]',
        color: 'var(--palette-text-secondary)',
        bgcolor: 'var(--palette-background-neutral)',
    };
}

export interface OrderTicketItemRequest {
    lotteryTicketId: number;
    quantity: number;
}

export interface CreateOnlineOrderRequest {
    name: string;
    phone: string;
    items: OrderTicketItemRequest[];
    receiveType: OrderReceiveType;
    expectedPickupAt: string;
    actualPickedUpAt?: string;
    note?: string;
}

export interface DirectOrderTransactionRequest {
    type: 'OFFLINE' | 'ONLINE';
    amount: number;
    note?: string;
}

export interface CreateDirectOrderRequest {
    customerId?: string;
    name: string;
    phone?: string;
    email?: string;
    items: OrderTicketItemRequest[];
    receiveType: OrderReceiveType;
    note?: string;
    transactions: DirectOrderTransactionRequest[];
}

export interface OrderFilterParams {
    page?: number;
    size?: number;
    status?: string | string[];
    fromDate?: string;
    toDate?: string;
    orderType?: string | string[];
    receiveType?: string | string[];
    search?: string;
    sortBy?: string;
    direction?: string;
}

export type GetMyOrdersParams = OrderFilterParams;

export interface OrderResponse {
    id: string;
    userId: string;
    name?: string;
    phone?: string;
    orderCode: string;
    totalAmount: number;
    status: OrderStatus;
    orderType: OrderType;
    receiveType: OrderReceiveType;
    expectedPickupAt?: string;
    actualPickedUpAt?: string;
    createdAt: string;
    orderDetails?: any[];
    transactions: TransactionResponse[];
    refundEligible?: boolean;
    refundRemainingSeconds?: number;
    refundGraceMinutes?: number;
    refundPaymentSuccessAt?: string;
    refundDeadlineAt?: string;
}
