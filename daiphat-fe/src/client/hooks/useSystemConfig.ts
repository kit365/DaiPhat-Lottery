"use client";

import { useQuery } from '@tanstack/react-query';
import { getPublicSystemConfigByKey } from '../services/systemConfigService';
import { publicSystemConfigQueryKey } from '@/constants/queryKeys';
import { QUERY_STALE_TIMES } from '@/shared/react-query';

export const usePublicSystemConfig = (key: string, enabled = true) => {
    return useQuery({
        queryKey: publicSystemConfigQueryKey(key),
        queryFn: () => getPublicSystemConfigByKey(key),
        enabled: enabled && !!key,
        staleTime: QUERY_STALE_TIMES.static,
        retry: false,
        throwOnError: false,
    });
};
