import { useQuery } from '@tanstack/react-query';
import { prizePayoutAdminApi } from '../services/prizePayoutService';
import type { PrizePayoutCustomerSuggestion } from '@/types/prize-payout.type';

export const QUERY_KEYS = {
    PRIZE_PAYOUT_CUSTOMER_SEARCH: 'prize-payout-customer-search',
} as const;

export const useSearchPayoutCustomers = (
    params: { q: string; limit?: number },
    options?: { enabled?: boolean },
) => {
    return useQuery<PrizePayoutCustomerSuggestion[]>({
        queryKey: [QUERY_KEYS.PRIZE_PAYOUT_CUSTOMER_SEARCH, params.q, params.limit],
        queryFn: async () => {
            const response = await prizePayoutAdminApi.searchCustomers(params);
            return response.data ?? [];
        },
        staleTime: 1000 * 30,
        enabled: (options?.enabled !== false) && params.q.length >= 2,
    });
};
