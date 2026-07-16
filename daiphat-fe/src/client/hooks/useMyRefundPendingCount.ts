import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { refundService } from '../services/refundService';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { useAuthStore } from '../../stores/useAuthStore';
import { countPendingRefunds } from '../../types/refund.type';

/**
 * Polls customer's refund statusCounts for the profile sidebar badge (non-PAID count).
 * Shares invalidation with CLIENT_MY_REFUNDS so creates / status changes refresh promptly.
 */
export const useMyRefundPendingCount = () => {
    const { token } = useAuthStore();

    const query = useQuery({
        queryKey: [QUERY_KEYS.CLIENT_MY_REFUNDS, 'pending-count'],
        queryFn: () => refundService.getMyRequests({ page: 1, limit: 1 }),
        enabled: Boolean(token),
        refetchOnWindowFocus: true,
        refetchInterval: 5_000,
        staleTime: 0,
    });

    const pendingCount = useMemo(
        () => countPendingRefunds(query.data?.data?.statusCounts),
        [query.data?.data?.statusCounts]
    );

    return {
        pendingCount,
        isLoading: query.isLoading,
    };
};
