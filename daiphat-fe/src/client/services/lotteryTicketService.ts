import { apiApp } from '../../api';
import {
    LookupPurchasedTicketsParams,
    PublicLotteryTicketPage,
    PurchasedTicketPage,
    SearchAvailableTicketsParams,
} from '../../types/lottery-ticket.type';
import { ApiResponse } from '../../types/api.type';

const TICKET_BASE = '/lottery-tickets';
const ORDER_BASE = '/orders';

const cleanParams = (params?: Record<string, unknown>) => {
    if (!params) return undefined;
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
};

export const lotteryTicketService = {
    searchAvailableTickets: async (
        params: SearchAvailableTicketsParams
    ): Promise<ApiResponse<PublicLotteryTicketPage>> => {
        const response = await apiApp.get(`${TICKET_BASE}/home`, {
            params: cleanParams({
                page: params.page ?? 1,
                size: params.size ?? 20,
                stationId: params.stationId,
                drawDate: params.drawDate ?? 'today',
                search: params.search,
                searchMode: params.searchMode,
                minPrice: params.minPrice,
                maxPrice: params.maxPrice,
                sortBy: params.sortBy ?? 'numbers',
                direction: params.direction ?? 'asc',
            }),
        });
        return response.data;
    },

    lookupPurchasedTickets: async (
        params: LookupPurchasedTicketsParams
    ): Promise<ApiResponse<PurchasedTicketPage>> => {
        const response = await apiApp.get(`${ORDER_BASE}/my-tickets`, {
            params: cleanParams({
                page: params.page ?? 1,
                size: params.size ?? 20,
                status: params.status,
                fromDate: params.fromDate,
                toDate: params.toDate,
                ticketNumber: params.ticketNumber,
                sortBy: params.sortBy,
                direction: params.direction,
            }),
        });
        return response.data;
    },
};
