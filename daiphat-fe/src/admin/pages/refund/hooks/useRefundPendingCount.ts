"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { refundAdminApi } from "@/admin/features/refund/services/refundService";
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { hasPermission } from '../../../utils/permission.util';
import { PERMISSIONS } from '../../../constants/permission.constants';
import { countPendingRefunds } from '../../../../types/refund.type';
import { ADMIN_BADGE_POLL_MS } from '../../../hooks/adminBadgePoll';
import { useAdminDeferredQueries } from '../../../hooks/useAdminDeferredQueries';

/**
 * Polls staff refund statusCounts for the sidebar badge (non-PAID count).
 * Shares invalidation with ADMIN_REFUNDS so transfers update the badge promptly.
 */
export const useRefundPendingCount = () => {
    const { user, token } = useAuthStore();
    const deferred = useAdminDeferredQueries();
    const canView = Boolean(token) && Boolean(user) && hasPermission(user, PERMISSIONS.REFUND.VIEW);

    const query = useQuery({
        queryKey: [QUERY_KEYS.ADMIN_REFUNDS, 'pending-count'],
        queryFn: () => refundAdminApi.getStaffRefunds({ page: 1, limit: 1 }),
        enabled: canView && deferred,
        refetchOnWindowFocus: canView && deferred,
        refetchInterval: (q) => {
            if (!canView) return false;
            if (q.state.error) return false;
            return ADMIN_BADGE_POLL_MS;
        },
        staleTime: ADMIN_BADGE_POLL_MS / 2,
        retry: false,
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
