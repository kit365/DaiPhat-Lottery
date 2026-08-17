/** Query key buy-ticket — dùng createQueryKeyScope để invalidate theo prefix. */
import { createQueryKeyScope } from '@/shared/react-query/createQueryKeys';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const buyTicketQueryKeys = createQueryKeyScope(QUERY_KEYS.PUBLIC_BUY_TICKET);

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
