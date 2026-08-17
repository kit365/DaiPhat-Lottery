import { PageResponse } from './api.type';

export type TicketSearchMode = 'CONTAINS' | 'SUFFIX' | 'PREFIX' | 'EXACT';

export type TicketDrawResultStatus = 'PENDING_DRAW' | 'WON' | 'LOST';

export type SerialPayoutState = 'NONE' | 'PAYOUT_PENDING' | 'PAID_OUT';

export type LotteryTicketSerialStatus =
    | 'IN_STOCK'
    | 'RESERVED'
    | 'PROXY_HOLDING'
    | 'SOLD'
    | 'EXPIRED'
    | 'WITH_STREET_AGENT';

export type OrderDetailStatus =
    | 'PROXY_HOLDING'
    | 'HANDOVER_IN_PROGRESS'
    | 'HANDED_OVER'
    | 'REJECTED_BY_CUSTOMER'
    | 'REFUND_PENDING'
    | 'REFUNDED'
    | 'CANCELLED';

export type TicketCondition = 'GOOD' | 'DAMAGED' | 'LOST' | 'VOIDED' | 'UNDER_IMPORTED';

export type PrizePayoutRequestStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export interface PublicLotteryTicket {
    id: number;
    _id?: number | string;
    stationId: number;
    providerId?: number;
    stationName?: string;
    ticketImg?: string;
    serialNumber?: string;
    numbers: string;
    drawDate: string;
    quantity?: number;
    priceSnapshot?: number;
    status?: string;
    statusDisplayName?: string;
}

export interface SearchAvailableTicketsParams {
    page?: number;
    size?: number;
    stationId?: number | string;
    drawDate?: string;
    search?: string;
    searchMode?: TicketSearchMode;
    sortBy?: string;
    direction?: string;
}

export interface LookupPurchasedTicketsParams {
    page?: number;
    size?: number;
    status?: TicketDrawResultStatus;
    /** When set with WON tickets: true = đã đổi thưởng, false = chưa đổi thưởng. */
    redeemed?: boolean;
    fromDate?: string;
    toDate?: string;
    ticketNumber?: string;
    sortBy?: string;
    direction?: string;
}

export interface PurchasedTicket {
    orderId: string;
    orderCode: string;
    orderDetailId?: number;
    ticketId: number;
    serialId?: number;
    serialNumber?: string;
    serialStatus?: LotteryTicketSerialStatus;
    /** Line-level custody / handover status (source of truth for nhận vé). */
    orderDetailStatus?: OrderDetailStatus | null;
    ticketCondition?: TicketCondition;
    payoutState?: SerialPayoutState;
    numbers: string;
    stationName?: string;
    drawDate: string;
    price: number;
    purchasedAt: string;
    drawResultStatus: TicketDrawResultStatus;
    matchedPrizeCode?: string;
    matchedPrizeDisplayName?: string;
    prizeAmount?: number;
    activePayoutRequestId?: number;
    activePayoutStatus?: PrizePayoutRequestStatus;
    orderType?: 'ONLINE' | 'OFFLINE';
    receiveType?: 'COUNTER_PICKUP';
    /** When set = this line was handed over (not order-level mixed pickup). */
    actualPickedUpAt?: string | null;
    handedOverAt?: string | null;
    rejectedAt?: string | null;
    claimChannel?: 'ONLINE' | 'IN_PERSON';
    canClaimOnline?: boolean;
    customerRedemptionDeadline?: string | null;
    /** Official station/issuer deadline — last day redeemable at counter. */
    issuerRedemptionDeadline?: string | null;
    redemptionZone?: 'WITHIN_CUSTOMER' | 'PAST_CUSTOMER_URGENT' | 'PAST_ISSUER_LOCKED' | null;
    daysRemainingToIssuer?: number | null;
}

export type PublicLotteryTicketPage = PageResponse<PublicLotteryTicket>;
export type PurchasedTicketPage = PageResponse<PurchasedTicket>;
