import { PageResponse } from './api.type';
import { PurchasedTicket } from './lottery-ticket.type';
import { getOrderTypeLabel, OrderType } from './order.type';

export enum PrizePayoutRequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    COMPLETED = 'COMPLETED',
    REJECTED = 'REJECTED',
    MANUAL_RESOLUTION = 'MANUAL_RESOLUTION',
    CANCELLED = 'CANCELLED',
}

export type PrizePayoutChannel = 'ONLINE' | 'IN_PERSON';
export type PrizePayoutPaymentMethod = 'CASH' | 'TRANSFER' | 'COMBINED';
export type PrizePayoutTicketOrigin = 'INTERNAL_ONLINE' | 'INTERNAL_OFFLINE';
export type PrizePayoutOwnershipVerificationLevel =
    | 'AUTO_MATCHED'
    | 'CUSTOMER_LINKED'
    | 'MANUAL_ONLY';

export type SerialPayoutState = 'NONE' | 'PAYOUT_PENDING' | 'PAID_OUT';

export type LotteryTicketSerialStatus =
    | 'IN_STOCK'
    | 'RESERVED'
    | 'PROXY_HOLDING'
    | 'SOLD'
    | 'EXPIRED';

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
}

export interface PrizePayoutLookupResponse {
    items: PrizePayoutLookupItem[];
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
};

export const PRIZE_PAYOUT_CHANNEL_LABELS: Record<PrizePayoutChannel, string> = {
    ONLINE: 'Online',
    IN_PERSON: 'Tại quầy',
};

export const PRIZE_PAYOUT_TICKET_ORIGIN_LABELS: Record<PrizePayoutTicketOrigin, string> = {
    INTERNAL_ONLINE: 'Vé online',
    INTERNAL_OFFLINE: 'Vé mua tại quầy',
};

/** Suy ra loại đơn (Online / Tại quầy) từ orderType hoặc channel/ticketOrigin. */
export function resolvePrizePayoutOrderType(
    detail: Pick<PrizePayoutRequestResponse, 'orderType' | 'channel' | 'ticketOrigin'>
): OrderType | null {
    if (detail.orderType === OrderType.ONLINE || detail.orderType === OrderType.DIRECT) {
        return detail.orderType;
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
    CUSTOMER_LINKED: 'Vé quầy — có KH trên đơn',
    MANUAL_ONLY: 'Vé quầy — không KH / xác minh thủ công',
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
};

export const TICKET_CONDITION_LABELS: Record<TicketCondition, string> = {
    GOOD: 'Tốt',
    DAMAGED: 'Hỏng',
    LOST: 'Thất lạc',
    VOIDED: 'Đã hủy',
};

/** Tình trạng nhận vé vật lý — đã lấy hay còn giữ tại đại lý. */
export type TicketPossessionStatus = 'PICKED_UP' | 'HELD_AT_AGENT' | 'RESERVED' | 'OTHER';

export interface TicketPossessionDisplay {
    status: TicketPossessionStatus;
    label: string;
    hint?: string;
    className: string;
    icon: string;
}

export const resolveTicketPossessionDisplay = (
    ticket: Pick<PurchasedTicket, 'serialStatus' | 'actualPickedUpAt'>
): TicketPossessionDisplay | null => {
    // Serial possession wins over order-level pickup (orders can mix held + picked tickets).
    if (ticket.serialStatus === 'PROXY_HOLDING') {
        return {
            status: 'HELD_AT_AGENT',
            label: 'Đại lý đang giữ hộ',
            hint: 'Vé chưa được bạn lấy tại quầy',
            className: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: 'fa-solid fa-store',
        };
    }
    if (ticket.serialStatus === 'SOLD' || ticket.actualPickedUpAt) {
        return {
            status: 'PICKED_UP',
            label: 'Đã lấy vé',
            hint: 'Bạn đã nhận vé vật lý tại đại lý',
            className: 'bg-sky-50 text-sky-700 border-sky-200',
            icon: 'fa-solid fa-hand-holding',
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
    if (!ticket.serialStatus) {
        return null;
    }
    return {
        status: 'OTHER',
        label: SERIAL_STATUS_LABELS[ticket.serialStatus] ?? ticket.serialStatus,
        className: 'bg-slate-50 text-slate-600 border-slate-200',
        icon: 'fa-solid fa-ticket',
    };
};

const PAYOUT_ELIGIBLE_SERIAL_STATUSES: LotteryTicketSerialStatus[] = ['PROXY_HOLDING', 'EXPIRED'];

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
    return ticket.drawResultStatus === 'WON'
        && ticket.canClaimOnline === true
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
        return 'Yêu cầu trả thưởng online đã bị từ chối quá số lần cho phép — vui lòng đến đại lý đổi thưởng.';
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
