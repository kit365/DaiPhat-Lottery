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
    orderId: string;
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
    gateway: PaymentGateway;
    gatewayOrderCode: number;
    paymentRef: string;
    checkoutUrl: string;
    status: string;
}

export interface PendingPaymentCountdownResult {
    orderId: string;
    remainingSeconds: number;
    expiresAt: string | null;
    expired: boolean;
}
