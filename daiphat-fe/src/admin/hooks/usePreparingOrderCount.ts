import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '../api/order.api';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { useAuthStore } from '../../stores/useAuthStore';
import { hasPermission } from '../utils/permission.util';
import { PERMISSIONS } from '../constants/permission.constants';

/**
 * Polls order statusCounts for the sidebar PREPARING badge.
 * Shares ADMIN_ORDERS invalidation so status changes update the badge promptly.
 */
export const usePreparingOrderCount = () => {
    const { user } = useAuthStore();
    const canView = hasPermission(user, PERMISSIONS.ORDER.VIEW);

    const query = useQuery({
        queryKey: [QUERY_KEYS.ADMIN_ORDERS, 'preparing-count'],
        queryFn: () => getOrders({ page: 1, size: 1 }),
        enabled: canView,
        refetchOnWindowFocus: true,
        refetchInterval: 5_000,
        staleTime: 0,
    });

    const preparingCount = useMemo(() => {
        const counts = query.data?.data?.statusCounts as Record<string, number> | undefined;
        return Number(counts?.PREPARING) || 0;
    }, [query.data?.data?.statusCounts]);

    return {
        preparingCount,
        isLoading: query.isLoading,
    };
};
