export enum RefundRequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    READY_TO_PAY = 'READY_TO_PAY',
    /** @deprecated Use PAID */
    TRANSFERRED = 'TRANSFERRED',
    PAID = 'PAID',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED'
}

export enum RefundType {
    FULL_ORDER = 'FULL_ORDER',
    ORDER_DETAIL = 'ORDER_DETAIL'
}

export enum RefundFundSource {
    COMPANY_FUND = 'COMPANY_FUND',
    PERSONAL_FUND = 'PERSONAL_FUND'
}

export enum ReimburseStatus {
    NONE = 'NONE',
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export enum RefundRequestRole {
    CUSTOMER = 'CUSTOMER',
    STAFF = 'STAFF'
}

export interface UserBankAccountResponse {
    id: number;
    bankName: string;
    bankLogo?: string;
    bankBin: string;
    bankAccountNo: string;
    bankAccountName: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateUserBankAccountRequest {
    bankBin: string;
    bankAccountNo: string;
    bankAccountName: string;
    isDefault?: boolean;
    agreedToRefundTerms: boolean;
}

export type UpdateUserBankAccountRequest = CreateUserBankAccountRequest;

export interface VietQrBankResponse {
    code: string;
    bin: string;
    name: string;
    shortName: string;
    logo: string;
}

export interface CreateRefundRequestRequest {
    refundType: RefundType;
    orderId: string;
    orderDetailId?: number;
    refundAmount: number;
    refundReason: string;
    bankAccountId: number;
}

export interface CreateOrderRefundRequest {
    refundReason: string;
    bankAccountId: number;
}

export interface OrderRefundEligibilityResponse {
    eligible: boolean;
    reason?: string;
    remainingSeconds?: number;
    closingTime: string;
}

export interface RefundRequestResponse {
    id: number;
    refundType: RefundType;
    orderId: string;
    orderDetailId?: number;
    requestedBy: string;
    requestRole: RefundRequestRole;
    status: RefundRequestStatus;
    refundAmount: number;
    refundReason: string;
    bankAccountId: number;
    bankAccount?: UserBankAccountResponse;
    fundSource?: RefundFundSource;
    reimburseStatus?: ReimburseStatus;
    attemptNumber?: number;
    rejectReason?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    transferEvidenceUrl?: string;
    transferredAt?: string;
    transferredBy?: string;
    transferNote?: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetMyRefundsParams {
    page?: number;
    limit?: number;
    status?: RefundRequestStatus | string;
    orderId?: string;
    search?: string;
}

export const REFUND_STATUS_LABELS: Record<RefundRequestStatus, string> = {
    [RefundRequestStatus.PENDING]: 'Chờ duyệt',
    [RefundRequestStatus.APPROVED]: 'Đã duyệt',
    [RefundRequestStatus.REJECTED]: 'Từ chối',
    [RefundRequestStatus.READY_TO_PAY]: 'Chờ chuyển khoản',
    [RefundRequestStatus.TRANSFERRED]: 'Đã chuyển khoản',
    [RefundRequestStatus.PAID]: 'Đã chuyển khoản',
    [RefundRequestStatus.EXPIRED]: 'Hết hạn',
    [RefundRequestStatus.CANCELLED]: 'Đã hủy'
};

/** Mask bank account number for display (e.g. 1234567890 → ****7890) */
export function maskBankAccountNo(accountNo: string): string {
    const digits = accountNo.replace(/\s/g, '');
    if (digits.length <= 4) return digits;
    return `${'*'.repeat(Math.min(digits.length - 4, 6))}${digits.slice(-4)}`;
}

/** Server-side refund amount for full-order cancel (matches BE calculation) */
export function calculateOrderRefundAmount(order: {
    totalAmount: number;
    orderDetails?: Array<{ price?: number }>;
}): number {
    const details = order.orderDetails || [];
    if (details.length > 0) {
        return details.reduce((sum, d) => sum + (d.price ?? 0), 0);
    }
    return order.totalAmount ?? 0;
}

export function isRefundTransferComplete(status: RefundRequestStatus): boolean {
    return status === RefundRequestStatus.PAID || status === RefundRequestStatus.TRANSFERRED;
}
