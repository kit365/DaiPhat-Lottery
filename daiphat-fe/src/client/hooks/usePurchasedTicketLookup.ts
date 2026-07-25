import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { lotteryTicketService } from '../services/lotteryTicketService';
import { LookupPurchasedTicketsParams } from '../../types/lottery-ticket.type';

export const usePurchasedTicketLookup = (
    params: LookupPurchasedTicketsParams,
    options?: { enabled?: boolean; debounceMs?: number }
) => {
    const debounceMs = options?.debounceMs ?? 400;
    const [debouncedTicketNumber, setDebouncedTicketNumber] = useState(params.ticketNumber ?? '');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedTicketNumber(params.ticketNumber ?? ''), debounceMs);
        return () => clearTimeout(timer);
    }, [params.ticketNumber, debounceMs]);

    const queryParams: LookupPurchasedTicketsParams = {
        ...params,
        ticketNumber: debouncedTicketNumber,
    };

    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_MY_TICKETS, queryParams],
        queryFn: () => lotteryTicketService.lookupPurchasedTickets(queryParams),
        enabled: options?.enabled ?? true,
        placeholderData: (previous) => previous,
        retry: 1,
    });
};
