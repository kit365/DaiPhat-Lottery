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

/** Nhãn loại đơn — đồng bộ admin order list, chi tiết đơn, trả thưởng. */
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
    [OrderType.ONLINE]: 'Online',
    [OrderType.DIRECT]: 'Tại quầy',
};

export const ORDER_TYPE_FILTER_OPTIONS = [
    { value: OrderType.ONLINE, label: ORDER_TYPE_LABELS[OrderType.ONLINE] },
    { value: OrderType.DIRECT, label: ORDER_TYPE_LABELS[OrderType.DIRECT] },
] as const;

export const ORDER_TYPE_CHIP_STYLES: Record<OrderType, { color: string; bgcolor: string }> = {
    [OrderType.ONLINE]: {
        color: 'var(--palette-info-dark)',
        bgcolor: 'var(--palette-info-lighter)',
    },
    [OrderType.DIRECT]: {
        color: 'var(--palette-warning-dark)',
        bgcolor: 'var(--palette-warning-lighter)',
    },
};

export function getOrderTypeLabel(value?: string | null): string {
    if (!value) return '—';
    if (value === OrderType.ONLINE) return ORDER_TYPE_LABELS[OrderType.ONLINE];
    if (value === OrderType.DIRECT) return ORDER_TYPE_LABELS[OrderType.DIRECT];
    return value;
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
    { label: string; bg: string; text: string; color: string; bgcolor: string }
> = {
    [OrderDetailStatus.ACTIVE]: {
        label: ORDER_DETAIL_STATUS_LABELS[OrderDetailStatus.ACTIVE],
        bg: 'bg-[#D3FCD2]',
        text: 'text-[#118D57]',
        color: 'var(--palette-success-dark, #118D57)',
        bgcolor: 'var(--palette-success-lighter, #D3FCD2)',
    },
    [OrderDetailStatus.INACTIVE]: {
        label: ORDER_DETAIL_STATUS_LABELS[OrderDetailStatus.INACTIVE],
        bg: 'bg-[rgba(145,158,171,0.16)]',
        text: 'text-[#637381]',
        color: 'var(--palette-text-secondary, #637381)',
        bgcolor: 'var(--palette-action-selected, rgba(145, 158, 171, 0.16))',
    },
    [OrderDetailStatus.REFUND_PENDING]: {
        label: ORDER_DETAIL_STATUS_LABELS[OrderDetailStatus.REFUND_PENDING],
        bg: 'bg-[#FFF5CC]',
        text: 'text-[#B76E00]',
        color: 'var(--palette-warning-dark, #B76E00)',
        bgcolor: 'var(--palette-warning-lighter, #FFF5CC)',
    },
    [OrderDetailStatus.REFUNDED]: {
        label: ORDER_DETAIL_STATUS_LABELS[OrderDetailStatus.REFUNDED],
        bg: 'bg-[#CAFDF5]',
        text: 'text-[#006C9C]',
        color: 'var(--palette-info-dark, #006C9C)',
        bgcolor: 'var(--palette-info-lighter, #CAFDF5)',
    },
};

export function resolveOrderDetailStatusBadge(
    status?: string | null,
    statusDisplayName?: string | null
) {
    if (!status) {
        const badge = ORDER_DETAIL_STATUS_BADGE[OrderDetailStatus.ACTIVE];
        return statusDisplayName ? { ...badge, label: statusDisplayName } : badge;
    }
    const key = status as OrderDetailStatus;
    const badge = ORDER_DETAIL_STATUS_BADGE[key];
    if (badge) {
        return statusDisplayName ? { ...badge, label: statusDisplayName } : badge;
    }
    return {
        label: statusDisplayName || status,
        bg: 'bg-[rgba(145,158,171,0.16)]',
        text: 'text-[#637381]',
        color: 'var(--palette-text-secondary, #637381)',
        bgcolor: 'var(--palette-action-selected, rgba(145, 158, 171, 0.16))',
    };
}

export function getOrderDetailStatusAdminBadgeModifier(status?: string | null): string {
    switch (status) {
        case OrderDetailStatus.ACTIVE:
        case 'ACTIVE':
            return 'admin-status-badge--success';
        case OrderDetailStatus.INACTIVE:
        case 'INACTIVE':
            return 'admin-status-badge--inactive';
        case OrderDetailStatus.REFUND_PENDING:
        case 'REFUND_PENDING':
            return 'admin-status-badge--pending';
        case OrderDetailStatus.REFUNDED:
        case 'REFUNDED':
            return 'admin-status-badge--active';
        default:
            return 'admin-status-badge--draft';
    }
}

const SERIAL_STATUS_LABELS: Record<string, string> = {
    IN_STOCK: 'Trong kho',
    RESERVED: 'Đang giữ chỗ',
    PROXY_HOLDING: 'Đại lý giữ hộ',
    SOLD: 'Đã bán',
    EXPIRED: 'Hết hạn',
};

const TICKET_CONDITION_LABELS: Record<string, string> = {
    GOOD: 'Tốt',
    DAMAGED: 'Hỏng',
    LOST: 'Thất lạc',
    VOIDED: 'Đã hủy',
};

/** Badge for lottery-ticket-serial status shown on order-detail lists. */
export function resolveLotteryTicketSerialStatusBadge(
    status?: string | null,
    statusDisplayName?: string | null,
    ticketCondition?: string | null,
    ticketConditionDisplayName?: string | null
) {
    const condition = (ticketCondition || '').toUpperCase();
    if (condition === 'DAMAGED' || condition === 'LOST' || condition === 'VOIDED') {
        const label =
            ticketConditionDisplayName ||
            TICKET_CONDITION_LABELS[condition] ||
            condition;
        return { label, color: '#b91c1c', bgcolor: '#fee2e2' };
    }

    const normalized = (status || '').toUpperCase();
    const label = statusDisplayName || SERIAL_STATUS_LABELS[normalized] || status || '—';
    switch (normalized) {
        case 'IN_STOCK':
            return { label, color: '#15803d', bgcolor: '#dcfce7' };
        case 'RESERVED':
        case 'PROXY_HOLDING':
            return { label, color: '#a16207', bgcolor: '#fef9c3' };
        case 'SOLD':
            return { label, color: '#0369a1', bgcolor: '#e0f2fe' };
        case 'EXPIRED':
            return { label, color: '#64748b', bgcolor: '#f1f5f9' };
        default:
            return { label, color: '#64748b', bgcolor: '#f1f5f9' };
    }
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
    limit?: number;
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

export interface OrderComplaintEligibilityResponse {
    eligible: boolean;
    categoryCode: string;
    reasonCode: string;
    message: string;
    requiresEvidence: boolean;
    remainingSeconds: number | null;
    eligibleAt: string | null;
    expiresAt: string | null;
    orderId: string;
    orderStatus: string;
}

export interface OrderDetailAllocatedSerial {
    serialId: number;
    serialNumber: string;
    status: string;
}

export interface OrderDetailResponse {
    id: number;
    orderId?: string;
    ticketId: number;
    numbers: string;
    drawDate: string;
    stationName?: string;
    price: number;
    quantity: number;
    subtotal: number;
    status?: OrderDetailStatus | string;
    statusDisplayName?: string;
    allocatedSerials?: OrderDetailAllocatedSerial[];
}

export interface OrderResponse {
    id: string;
    orderCode: string;
    userId: string;
    userFullName: string;
    userPhone: string;
    userEmail: string;
    name?: string;
    phone?: string;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    totalQuantity: number;
    orderType: OrderType;
    status: OrderStatus;
    paymentStatus?: string;
    receiveType: OrderReceiveType;
    expectedPickupAt?: string;
    actualPickedUpAt?: string;
    cancelledAt?: string;
    cancelReason?: string;
    cancelType?:
        | 'CUSTOMER_REQUEST'
        | 'ADMIN_FORCE_CANCEL'
        | 'SYSTEM_PAYMENT_TIMEOUT'
        | 'OUT_OF_STOCK_INCIDENT'
        | null;
    createdAt: string;
    orderDetails?: OrderDetailResponse[];
    transactions: TransactionResponse[];
    refundEligible?: boolean;
    refundRemainingSeconds?: number;
    refundGraceMinutes?: number;
    refundPaymentSuccessAt?: string;
    refundDeadlineAt?: string;
    complaintEligibility?: OrderComplaintEligibilityResponse;
}
