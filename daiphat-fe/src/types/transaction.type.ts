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
    ONLINE = 'ONLINE'
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
}

export interface ProcessPaymentRequest {
    transactionId: number;
    gateway: PaymentGateway;
}

export interface PaymentResult {
    transactionId: number;
    gateway: PaymentGateway;
    gatewayOrderCode: number;
    paymentRef: string;
    checkoutUrl: string;
    status: string;
}
