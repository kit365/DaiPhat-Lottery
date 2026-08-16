import { useQuery } from '@tanstack/react-query';
import { getPublicSystemConfigsByKeys } from '@/client/services/systemConfigService';
import { publicSystemConfigBatchQueryKey } from '@/constants/queryKeys';

export const usePublicSystemConfigValues = <T extends string>(
    keys: readonly T[],
    defaults: Record<T, string>,
): Record<T, string> => {
    const results = useQuery({
        queryKey: publicSystemConfigBatchQueryKey(keys),
        queryFn: () => getPublicSystemConfigsByKeys(keys),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: false,
        throwOnError: false,
    });

    const values = {} as Record<T, string>;
    keys.forEach((key) => {
        const raw = results.data?.[key]?.configValue?.trim();
        values[key] = raw || defaults[key];
    });
    return values;
};
