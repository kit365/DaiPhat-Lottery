"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupplierSettlements } from '../services/supplierSettlementService';
import { QUERY_KEYS } from '../constants/queryKeys';
import { useAuthStore } from '@/stores/useAuthStore';
import { hasPermission } from '../../../../utils/permission.util';
import { PERMISSIONS } from '../../../../constants/permission.constants';
import { ADMIN_BADGE_POLL_MS } from '../../../../hooks/adminBadgePoll';

/**
 * Polls supplier settlement count for sidebar badge.
 * Counts records whose status is neither 'OPEN' nor 'CLOSED' (e.g. 'RECEIPT_OVERDUE', etc.).
 */
export const useSupplierSettlementAttentionCount = () => {
    const { user, token } = useAuthStore();
    const canView = Boolean(token) && Boolean(user) && (
        hasPermission(user, PERMISSIONS.IMPORT_BATCH.VIEW) || hasPermission(user, PERMISSIONS.SUPPLIER.VIEW)
    );

    const query = useQuery({
        queryKey: [QUERY_KEYS.SUPPLIER_SETTLEMENTS, 'attention-count'],
        queryFn: () => getSupplierSettlements({ page: 1, size: 50 }),
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

    const attentionCount = useMemo(() => {
        const rawData = query.data?.data as any;
        if (!rawData) return 0;

        const recordList = rawData.recordList || rawData.content || (Array.isArray(rawData) ? rawData : []);
        return recordList.filter((item: any) => {
            const status = String(item?.status || '').trim().toUpperCase();
            return status && status !== 'OPEN' && status !== 'CLOSED';
        }).length;
    }, [query.data?.data]);

    return {
        attentionCount,
        isLoading: query.isLoading,
    };
};
