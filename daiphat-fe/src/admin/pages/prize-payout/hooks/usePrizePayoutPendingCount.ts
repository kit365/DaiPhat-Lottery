import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { prizePayoutAdminApi } from '../../../api/prizePayout.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { hasPermission } from '../../../utils/permission.util';
import { PERMISSIONS } from '../../../constants/permission.constants';
import { PrizePayoutRequestStatus } from '../../../../types/prize-payout.type';
import { ADMIN_BADGE_POLL_MS } from '../../../hooks/adminBadgePoll';

/**
 * Polls staff prize-payout pendingCount for the sidebar badge.
 * Shares invalidation with ADMIN_PRIZE_PAYOUTS so process actions update promptly.
 */
export const usePrizePayoutPendingCount = () => {
    const { user, token } = useAuthStore();
    const canView = Boolean(token) && Boolean(user) && hasPermission(user, PERMISSIONS.PRIZE_PAYOUT.VIEW);

    const query = useQuery({
        queryKey: [QUERY_KEYS.ADMIN_PRIZE_PAYOUTS, 'pending-count'],
        queryFn: () =>
            prizePayoutAdminApi.getStaffRequests({
                page: 1,
                limit: 1,
                status: PrizePayoutRequestStatus.PENDING,
            }),
        enabled: canView,
        refetchOnWindowFocus: canView,
        refetchInterval: (q) => {
            if (!canView) return false;
            if (q.state.error) return false;
            return ADMIN_BADGE_POLL_MS;
        },
        staleTime: ADMIN_BADGE_POLL_MS / 2,
        retry: false,
    });

    const pendingCount = useMemo(() => {
        const fromSummary = query.data?.data?.pendingCount;
        if (typeof fromSummary === 'number') {
            return fromSummary;
        }
        return Number(query.data?.data?.page?.statusCounts?.[PrizePayoutRequestStatus.PENDING] || 0);
    }, [query.data?.data]);

    return {
        pendingCount,
        isLoading: query.isLoading,
    };
};
