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

export enum OrderRefundStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
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
}
