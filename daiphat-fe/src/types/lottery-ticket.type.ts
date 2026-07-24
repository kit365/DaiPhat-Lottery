import { PageResponse } from './api.type';

export type TicketSearchMode = 'CONTAINS' | 'SUFFIX' | 'PREFIX' | 'EXACT';

export type TicketDrawResultStatus = 'PENDING_DRAW' | 'WON' | 'LOST';

export interface PublicLotteryTicket {
    id: number;
    stationId: number;
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
    fromDate?: string;
    toDate?: string;
    ticketNumber?: string;
    sortBy?: string;
    direction?: string;
}

export interface PurchasedTicket {
    orderId: string;
    orderCode: string;
    ticketId: number;
    serialNumber?: string;
    numbers: string;
    stationName?: string;
    drawDate: string;
    price: number;
    purchasedAt: string;
    drawResultStatus: TicketDrawResultStatus;
    matchedPrizeCode?: string;
    matchedPrizeDisplayName?: string;
}

export type PublicLotteryTicketPage = PageResponse<PublicLotteryTicket>;
export type PurchasedTicketPage = PageResponse<PurchasedTicket>;
