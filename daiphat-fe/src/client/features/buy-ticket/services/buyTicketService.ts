import { apiApp } from '@/api';

const PUBLIC_TICKET_PAGE_SIZE = 500;
const PUBLIC_TICKET_MAX_PAGES = 50;

export type PublicTicketQueryParams = {
    stationIds: string[];
    drawDate: string;
    search?: string;
    searches?: string[];
    tailRanges?: string[];
    numberTypes?: string[];
};

const mapPublicTicketRecord = (item: Record<string, unknown>) => ({
    ...item,
    _id: item.id,
    avatar: item.ticketImg,
    status: item.status ? String(item.status).toLowerCase() : 'draft',
});

export const fetchAllPublicBuyTickets = async (params: PublicTicketQueryParams) => {
    const merged: ReturnType<typeof mapPublicTicketRecord>[] = [];
    let page = 1;
    let totalRecords = 0;
    let hasMore = true;

    while (hasMore && page <= PUBLIC_TICKET_MAX_PAGES) {
        const response = await apiApp.get('/lottery-tickets/public', {
            params: {
                page,
                size: PUBLIC_TICKET_PAGE_SIZE,
                stationIds: params.stationIds,
                drawDate: params.drawDate,
                search: params.search || undefined,
                searchMode: params.search ? 'CONTAINS' : undefined,
                searches: params.searches && params.searches.length > 0 ? params.searches : undefined,
                tailRanges: params.tailRanges && params.tailRanges.length > 0 ? params.tailRanges : undefined,
                numberTypes: params.numberTypes && params.numberTypes.length > 0 ? params.numberTypes : undefined,
                sortBy: undefined,
                direction: undefined,
            },
            paramsSerializer: {
                indexes: null,
            },
        });

        const result = response.data?.data;
        const recordList = (result?.recordList || []).map(mapPublicTicketRecord);
        merged.push(...recordList);

        const pagination = result?.pagination;
        totalRecords = pagination?.totalRecords ?? merged.length;
        hasMore = pagination ? !pagination.isLast : recordList.length === PUBLIC_TICKET_PAGE_SIZE;
        page += 1;
    }

    return {
        recordList: merged,
        pagination: {
            totalRecords: totalRecords || merged.length,
        },
    };
};
