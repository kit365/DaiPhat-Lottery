"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getReturnBatches } from '../services/returnBatchService';
import { QUERY_KEYS } from '../constants/queryKeys';
import { useAuthStore } from '@/stores/useAuthStore';
import { hasPermission } from '../../../../utils/permission.util';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { ADMIN_BADGE_POLL_MS } from '../../../../hooks/adminBadgePoll';
import { useAdminDeferredQueries } from '../../../../hooks/useAdminDeferredQueries';

/**
 * Polls active return batches count for sidebar badge.
 * Counts return-batch records where status is NOT 'CANCELLED' and NOT 'HANDED_OVER'.
 */
export const useReturnBatchPendingCount = () => {
    const { user, token } = useAuthStore();
    const deferred = useAdminDeferredQueries();
    const canView = Boolean(token) && Boolean(user) && (
        hasPermission(user, PERMISSIONS.IMPORT_BATCH.VIEW) || hasPermission(user, PERMISSIONS.SUPPLIER.VIEW)
    );

    const query = useQuery({
        queryKey: [QUERY_KEYS.RETURN_BATCHES, 'pending-count'],
        queryFn: () => getReturnBatches({ page: 1, size: 50 }),
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

    const pendingCount = useMemo(() => {
        const rawData = query.data?.data as any;
        if (!rawData) return 0;

        // If counts are returned from backend summary
        const pendingInspection = rawData.pendingInspectionCount ?? 0;
        const inspecting = rawData.inspectingCount ?? 0;
        const pendingHandover = rawData.pendingHandoverCount ?? 0;

        if (pendingInspection > 0 || inspecting > 0 || pendingHandover > 0) {
            return pendingInspection + inspecting + pendingHandover;
        }

        // Fallback filter over records
        const recordList = rawData.recordList || rawData.content || [];
        return recordList.filter(
            (item: any) => item.status !== 'CANCELLED' && item.status !== 'HANDED_OVER'
        ).length;
    }, [query.data?.data]);

    return {
        pendingCount,
        isLoading: query.isLoading,
    };
};
