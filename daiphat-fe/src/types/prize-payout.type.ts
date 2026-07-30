import { PageResponse } from './api.type';
import { PurchasedTicket } from './lottery-ticket.type';

export enum PrizePayoutRequestStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
}

export type SerialPayoutState = 'NONE' | 'PAYOUT_PENDING' | 'PAID_OUT';

export type LotteryTicketSerialStatus =
    | 'IN_STOCK'
    | 'RESERVED'
    | 'PROXY_HOLDING'
    | 'SOLD'
    | 'DAMAGED'
    | 'LOST'
    | 'EXPIRED';

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
    bankAccountId?: number;
    bankName?: string;
    bankAccountNumber?: string;
    accountHolderName?: string;
    status: PrizePayoutRequestStatus;
    rejectReason?: string;
    transferEvidenceUrl?: string;
    completedAt?: string;
    completedBy?: string;
    createdAt?: string;
    updatedAt?: string;
    serialStatus?: LotteryTicketSerialStatus;
    payoutState?: SerialPayoutState;
}

export interface CreatePrizePayoutRequest {
    orderDetailId?: number;
    serialId?: number;
    bankAccountId: number;
}

export interface CompletePrizePayoutRequest {
    transferEvidenceUrl: string;
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
    [PrizePayoutRequestStatus.COMPLETED]: { label: 'Đã chuyển', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [PrizePayoutRequestStatus.REJECTED]: { label: 'Từ chối', bg: 'bg-[#FFF4F4]', text: 'text-[#ee1314]' },
    [PrizePayoutRequestStatus.CANCELLED]: { label: 'Đã hủy', bg: 'bg-[#F4F6F8]', text: 'text-[#637381]' },
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
    DAMAGED: 'Hỏng',
    LOST: 'Thất lạc',
};

const PAYOUT_ELIGIBLE_SERIAL_STATUSES: LotteryTicketSerialStatus[] = ['PROXY_HOLDING', 'EXPIRED'];

export type TicketPayoutDisplayStatus =
    | 'NOT_REQUESTED'
    | 'PENDING'
    | 'COMPLETED'
    | 'REJECTED'
    | 'CANCELLED';

export const resolveTicketPayoutDisplay = (
    ticket: PurchasedTicket
): { status: TicketPayoutDisplayStatus; label: string; className: string; icon: string } | null => {
    if (ticket.drawResultStatus !== 'WON') {
        return null;
    }

    if (ticket.payoutState === 'PAID_OUT' || ticket.activePayoutStatus === PrizePayoutRequestStatus.COMPLETED) {
        return {
            status: 'COMPLETED',
            label: 'Đã chuyển khoản',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: 'fa-solid fa-circle-check',
        };
    }

    if (ticket.payoutState === 'PAYOUT_PENDING' || ticket.activePayoutStatus === PrizePayoutRequestStatus.PENDING) {
        return {
            status: 'PENDING',
            label: 'Đang xử lý trả thưởng',
            className: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: 'fa-solid fa-hourglass-half',
        };
    }

    if (ticket.activePayoutStatus === PrizePayoutRequestStatus.REJECTED) {
        return {
            status: 'REJECTED',
            label: 'Bị từ chối trả thưởng',
            className: 'bg-rose-50 text-rose-600 border-rose-200',
            icon: 'fa-solid fa-circle-xmark',
        };
    }

    if (ticket.activePayoutStatus === PrizePayoutRequestStatus.CANCELLED) {
        return {
            status: 'CANCELLED',
            label: 'Đã hủy yêu cầu',
            className: 'bg-slate-100 text-slate-600 border-slate-200',
            icon: 'fa-solid fa-ban',
        };
    }

    return {
        status: 'NOT_REQUESTED',
        label: 'Chưa yêu cầu trả thưởng',
        className: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: 'fa-solid fa-hand-holding-dollar',
    };
};

export const canRequestPrizePayout = (ticket: PurchasedTicket) =>
    ticket.drawResultStatus === 'WON'
    && ticket.serialStatus != null
    && PAYOUT_ELIGIBLE_SERIAL_STATUSES.includes(ticket.serialStatus)
    && (ticket.payoutState == null || ticket.payoutState === 'NONE')
    && ticket.activePayoutStatus !== PrizePayoutRequestStatus.PENDING
    && ticket.activePayoutStatus !== PrizePayoutRequestStatus.COMPLETED;

export const getPrizePayoutIneligibilityMessage = (ticket: PurchasedTicket): string | null => {
    if (ticket.drawResultStatus !== 'WON') {
        return null;
    }
    if (ticket.activePayoutStatus === PrizePayoutRequestStatus.PENDING || ticket.payoutState === 'PAYOUT_PENDING') {
        return 'Vé đang có yêu cầu trả thưởng đang xử lý.';
    }
    if (ticket.payoutState === 'PAID_OUT' || ticket.activePayoutStatus === PrizePayoutRequestStatus.COMPLETED) {
        return null;
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
