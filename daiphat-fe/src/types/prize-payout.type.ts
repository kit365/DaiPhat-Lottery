import { PageResponse } from './api.type';
import { LotteryTicketSerialStatus, PurchasedTicket } from './lottery-ticket.type';
import { getOrderTypeLabel, OrderType } from './order.type';

export enum PrizePayoutRequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    COMPLETED = 'COMPLETED',
    REJECTED = 'REJECTED',
    MANUAL_RESOLUTION = 'MANUAL_RESOLUTION',
    CANCELLED = 'CANCELLED',
    /** Quỹ đại lý không đủ — chờ tiền về từ nhà đài */
    AWAITING_FUND = 'AWAITING_FUND',
}

export type PrizePayoutChannel = 'ONLINE' | 'IN_PERSON';
export type PrizePayoutPaymentMethod = 'CASH' | 'TRANSFER' | 'COMBINED';
export type PrizePayoutTicketOrigin = 'INTERNAL_ONLINE' | 'INTERNAL_OFFLINE';
export type PrizePayoutOwnershipVerificationLevel =
    | 'AUTO_MATCHED'
    | 'CUSTOMER_LINKED'
    | 'MANUAL_ONLY';

export type SerialPayoutState = 'NONE' | 'PAYOUT_PENDING' | 'PAID_OUT';

export type { LotteryTicketSerialStatus };

export type TicketCondition = 'GOOD' | 'DAMAGED' | 'LOST' | 'VOIDED';

export interface PrizePayoutRequestResponse {
    id: number;
    requestCode: string;
    customerId?: string;
    customerName?: string;
    orderId?: string;
    orderCode?: string;
    orderDetailId?: number;
    serialId?: number;
    serialNumber?: string;
    numbers?: string;
    stationName?: string;
    drawDate?: string;
    prizeCode?: string;
    prizeDisplayName?: string;
    grossAmount: number;
    taxAmount?: number;
    commissionAmount?: number;
    netAmount?: number;
    cashAmount?: number;
    transferAmount?: number;
    channel?: PrizePayoutChannel;
    ticketOrigin?: PrizePayoutTicketOrigin;
    ownershipVerificationLevel?: PrizePayoutOwnershipVerificationLevel;
    manualOwnershipConfirmed?: boolean;
    orderType?: 'ONLINE' | 'DIRECT';
    orderGuestName?: string;
    orderPhone?: string;
    paymentMethod?: PrizePayoutPaymentMethod;
    bankAccountId?: number;
    bankName?: string;
    bankAccountNumber?: string;
    accountHolderName?: string;
    recipientFullName?: string;
    recipientIdNumber?: string;
    recipientIdImageUrl?: string;
    recipientIdImageBackUrl?: string;
    recipientIdentityCapturedAt?: string;
    status: PrizePayoutRequestStatus;
    rejectCount?: number;
    maxOnlineRejectRetry?: number;
    onlineClaimLocked?: boolean;
    requiresFourEyes?: boolean;
    canCurrentStaffApprove?: boolean;
    canCurrentStaffComplete?: boolean;
    rejectReason?: string;
    transferEvidenceUrl?: string;
    confirmationContractUrl?: string;
    completedAt?: string;
    completedBy?: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    serialStatus?: LotteryTicketSerialStatus;
    ticketCondition?: TicketCondition;
    payoutState?: SerialPayoutState;
    // Partial payout fields
    totalPrizeAmount?: number;
    paidAmountToDate?: number;
    fundAdvanceNote?: string;
    commitmentVoucherCode?: string;
    commitmentExpiresAt?: string;
}

export interface PrizePayoutPreviewResponse {
    orderDetailId: number;
    serialId: number;
    prizeCode?: string;
    prizeDisplayName?: string;
    grossAmount: number;
    taxAmount: number;
    commissionAmount: number;
    netAmount: number;
    channel: PrizePayoutChannel;
    canClaimOnline: boolean;
    ticketOrigin: PrizePayoutTicketOrigin;
    ownershipVerificationLevel: PrizePayoutOwnershipVerificationLevel;
    requiresManualOwnershipConfirm: boolean;
    requiresRecipientIdentity?: boolean;
    requiresRecipientIdImage?: boolean;
    requiresFourEyes?: boolean;
    taxThreshold?: number;
    orderType?: 'ONLINE' | 'DIRECT';
    orderCode?: string;
    customerId?: string;
    customerName?: string;
    orderGuestName?: string;
    phone?: string;
    serialNumber?: string;
    stationName?: string;
    drawDate?: string;
    ticketNumbers?: string;
    winningNumber?: string;
    matchFrom?: string;
    matchDigits?: number;
}

