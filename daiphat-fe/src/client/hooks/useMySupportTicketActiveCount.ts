"use client";

import { useQuery } from '@tanstack/react-query';
import { supportTicketService } from '../services/supportTicketService';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { useAuthStore } from '../../stores/useAuthStore';

export const useMySupportTicketActiveCount = () => {
    const { token } = useAuthStore();

    const query = useQuery({
        queryKey: [QUERY_KEYS.CLIENT_MY_COMPLAINTS, 'active-count'],
        queryFn: () => supportTicketService.getMyActiveCount(),
        enabled: Boolean(token),
        refetchOnWindowFocus: true,
        refetchInterval: (query) => {
            if (query.state.error) return false;
            return 5_000;
        },
        staleTime: 0,
    });

    return {
        activeCount: query.data?.data || 0,
        isLoading: query.isLoading,
    };
};
