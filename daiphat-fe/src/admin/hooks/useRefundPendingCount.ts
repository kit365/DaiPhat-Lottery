import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { refundAdminApi } from '../api/refund.api';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { useAuthStore } from '../../stores/useAuthStore';
import { hasPermission } from '../utils/permission.util';
import { PERMISSIONS } from '../constants/permission.constants';
import { countPendingRefunds } from '../../types/refund.type';

/**
 * Polls staff refund statusCounts for the sidebar badge (non-PAID count).
 * Shares invalidation with ADMIN_REFUNDS so transfers update the badge promptly.
 */
export const useRefundPendingCount = () => {
    const { user } = useAuthStore();
    const canView = hasPermission(user, PERMISSIONS.REFUND.VIEW);

    const query = useQuery({
        queryKey: [QUERY_KEYS.ADMIN_REFUNDS, 'pending-count'],
        queryFn: () => refundAdminApi.getStaffRefunds({ page: 1, limit: 1 }),
        enabled: canView,
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
