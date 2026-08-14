import { createQueryKeyScope } from '@/shared/react-query/createQueryKeys';

export const buyTicketQueryKeys = createQueryKeyScope('public-buy-ticket');

export type BuyTicketListQueryParams = {
    stationIds: string[];
    drawDate: string;
    search?: string;
    searches?: string[];
    tailRanges?: string[];
    numberTypes?: string[];
};

export const buyTicketListQueryKey = (params: BuyTicketListQueryParams) =>
    buyTicketQueryKeys.list(params);
