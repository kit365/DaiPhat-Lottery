"use client";

import { useQuery } from '@tanstack/react-query';
import { getEcommerceOverview, EMPTY_ECOMMERCE_OVERVIEW } from '@/admin/features/dashboard/services/dashboardService';
import { dashboardQueryKeys } from '@/admin/features/dashboard/constants/queryKeys';
import { QUERY_STALE_TIMES } from '@/shared/react-query';

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
