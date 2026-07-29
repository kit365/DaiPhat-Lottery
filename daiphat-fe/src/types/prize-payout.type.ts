import { PageResponse } from './api.type';

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
    [PrizePayoutRequestStatus.PENDING]: { label: 'Đang chờ', bg: 'bg-[#FFF9F3]', text: 'text-[#B76E00]' },
    [PrizePayoutRequestStatus.COMPLETED]: { label: 'Đã chuyển', bg: 'bg-[#E4F8ED]', text: 'text-[#1CD162]' },
    [PrizePayoutRequestStatus.REJECTED]: { label: 'Từ chối', bg: 'bg-[#FFF4F4]', text: 'text-[#ee1314]' },
    [PrizePayoutRequestStatus.CANCELLED]: { label: 'Đã hủy', bg: 'bg-[#F4F6F8]', text: 'text-[#637381]' },
};

export const SERIAL_PAYOUT_STATE_LABELS: Record<SerialPayoutState, string> = {
    NONE: 'Đang giữ hộ',
    PAYOUT_PENDING: 'Đang xử lý trả thưởng',
    PAID_OUT: 'Đã trả thưởng',
};

export const formatPrizePayoutCurrency = (value?: number | null) =>
    value == null ? '—' : `${Number(value).toLocaleString('vi-VN')}đ`;
