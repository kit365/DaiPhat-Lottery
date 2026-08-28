export enum PaymentGateway {
    PAYOS = 'PAYOS'
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED'
}

export enum TransactionType {
    OFFLINE = 'OFFLINE',
    ONLINE = 'ONLINE',
    REFUND = 'REFUND'
}

export interface TransactionResponse {
    id: number;
    /** Present for payment transactions; null/omitted for refund payouts (linked via refundRequestId). */
    orderId?: string;
    refundRequestId?: number;
    amount: number;
    gateway: PaymentGateway;
    gatewayOrderCode: number;
    paymentRef: string;
    status: TransactionStatus;
    type: TransactionType;
    paidAt?: string;
    cancelledAt?: string;
    failureReason?: string;
    paymentEvidenceUrl?: string;
    paymentBy?: string;
    note?: string;
}

export interface ProcessPaymentRequest {
    transactionId: number;
    gateway: PaymentGateway;
}

export interface CancelPaymentRequest {
    transactionId: number;
    gateway: PaymentGateway;
    reason?: string;
}

export interface PaymentResult {
    transactionId: number;
    type?: string;
    gateway: PaymentGateway;
    gatewayOrderCode: number;
    paymentRef: string;
    checkoutUrl: string;
    status: string;
    qrCode?: string | null;
    accountNumber?: string | null;
    accountName?: string | null;
    amount?: number | null;
    description?: string | null;
    bin?: string | null;
    expiredAt?: number | null;
}

export interface PendingPaymentCountdownResult {
    orderId: string;
    remainingSeconds: number;
    expiresAt: string | null;
    expired: boolean;
}

export interface PendingPaymentReminderResponse {
    orderId: string;
    orderCode: string;
    totalAmount: number;
    remainingSeconds: number;
    expiresAt: string | null;
    expired: boolean;
    transactionId: number | null;
    gateway: PaymentGateway;
}
