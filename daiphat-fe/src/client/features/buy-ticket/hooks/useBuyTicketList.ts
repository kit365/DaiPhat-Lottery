'use client';

import { useQuery } from '@tanstack/react-query';
import { listQueryDefaults } from '@/shared/react-query';
import {
    buyTicketListQueryKey,
    type BuyTicketListQueryParams,
} from '../constants/queryKeys';
import { fetchAllPublicBuyTickets } from '../services/buyTicketService';

export const useBuyTicketList = (params: BuyTicketListQueryParams, enabled = true) => {
    const hasStations = params.stationIds.length > 0;
    const hasDrawDate = Boolean(params.drawDate);

    return useQuery({
        queryKey: buyTicketListQueryKey(params),
        enabled: enabled && hasStations && hasDrawDate,
        queryFn: async () => ({
            data: await fetchAllPublicBuyTickets(params),
        }),
        ...listQueryDefaults,
    });
};
