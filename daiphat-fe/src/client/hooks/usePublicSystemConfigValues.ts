import { useQueries } from '@tanstack/react-query';
import { getPublicSystemConfigByKey } from '@/client/services/systemConfigService';

/** Shared query key so Header / Footer / favicon share one cache entry per key. */
export const publicSystemConfigQueryKey = (key: string) =>
    ['public-system-config', key] as const;

export const usePublicSystemConfigValues = <T extends string>(
    keys: readonly T[],
    defaults: Record<T, string>
): Record<T, string> => {
    const results = useQueries({
        queries: keys.map((key) => ({
            queryKey: publicSystemConfigQueryKey(key),
            queryFn: () => getPublicSystemConfigByKey(key),
            staleTime: 5 * 60 * 1000,
        })),
    });

    const values = {} as Record<T, string>;
    keys.forEach((key, i) => {
        const raw = results[i]?.data?.configValue?.trim();
        values[key] = raw || defaults[key];
    });
    return values;
};