export type TicketDrawResultStatus = 'WON' | 'LOST' | 'PENDING_DRAW';

export interface PrizePayoutLookupItem {
    orderDetailId: number;
    serialId: number;
    stationId?: number;
    stationName?: string;
    drawDate?: string;
    serialNumber?: string;
    ticketNumbers?: string;
    prizeStatus: TicketDrawResultStatus;
    prizeCode?: string;
    prizeDisplayName?: string;
    grossAmount?: number;
    taxAmount?: number;
    commissionAmount?: number;
    netAmount?: number;
    ticketOrigin: PrizePayoutTicketOrigin;
    ownershipVerificationLevel: PrizePayoutOwnershipVerificationLevel;
    requiresManualOwnershipConfirm: boolean;
    requiresRecipientIdentity: boolean;
    requiresRecipientIdImage: boolean;
    requiresFourEyes: boolean;
    taxThreshold?: number;
    orderType?: 'ONLINE' | 'DIRECT';
    orderCode?: string;
    customerId?: string;
    customerName?: string;
    orderGuestName?: string;
    phone?: string;
    winningNumber?: string;
    matchFrom?: string;
    matchDigits?: number;
    alreadyRequested?: boolean;
    /** Serial payout lock state from BE (NONE | PAYOUT_PENDING | PAID_OUT). */
    payoutState?: SerialPayoutState;
    customerRedemptionDeadline?: string | null;
    issuerRedemptionDeadline?: string | null;
    redemptionZone?: PrizeRedemptionZone | null;
    daysRemainingToIssuer?: number | null;
}

export type PrizeRedemptionZone =
    | 'WITHIN_CUSTOMER'
    | 'PAST_CUSTOMER_URGENT'
    | 'PAST_ISSUER_LOCKED';

export interface PrizePayoutLookupResponse {
    items: PrizePayoutLookupItem[];
}

export interface PrizePayoutCustomerSuggestion {
    displayName: string;
    phone?: string;
    email?: string;
    orderCount: number;
    lastOrderDate?: string;
}

export interface PrizePayoutBatchCreateResponse {
    claims: PrizePayoutRequestResponse[];
    totalNetAmount: number;
}

export interface CreatePrizePayoutRequest {
    orderDetailId?: number;
    serialId?: number;
    bankAccountId: number;
}

export interface CreateStaffPrizePayoutRequest {
    orderDetailId?: number;
    serialId?: number;
    serialNumber?: string;
    orderCode?: string;
    bankAccountId?: number;
    bankName?: string;
    bankAccountNumber?: string;
    accountHolderName?: string;
    recipientFullName?: string;
    recipientIdNumber?: string;
    recipientIdImageUrl?: string;
    recipientIdImageBackUrl?: string;
    paymentMethod: PrizePayoutPaymentMethod;
    cashAmount?: number;
    manualOwnershipConfirmed?: boolean;
    transferEvidenceUrl?: string;
    confirmationContractUrl?: string;
    acknowledgeLateRedemption?: boolean;
}

export interface CreateStaffPrizePayoutBatchRequest {
    items: { orderDetailId: number }[];
    bankAccountId?: number;
    bankName?: string;
    bankAccountNumber?: string;
    accountHolderName?: string;
    recipientFullName?: string;
    recipientIdNumber?: string;
    recipientIdImageUrl?: string;
    recipientIdImageBackUrl?: string;
    paymentMethod: PrizePayoutPaymentMethod;
    cashAmount?: number;
    manualOwnershipConfirmed?: boolean;
    transferEvidenceUrl?: string;
    confirmationContractUrl?: string;
    acknowledgeLateRedemption?: boolean;
}


export interface CompletePrizePayoutRequest {
    paymentMethod: PrizePayoutPaymentMethod;
    cashAmount?: number;
    transferEvidenceUrl?: string;
}

export interface RejectPrizePayoutRequest {
    reason: string;
}

export interface GetMyPrizePayoutsParams {
    page?: number;
    limit?: number;
    status?: PrizePayoutRequestStatus;
    search?: string;
}

export interface GetStaffPrizePayoutsParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

export interface PrizePayoutStaffListResponse {
    page: PageResponse<PrizePayoutRequestResponse>;
    pendingCount: number;
    pendingGrossTotal: number;
}

export const PRIZE_PAYOUT_STATUS_MAP: Record<
    PrizePayoutRequestStatus,
    { label: string; bg: string; text: string }
> = {
    [PrizePayoutRequestStatus.PENDING]: { label: 'Cần xử lý', bg: 'bg-[#FFF9F3]', text: 'text-[#B76E00]' },
    [PrizePayoutRequestStatus.APPROVED]: { label: 'Đã duyệt', bg: 'bg-[#EFF8FF]', text: 'text-[#175CD3]' },
    [PrizePayoutRequestStatus.COMPLETED]: { label: 'Đã chuyển', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [PrizePayoutRequestStatus.REJECTED]: { label: 'Từ chối', bg: 'bg-[#FFF4F4]', text: 'text-[#ee1314]' },
    [PrizePayoutRequestStatus.MANUAL_RESOLUTION]: {
        label: 'Cần xử lý tại đại lý',
        bg: 'bg-[#FFF5F5]',
        text: 'text-[#C62828]',
    },
    [PrizePayoutRequestStatus.CANCELLED]: { label: 'Đã hủy', bg: 'bg-[#F4F6F8]', text: 'text-[#637381]' },
    [PrizePayoutRequestStatus.AWAITING_FUND]: { label: 'Chờ quỹ', bg: 'bg-[#FFF9F3]', text: 'text-[#B76E00]' },
};

export const PRIZE_PAYOUT_CHANNEL_LABELS: Record<PrizePayoutChannel, string> = {
    ONLINE: 'Trực tuyến',
    IN_PERSON: 'Tại quầy',
};

export const PRIZE_PAYOUT_TICKET_ORIGIN_LABELS: Record<PrizePayoutTicketOrigin, string> = {
    INTERNAL_ONLINE: 'Vé trực tuyến',
    INTERNAL_OFFLINE: 'Vé mua tại quầy',
};

/** Suy ra loại đơn (Online / Tại quầy) từ orderType hoặc channel/ticketOrigin. */
export function resolvePrizePayoutOrderType(
    detail: Pick<PrizePayoutRequestResponse, 'orderType' | 'channel' | 'ticketOrigin'>
): OrderType | null {
    if (detail.orderType === OrderType.ONLINE) {
        return OrderType.ONLINE;
    }
    if (detail.orderType === OrderType.DIRECT) {
        return OrderType.DIRECT;
    }
    if (detail.channel === 'ONLINE' || detail.ticketOrigin === 'INTERNAL_ONLINE') {
        return OrderType.ONLINE;
    }
    if (detail.channel === 'IN_PERSON' || detail.ticketOrigin === 'INTERNAL_OFFLINE') {
        return OrderType.DIRECT;
    }
    return null;
}

export function resolvePrizePayoutOrderTypeLabel(
    detail: Pick<PrizePayoutRequestResponse, 'orderType' | 'channel' | 'ticketOrigin'>
): string {
    const orderType = resolvePrizePayoutOrderType(detail);
    return orderType ? getOrderTypeLabel(orderType) : '—';
}

export const PRIZE_PAYOUT_VERIFICATION_LABELS: Record<PrizePayoutOwnershipVerificationLevel, string> = {
    AUTO_MATCHED: 'Đã xác minh hệ thống',
    CUSTOMER_LINKED: 'Vé tại quầy — có KH trên đơn',
    MANUAL_ONLY: 'Vé tại quầy — không KH / xác minh thủ công',
};

export const PRIZE_PAYOUT_PAYMENT_METHOD_LABELS: Record<PrizePayoutPaymentMethod, string> = {
    CASH: 'Tiền mặt',
    TRANSFER: 'Chuyển khoản',
    COMBINED: 'Thanh toán kết hợp',
};

export const SERIAL_PAYOUT_STATE_LABELS: Record<SerialPayoutState, string> = {
    NONE: 'Chưa yêu cầu trả thưởng',
    PAYOUT_PENDING: 'Đang xử lý trả thưởng',
    PAID_OUT: 'Đã trả thưởng',
};

export const SERIAL_STATUS_LABELS: Record<LotteryTicketSerialStatus, string> = {
    IN_STOCK: 'Trong kho',
    RESERVED: 'Đang giữ chỗ',
    PROXY_HOLDING: 'Đại lý giữ hộ',
    SOLD: 'Đã bán',
    EXPIRED: 'Đã hết hạn kỳ quay',
    WITH_STREET_AGENT: 'Đang giao người bán dạo',
};

export const TICKET_CONDITION_LABELS: Record<TicketCondition, string> = {
    GOOD: 'Tốt',
    DAMAGED: 'Hỏng',
    LOST: 'Thất lạc',
    VOIDED: 'Đã hủy',
};

/** Tình trạng nhận vé vật lý — đã lấy hay còn giữ tại đại lý. */
export type TicketPossessionStatus =
    | 'PICKED_UP'
    | 'HELD_AT_AGENT'
    | 'RESERVED'
    | 'REJECTED'
    | 'OTHER';

export interface TicketPossessionDisplay {
    status: TicketPossessionStatus;
    label: string;
    hint?: string;
    className: string;
    icon: string;
}

export const resolveTicketPossessionDisplay = (
    ticket: Pick<
        PurchasedTicket,
        'serialStatus' | 'actualPickedUpAt' | 'orderDetailStatus' | 'handedOverAt' | 'rejectedAt'
    >
): TicketPossessionDisplay | null => {
    // Order-detail handover status is authoritative (serial stays SOLD after payment).
    if (ticket.orderDetailStatus === 'REJECTED_BY_CUSTOMER') {
        return {
            status: 'REJECTED',
            label: 'Khách từ chối nhận',
            hint: 'Vé vẫn được đại lý giữ — liên hệ hỗ trợ nếu cần',
            className: 'bg-rose-50 text-rose-700 border-rose-200',
            icon: 'fa-solid fa-hand',
        };
    }
    if (ticket.orderDetailStatus === 'HANDED_OVER' || ticket.handedOverAt || ticket.actualPickedUpAt) {
        return {
            status: 'PICKED_UP',
            label: 'Đã lấy vé',
            hint: 'Bạn đã nhận vé vật lý tại đại lý',
            className: 'bg-sky-50 text-sky-700 border-sky-200',
            icon: 'fa-solid fa-hand-holding',
        };
    }
    if (
        ticket.orderDetailStatus === 'PROXY_HOLDING'
        || ticket.orderDetailStatus === 'HANDOVER_IN_PROGRESS'
        || ticket.serialStatus === 'PROXY_HOLDING'
    ) {
        return {
            status: 'HELD_AT_AGENT',
            label: ticket.orderDetailStatus === 'HANDOVER_IN_PROGRESS'
                ? 'Đang bàn giao'
                : 'Đại lý đang giữ hộ',
            hint: 'Vé chưa được bạn lấy tại quầy',
            className: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: 'fa-solid fa-store',
        };
    }
    if (ticket.orderDetailStatus === 'REFUND_PENDING' || ticket.orderDetailStatus === 'REFUNDED') {
        return {
            status: 'OTHER',
            label: ticket.orderDetailStatus === 'REFUNDED' ? 'Đã hoàn tiền' : 'Chờ hoàn tiền',
            className: 'bg-slate-50 text-slate-600 border-slate-200',
            icon: 'fa-solid fa-rotate-left',
        };
    }
    if (ticket.serialStatus === 'RESERVED') {
        return {
            status: 'RESERVED',
            label: 'Đang giữ chỗ',
            hint: 'Chờ hoàn tất đơn hàng',
            className: 'bg-slate-50 text-slate-600 border-slate-200',
            icon: 'fa-solid fa-clock',
        };
    }
    if (ticket.serialStatus === 'EXPIRED') {
        return {
            status: 'HELD_AT_AGENT',
            label: 'Còn tại đại lý',
            hint: 'Kỳ quay đã hết hạn — vé vẫn được đại lý giữ',
            className: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: 'fa-solid fa-store',
        };
    }
    // Paid serial without a handover decision yet — still at the counter, not picked up.
    if (ticket.serialStatus === 'SOLD') {
        return {
            status: 'HELD_AT_AGENT',
            label: 'Đại lý đang giữ hộ',
            hint: 'Vé chưa được bạn lấy tại quầy',
            className: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: 'fa-solid fa-store',
        };
    }
    if (!ticket.serialStatus && !ticket.orderDetailStatus) {
        return null;
    }
    return {
        status: 'OTHER',
        label: ticket.serialStatus
            ? (SERIAL_STATUS_LABELS[ticket.serialStatus] ?? ticket.serialStatus)
            : (ticket.orderDetailStatus ?? 'Khác'),
        className: 'bg-slate-50 text-slate-600 border-slate-200',
        icon: 'fa-solid fa-ticket',
    };
};

const PAYOUT_ELIGIBLE_SERIAL_STATUSES: LotteryTicketSerialStatus[] = [
    'SOLD',
    'PROXY_HOLDING',
    'EXPIRED',
];

export type TicketPayoutDisplayStatus =
    | 'NOT_REQUESTED'
    | 'PENDING'
    | 'COMPLETED'
    | 'REJECTED'
    | 'MANUAL_RESOLUTION'
    | 'CANCELLED'
    | 'IN_PERSON_ONLY';

export const resolveTicketPayoutDisplay = (
    ticket: PurchasedTicket
): { status: TicketPayoutDisplayStatus; label: string; className: string; icon: string } | null => {
    if (ticket.drawResultStatus !== 'WON') {
        return null;
    }

    const status = ticket.activePayoutStatus as PrizePayoutRequestStatus | undefined;

    if (ticket.payoutState === 'PAID_OUT' || status === PrizePayoutRequestStatus.COMPLETED) {
        return {
            status: 'COMPLETED',
            label: 'Đã trả thưởng',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: 'fa-solid fa-circle-check',
        };
    }

    if (ticket.payoutState === 'PAYOUT_PENDING'
        || status === PrizePayoutRequestStatus.PENDING
        || status === PrizePayoutRequestStatus.APPROVED) {
        return {
            status: 'PENDING',
            label: status === PrizePayoutRequestStatus.APPROVED
                ? 'Đã duyệt — chờ hoàn tất'
                : 'Đang xử lý trả thưởng',
            className: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: 'fa-solid fa-hourglass-half',
        };
    }

    if (status === PrizePayoutRequestStatus.MANUAL_RESOLUTION) {
        return {
            status: 'MANUAL_RESOLUTION',
            label: 'Cần đổi thưởng tại đại lý',
            className: 'bg-rose-50 text-rose-700 border-rose-200',
            icon: 'fa-solid fa-store',
        };
    }

    if (status === PrizePayoutRequestStatus.REJECTED) {
        return {
            status: 'REJECTED',
            label: 'Bị từ chối trả thưởng',
            className: 'bg-rose-50 text-rose-600 border-rose-200',
            icon: 'fa-solid fa-circle-xmark',
        };
    }

    if (status === PrizePayoutRequestStatus.CANCELLED) {
        return {
            status: 'CANCELLED',
            label: 'Đã hủy yêu cầu',
            className: 'bg-slate-100 text-slate-600 border-slate-200',
            icon: 'fa-solid fa-ban',
        };
    }

    if (ticket.canClaimOnline === false || ticket.claimChannel === 'IN_PERSON') {
        return {
            status: 'IN_PERSON_ONLY',
            label: 'Đổi thưởng tại đại lý',
            className: 'bg-violet-50 text-violet-700 border-violet-200',
            icon: 'fa-solid fa-store',
        };
    }

    return {
        status: 'NOT_REQUESTED',
        label: 'Chưa yêu cầu trả thưởng',
        className: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: 'fa-solid fa-hand-holding-dollar',
    };
};

export const canRequestPrizePayout = (ticket: PurchasedTicket) => {
    const status = ticket.activePayoutStatus as PrizePayoutRequestStatus | undefined;
    const withinCustomerWindow = ticket.redemptionZone == null
        || ticket.redemptionZone === 'WITHIN_CUSTOMER';
    return ticket.drawResultStatus === 'WON'
        && ticket.canClaimOnline === true
        && withinCustomerWindow
        && ticket.serialStatus != null
        && PAYOUT_ELIGIBLE_SERIAL_STATUSES.includes(ticket.serialStatus)
        && (ticket.payoutState == null || ticket.payoutState === 'NONE')
        && status !== PrizePayoutRequestStatus.PENDING
        && status !== PrizePayoutRequestStatus.APPROVED
        && status !== PrizePayoutRequestStatus.COMPLETED
        && status !== PrizePayoutRequestStatus.MANUAL_RESOLUTION;
};

export const getPrizePayoutIneligibilityMessage = (ticket: PurchasedTicket): string | null => {
    if (ticket.drawResultStatus !== 'WON') {
        return null;
    }
    const status = ticket.activePayoutStatus as PrizePayoutRequestStatus | undefined;
    if (status === PrizePayoutRequestStatus.PENDING
        || status === PrizePayoutRequestStatus.APPROVED
        || ticket.payoutState === 'PAYOUT_PENDING') {
        return 'Vé đang có yêu cầu trả thưởng đang xử lý.';
    }
    if (ticket.payoutState === 'PAID_OUT' || status === PrizePayoutRequestStatus.COMPLETED) {
        return null;
    }
    if (status === PrizePayoutRequestStatus.MANUAL_RESOLUTION) {
        return 'Yêu cầu trả thưởng trực tuyến đã bị từ chối quá số lần cho phép — vui lòng đến đại lý đổi thưởng.';
    }
    if (ticket.redemptionZone === 'PAST_ISSUER_LOCKED') {
        return 'Đã hết hạn trả thưởng — không thể đổi thưởng.';
    }
    if (ticket.redemptionZone === 'PAST_CUSTOMER_URGENT') {
        const days = ticket.daysRemainingToIssuer;
        if (days != null && days >= 0) {
            const dayLabel = days === 0
                ? 'hôm nay'
                : days === 1
                    ? '1 ngày'
                    : `${days} ngày`;
            return days === 0
                ? 'Đã hết hạn đổi thưởng trực tuyến. Vui lòng mang vé đến đại lý trong hôm nay trước khi hết hạn chính thức.'
                : `Đã hết hạn đổi thưởng trực tuyến. Vui lòng mang vé đến đại lý trong ${dayLabel} tới (còn hạn lĩnh nhà đài).`;
        }
        return 'Đã hết hạn đổi thưởng trực tuyến. Vui lòng mang vé đến đại lý nếu còn trong hạn lĩnh nhà đài.';
    }
    if (ticket.canClaimOnline === false || ticket.claimChannel === 'IN_PERSON') {
        return 'Vé này bắt buộc đổi thưởng trực tiếp tại đại lý.';
    }
    if (!ticket.serialStatus || !PAYOUT_ELIGIBLE_SERIAL_STATUSES.includes(ticket.serialStatus)) {
        const statusLabel = ticket.serialStatus
            ? SERIAL_STATUS_LABELS[ticket.serialStatus] ?? ticket.serialStatus
            : 'không xác định';
        return `Vé đang ở trạng thái "${statusLabel}" — chưa thể gửi yêu cầu trả thưởng.`;
    }
    return null;
};


export const formatPrizePayoutCurrency = (value?: number | null) =>
    value == null ? '—' : `${Number(value).toLocaleString('vi-VN')}đ`;

// ─── Partial Payout types ────────────────────────────────────────────────────────

export enum PrizeClaimSubmissionStatus {
    DRAFT = 'DRAFT',
    SUBMITTED = 'SUBMITTED',
    CONFIRMED = 'CONFIRMED',
    PAYMENT_PENDING = 'PAYMENT_PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum PrizeClaimSubmissionLineStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    REJECTED_RETRYABLE = 'REJECTED_RETRYABLE',
    REJECTED_FINAL = 'REJECTED_FINAL',
    PAID = 'PAID',
    WITHDRAWN = 'WITHDRAWN',
}

export enum PrizeClaimSubmissionSettlementStatus {
    FULL = 'FULL',
    UNDERPAID = 'UNDERPAID',
    OVERPAID = 'OVERPAID',
}

export enum PrizeClaimRejectionReason {
    PAPER_DAMAGED = 'PAPER_DAMAGED',
    WRONG_STATION = 'WRONG_STATION',
    FRAUD_SUSPECTED = 'FRAUD_SUSPECTED',
    DUPLICATE_CLAIM = 'DUPLICATE_CLAIM',
    EXPIRED = 'EXPIRED',
    OTHER = 'OTHER',
}

export const PRIZE_CIM_SUBMISSION_STATUS_LABELS: Record<PrizeClaimSubmissionStatus, string> = {
    [PrizeClaimSubmissionStatus.DRAFT]: 'Nháp',
    [PrizeClaimSubmissionStatus.SUBMITTED]: 'Đã gửi',
    [PrizeClaimSubmissionStatus.CONFIRMED]: 'Đã xác nhận',
    [PrizeClaimSubmissionStatus.PAYMENT_PENDING]: 'Chờ thanh toán',
    [PrizeClaimSubmissionStatus.COMPLETED]: 'Hoàn thành',
    [PrizeClaimSubmissionStatus.CANCELLED]: 'Đã hủy',
};

export const LINE_STATUS_LABELS: Record<PrizeClaimSubmissionLineStatus, string> = {
    [PrizeClaimSubmissionLineStatus.PENDING]: 'Chờ xác nhận',
    [PrizeClaimSubmissionLineStatus.CONFIRMED]: 'Đã xác nhận',
    [PrizeClaimSubmissionLineStatus.REJECTED_RETRYABLE]: 'Từ chối - có thể nộp lại',
    [PrizeClaimSubmissionLineStatus.REJECTED_FINAL]: 'Từ chối vĩnh viễn',
    [PrizeClaimSubmissionLineStatus.PAID]: 'Đã trả',
    [PrizeClaimSubmissionLineStatus.WITHDRAWN]: 'Đã rút',
};

export const SETTLEMENT_STATUS_LABELS: Record<PrizeClaimSubmissionSettlementStatus, string> = {
    [PrizeClaimSubmissionSettlementStatus.FULL]: 'Đủ',
    [PrizeClaimSubmissionSettlementStatus.UNDERPAID]: 'Thiếu',
    [PrizeClaimSubmissionSettlementStatus.OVERPAID]: 'Thừa',
};

export interface PrizeClaimSubmissionResponse {
    id: number;
    submissionCode: string;
    supplierId: number;
    supplierName?: string;
    periodFrom?: string;
    periodTo?: string;
    totalTicketCount?: number;
    totalGrossPrizeAmount?: number;
    totalNetClaimAmount?: number;
    totalCommissionAmount?: number;
    status: PrizeClaimSubmissionStatus;
    submittedAt?: string;
    submittedBy?: string;
    confirmedAt?: string;
    confirmedBy?: string;
    completedAt?: string;
    completedBy?: string;
    cancelledAt?: string;
    cancelledBy?: string;
    approvedBy?: string;
    confirmationReference?: string;
    confirmationEvidenceUrl?: string;
    paymentDeadline?: string;
    isOverdue?: boolean;
    paidAmount?: number;
    settlementStatus?: PrizeClaimSubmissionSettlementStatus;
    settlementDifferenceAmount?: number;
    cancelReason?: string;
    paymentEvidenceUrls?: string[];
    paymentNote?: string;
    createdAt?: string;
}

export interface PrizeClaimSubmissionLineResponse {
    id: number;
    submissionId: number;
    serialId: number;
    serialNumber?: string;
    ticketNumbers?: string;
    stationId: number;
    drawDate?: string;
    prizeCode?: string;
    prizeDisplayName?: string;
    grossPrizeAmount?: number;
    netClaimAmount?: number;
    commissionAmount?: number;
    lineStatus: PrizeClaimSubmissionLineStatus;
    rejectionReason?: PrizeClaimRejectionReason;
    rejectionNote?: string;
}

export interface PrizeClaimEligibleTicketResponse {
    prizePayoutRequestId: number;
    payoutRequestCode: string;
    serialId: number;
    serialNumber: string;
    ticketNumbers?: string;
    stationId: number;
    drawDate?: string;
    prizeCode?: string;
    prizeDisplayName?: string;
    grossPrizeAmount?: number;
    netClaimAmount?: number;
    commissionAmount?: number;
    payoutCompletedAt?: string;
}

export interface CommitmentVoucherResponse {
    requestId: number;
    commitmentVoucherCode: string;
    remainingAmount: number;
    paidAmountToDate: number;
    totalPrizeAmount: number;
    commitmentExpiresAt: string;
    fundAdvanceNote?: string;
}

export interface PayoutInstallmentResponse {
    id: number;
    requestId: number;
    installmentAmount: number;
    paidAt: string;
    paidBy: string;
    paymentMethod: PrizePayoutPaymentMethod;
    note?: string;
}

export interface PayoutFundPreviewResponse {
    agencyId: string;
    availableBalance: number;
    sufficient: boolean;
    requestedAmount?: number;
}
