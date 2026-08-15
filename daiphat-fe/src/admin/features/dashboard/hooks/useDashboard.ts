"use client";

import { useQuery } from '@tanstack/react-query';
import { getStaffingStatus, getEcommerceOverview, EMPTY_ECOMMERCE_OVERVIEW } from '@/admin/features/dashboard/services/dashboardService';
import { dashboardQueryKeys } from '@/admin/features/dashboard/constants/queryKeys';
import { QUERY_STALE_TIMES } from '@/shared/react-query';

export const useStaffingStatusToday = (date: string) => {
    return useQuery({
        queryKey: dashboardQueryKeys.staffingStatus(date),
        queryFn: () => getStaffingStatus(date),
        refetchInterval: 300_000,
        staleTime: QUERY_STALE_TIMES.badge,
    });
};

export const useEcommerceOverview = () => {
    return useQuery({
        queryKey: dashboardQueryKeys.ecommerceOverview(),
        queryFn: async () => {
            const res = await getEcommerceOverview();
            return res.data ?? { overview: EMPTY_ECOMMERCE_OVERVIEW, isDemo: true };
        },
        staleTime: QUERY_STALE_TIMES.badge,
    });
};

