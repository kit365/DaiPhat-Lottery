'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { listQueryDefaults } from '@/shared/react-query';
import {
    buyTicketListQueryKey,
    type BuyTicketListQueryParams,
} from '../constants/queryKeys';
import { fetchPublicBuyTicketPage, getNextBuyTicketPage } from '../services/buyTicketService';

export const useBuyTicketList = (params: BuyTicketListQueryParams, enabled = true) => {
    const hasStations = params.stationIds.length > 0;
    const hasDrawDate = Boolean(params.drawDate);

    return useInfiniteQuery({
        queryKey: buyTicketListQueryKey(params),
        enabled: enabled && hasStations && hasDrawDate,
        queryFn: ({ pageParam }) => fetchPublicBuyTicketPage(params, pageParam),
        initialPageParam: 1,
        getNextPageParam: getNextBuyTicketPage,
        ...listQueryDefaults,
        refetchOnWindowFocus: 'always',
        staleTime: 0,
    });
};
