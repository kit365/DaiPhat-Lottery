import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { lotteryTicketService } from '../services/lotteryTicketService';
import { SearchAvailableTicketsParams } from '../../types/lottery-ticket.type';

export const useLotteryTicketSearch = (
    params: SearchAvailableTicketsParams,
    options?: { enabled?: boolean; debounceMs?: number }
) => {
    const debounceMs = options?.debounceMs ?? 400;
    const [debouncedSearch, setDebouncedSearch] = useState(params.search ?? '');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(params.search ?? ''), debounceMs);
        return () => clearTimeout(timer);
    }, [params.search, debounceMs]);

    const queryParams: SearchAvailableTicketsParams = {
        ...params,
        search: debouncedSearch,
    };

    const hasSearch = (debouncedSearch?.trim().length ?? 0) >= 2;
    const enabled = options?.enabled ?? (hasSearch || !!params.stationId);

    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_LOTTERY_TICKET_SEARCH, queryParams],
        queryFn: () => lotteryTicketService.searchAvailableTickets(queryParams),
        enabled,
        placeholderData: (previous) => previous,
    });
};
