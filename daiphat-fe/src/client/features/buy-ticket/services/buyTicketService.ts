import { apiApp } from '@/api';

export const PUBLIC_TICKET_PAGE_SIZE = 48;

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

export type PublicBuyTicketPage = {
    recordList: ReturnType<typeof mapPublicTicketRecord>[];
    page: number;
    totalRecords: number;
    isLast: boolean;
};

export const fetchPublicBuyTicketPage = async (
    params: PublicTicketQueryParams,
    page: number,
): Promise<PublicBuyTicketPage> => {
    const response = await apiApp.get('/lottery-tickets/public', {
        params: {
            page,
            size: PUBLIC_TICKET_PAGE_SIZE,
            stationIds: params.stationIds,
            drawDate: params.drawDate,
            search: params.search || undefined,
            // Tra đuôi số (SUFFIX). CONTAINS còn khớp batchCode (vd. mã chứa ngày -13) nên trả cả kho.
            searchMode: params.search ? 'SUFFIX' : undefined,
            searches: params.searches && params.searches.length > 0 ? params.searches : undefined,
            tailRanges: params.tailRanges && params.tailRanges.length > 0 ? params.tailRanges : undefined,
            numberTypes: params.numberTypes && params.numberTypes.length > 0 ? params.numberTypes : undefined,
            sortBy: undefined,
            direction: undefined,
        },
        paramsSerializer: {
            indexes: null,
        },
        skipGlobalErrorToast: true,
    } as Parameters<typeof apiApp.get>[1]);

    const result = response.data?.data;
    const recordList = (result?.recordList || []).map(mapPublicTicketRecord);
    const pagination = result?.pagination;

    return {
        recordList,
        page,
        totalRecords: pagination?.totalRecords ?? recordList.length,
        isLast: pagination ? Boolean(pagination.isLast) : recordList.length < PUBLIC_TICKET_PAGE_SIZE,
    };
};

export const getNextBuyTicketPage = (lastPage: PublicBuyTicketPage): number | undefined =>
    lastPage.isLast ? undefined : lastPage.page + 1;
