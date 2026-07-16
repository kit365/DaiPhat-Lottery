import { OrderStatus } from './order.type';
import type { TransactionResponse } from './transaction.type';

export enum RefundRequestStatus {
    WAITING_FOR_INFO = 'WAITING_FOR_INFO',
    /** @deprecated Prefer READY_TO_PAY */
    APPROVED = 'APPROVED',
    READY_TO_PAY = 'READY_TO_PAY',
    /** @deprecated Use PAID */
    TRANSFERRED = 'TRANSFERRED',
    PAID = 'PAID',
    MANUAL_RESOLUTION = 'MANUAL_RESOLUTION',
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
    STAFF = 'STAFF',
    ADMIN = 'ADMIN'
}

export enum RefundProcessingUrgency {
    ON_TIME = 'ON_TIME',
    NEAR_DEADLINE = 'NEAR_DEADLINE',
    OVERDUE = 'OVERDUE',
    NOT_APPLICABLE = 'NOT_APPLICABLE'
}

export const REFUND_PROCESSING_URGENCY_LABELS: Record<RefundProcessingUrgency, string> = {
    [RefundProcessingUrgency.ON_TIME]: 'Đúng hạn',
    [RefundProcessingUrgency.NEAR_DEADLINE]: 'Sắp hết hạn',
    [RefundProcessingUrgency.OVERDUE]: 'Quá hạn',
    [RefundProcessingUrgency.NOT_APPLICABLE]: '—'
};

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
    /** @deprecated Partial refunds are not supported; full order refund links all order details. */
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
    serialNumber?: string;
    stationName?: string;
    drawDate?: string;
    ticketImg?: string;
    quantity: number;
    unitPrice: number;
    subtotalAmount: number;
    serialStatus?: string | null;
    serialStatusLabel?: string | null;
    hasIncident?: boolean;
    faultedBy?: string | null;
    faultedByDisplayName?: string | null;
    damagedReason?: string | null;
    damagedEvidenceUrl?: string | null;
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
    maxRefundRequestsPerDay?: number;
    refundRequestsSubmittedToday?: number;
    dailyLimitReached?: boolean;
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
    orderId?: string | null;
    orderDetailIds?: number[];
    /** @deprecated Prefer orderDetailIds */
    orderDetailId?: number;
    requestedBy: string;
    requestRole: RefundRequestRole;
    status: RefundRequestStatus;
    refundAmount: number;
    refundReason: string;
    bankAccountId?: number | null;
    bankAccount?: UserBankAccountResponse;
    fundSource?: RefundFundSource;
    reimburseStatus?: ReimburseStatus;
    attemptNumber?: number;
    retryCount?: number;
    operatorNote?: string | null;
    maxRefundBankInfoRetry?: number;
    reviewedBy?: string;
    reviewedAt?: string;
    /** Refund payout transaction (paymentEvidenceUrl, paymentBy, note, paidAt). */
    payoutTransaction?: TransactionResponse;
    createdAt: string;
    updatedAt: string;
    orderCode?: string;
    processingDeadlineAt?: string;
    remainingProcessingSeconds?: number;
    processingUrgency?: RefundProcessingUrgency;
    /** Ticket lines included in this refund (customer/staff detail enrichment). */
    refundTickets?: RefundEligibleTicketItem[];
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

export interface TransferRefundRequestRequest {
    paymentEvidenceUrl: string;
    note?: string;
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
    orderSummary?: RefundOrderSummary | null;
    customerSummary: RefundCustomerSummary;
    reviewerName?: string;
    transferrerName?: string;
    processingHistory: RefundProcessingHistoryItem[];
    refundTickets?: RefundEligibleTicketItem[];
}

export const REFUND_STATUS_LABELS: Record<RefundRequestStatus, string> = {
    [RefundRequestStatus.WAITING_FOR_INFO]: 'Chờ thông tin STK',
    [RefundRequestStatus.APPROVED]: 'Đã duyệt',
    [RefundRequestStatus.READY_TO_PAY]: 'Chờ chuyển khoản',
    [RefundRequestStatus.TRANSFERRED]: 'Đã chuyển khoản',
    [RefundRequestStatus.PAID]: 'Đã chuyển khoản',
    [RefundRequestStatus.MANUAL_RESOLUTION]: 'Cần xử lý thủ công',
};

export interface AttachRefundBankAccountRequest {
    bankAccountId: number;
}

export interface RequestBankInfoUpdateRequest {
    operatorNote: string;
}

export interface StaffCancelOrderWithRefundRequest {
    cancelType: 'ADMIN_FORCE_CANCEL' | 'OUT_OF_STOCK_INCIDENT';
    cancelReason?: string;
    incidents?: Array<{
        orderDetailId: number;
        reason: 'DAMAGED' | 'LOST';
        replacementTicketId?: number;
        damagedReason?: string;
        damagedEvidenceUrl?: string;
    }>;
}

/** Default cancel reasons aligned with BE OrderCancelReasonDefaults */
export const ORDER_CANCEL_REASON_DEFAULTS = {
    ADMIN_FORCE_CANCEL: 'Nhân viên hủy đơn theo yêu cầu hỗ trợ khách hàng',
    OUT_OF_STOCK_INCIDENT:
        'Hủy đơn do sự cố kho — toàn bộ vé không thể giao và không còn vé thay thế',
} as const;

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

/** Statuses that mean refund payout is done (exclude from pending sidebar badges). */
const COMPLETED_REFUND_STATUSES = new Set<string>([
    RefundRequestStatus.PAID,
    RefundRequestStatus.TRANSFERRED,
]);

/** Count refunds that still need attention: all − PAID (− legacy TRANSFERRED). */
export function countPendingRefunds(
    statusCounts: Record<string, number | undefined> | undefined
): number {
    if (!statusCounts) return 0;

    const all = Number(statusCounts.all ?? statusCounts.ALL);
    if (Number.isFinite(all) && all >= 0) {
        const paid =
            Number(statusCounts.PAID || 0) + Number(statusCounts.TRANSFERRED || 0);
        return Math.max(0, all - paid);
    }

    return Object.entries(statusCounts).reduce((sum, [key, value]) => {
        if (key === 'all' || key === 'ALL' || COMPLETED_REFUND_STATUSES.has(key)) {
            return sum;
        }
        return sum + (Number(value) || 0);
    }, 0);
}

/** Format remaining refund window as `MM phút SS giây` */
export function formatRefundCountdown(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')} phút ${String(secs).padStart(2, '0')} giây`;
}

/** Format processing deadline countdown for staff (days + time when > 1 day) */
export function formatProcessingCountdown(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    if (seconds === 0) return 'Đã hết hạn';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) {
        return `Còn ${days} ngày ${hours} giờ`;
    }
    if (hours > 0) {
        return `Còn ${hours} giờ ${minutes} phút`;
    }
    return formatRefundCountdown(seconds);
}

export function computeProcessingSecondsLeft(
    processingDeadlineAt?: string | null,
    fallbackRemainingSeconds?: number | null
): number {
    if (processingDeadlineAt) {
        const deadlineMs = new Date(processingDeadlineAt).getTime();
        if (!Number.isNaN(deadlineMs)) {
            return Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
        }
    }
    return Math.max(0, Math.floor(fallbackRemainingSeconds ?? 0));
}

export function isRefundProcessingActionable(status: RefundRequestStatus): boolean {
    return status === RefundRequestStatus.WAITING_FOR_INFO
        || status === RefundRequestStatus.APPROVED
        || status === RefundRequestStatus.READY_TO_PAY;
}
