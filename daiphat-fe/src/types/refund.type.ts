import { OrderStatus } from './order.type';

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

export interface RefundEligibleTicketItem {
    orderDetailId?: number;
    numbers?: string;
    stationName?: string;
    drawDate?: string;
    quantity: number;
    unitPrice: number;
    subtotalAmount: number;
}

export interface OrderRefundEligibilityResponse {
    eligible: boolean;
    reason?: string;
    remainingSeconds?: number;
    graceMinutes: number;
    refundDeadlineAt?: string;
    paymentSuccessAt?: string;
    orderId?: string;
    orderCode?: string;
    orderStatus?: string;
    orderTotalAmount?: number;
    orderCreatedAt?: string;
    refundTickets?: RefundEligibleTicketItem[];
    totalRefundAmount?: number;
}

export const REFUNDABLE_ORDER_STATUSES: OrderStatus[] = [
    OrderStatus.PAID,
    OrderStatus.PREPARING,
    OrderStatus.PENDING_PICKUP
];

export function isRefundCandidateStatus(status: OrderStatus): boolean {
    return REFUNDABLE_ORDER_STATUSES.includes(status);
}

export interface RefundWindowInput {
    refundDeadlineAt?: string | null;
    paymentSuccessAt?: string | null;
    graceMinutes?: number | null;
    remainingSeconds?: number | null;
}

/** Remaining refund window seconds from deadline or paymentSuccessAt + grace. */
export function computeRefundSecondsLeft(
    refundDeadlineAt?: string | null,
    paymentSuccessAt?: string | null,
    graceMinutes?: number | null,
    fallbackRemainingSeconds?: number | null
): number {
    const now = Date.now();

    if (refundDeadlineAt) {
        const deadlineMs = new Date(refundDeadlineAt).getTime();
        if (!Number.isNaN(deadlineMs)) {
            return Math.max(0, Math.floor((deadlineMs - now) / 1000));
        }
    }

    if (paymentSuccessAt && graceMinutes != null && graceMinutes > 0) {
        const paidMs = new Date(paymentSuccessAt).getTime();
        if (!Number.isNaN(paidMs)) {
            const deadlineMs = paidMs + graceMinutes * 60_000;
            return Math.max(0, Math.floor((deadlineMs - now) / 1000));
        }
    }

    return Math.max(0, Math.floor(fallbackRemainingSeconds ?? 0));
}

/** Whether the refund grace window is still open (client-side deadline check). */
export function isRefundWindowOpen(input: RefundWindowInput): boolean {
    return (
        computeRefundSecondsLeft(
            input.refundDeadlineAt,
            input.paymentSuccessAt,
            input.graceMinutes,
            input.remainingSeconds
        ) > 0
    );
}

/** Whether the order may show refund UI based on backend-computed grace window. */
export function canShowRefundRequest(
    order: {
        status: OrderStatus;
        refundEligible?: boolean;
        refundRemainingSeconds?: number;
        refundGraceMinutes?: number;
        refundPaymentSuccessAt?: string;
        refundDeadlineAt?: string;
    },
    hasPendingRefund = false
): boolean {
    if (hasPendingRefund) return false;
    if (!isRefundCandidateStatus(order.status)) return false;
    if (order.refundEligible === true) return true;
    if ((order.refundRemainingSeconds ?? 0) > 0) return true;
    return isRefundWindowOpen({
        refundDeadlineAt: order.refundDeadlineAt,
        paymentSuccessAt: order.refundPaymentSuccessAt,
        graceMinutes: order.refundGraceMinutes,
        remainingSeconds: order.refundRemainingSeconds
    });
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

export interface GetStaffRefundsParams {
    page?: number;
    limit?: number;
    status?: string;
    orderId?: string;
    search?: string;
}

export interface RejectRefundRequestRequest {
    rejectReason: string;
}

export interface TransferRefundRequestRequest {
    transferEvidenceUrl: string;
    transferNote?: string;
}

export interface RefundProcessingHistoryItem {
    action: string;
    detail?: string;
    occurredAt: string;
}

export interface RefundOrderSummary {
    id: string;
    orderCode: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    cancelReason?: string;
}

export interface RefundCustomerSummary {
    id: string;
    fullName?: string;
    email?: string;
    phone?: string;
}

export interface RefundRequestAdminDetailResponse {
    refund: RefundRequestResponse;
    orderSummary: RefundOrderSummary;
    customerSummary: RefundCustomerSummary;
    reviewerName?: string;
    transferrerName?: string;
    processingHistory: RefundProcessingHistoryItem[];
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

/** Server-side refund amount for full-order cancel (matches BE line subtotal calculation) */
export function calculateOrderRefundAmount(order: {
    totalAmount: number;
    orderDetails?: Array<{ price?: number; quantity?: number }>;
}): number {
    const details = order.orderDetails || [];
    if (details.length > 0) {
        return details.reduce((sum, detail) => {
            const unitPrice = detail.price ?? 0;
            const quantity = detail.quantity != null && detail.quantity > 0 ? detail.quantity : 1;
            return sum + unitPrice * quantity;
        }, 0);
    }
    return order.totalAmount ?? 0;
}

/** Resolve refund amount from eligibility API or order fallback */
export function resolveRefundAmount(
    eligibility?: Pick<OrderRefundEligibilityResponse, 'totalRefundAmount'> | null,
    order?: { totalAmount: number; orderDetails?: Array<{ price?: number; quantity?: number }> }
): number {
    if (eligibility?.totalRefundAmount != null) {
        return eligibility.totalRefundAmount;
    }
    if (order) {
        return calculateOrderRefundAmount(order);
    }
    return 0;
}

export function formatRefundCurrency(amount: number): string {
    return `${amount.toLocaleString('vi-VN')} VNĐ`;
}

export function isRefundTransferComplete(status: RefundRequestStatus): boolean {
    return status === RefundRequestStatus.PAID || status === RefundRequestStatus.TRANSFERRED;
}

/** Format remaining refund window as `MM phút SS giây` */
export function formatRefundCountdown(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')} phút ${String(secs).padStart(2, '0')} giây`;
}
