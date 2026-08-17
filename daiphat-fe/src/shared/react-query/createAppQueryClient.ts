/**
 * Tạo QueryClient dùng chung (Providers, prefetch SSR).
 * Default staleTime / gcTime / retry; abort query qua queryAbort.ts.
 */
import { keepPreviousData, QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { createAbortAwareQueryCache } from './queryAbort';

/**
 * default (2p) List/filter thường.
 * static (1h) Config, password-policy, master data.
 * live (0) Detail / /me / KQXS live — dùng kèm detailQueryDefaults.
 * badge (30s) Số sidebar / banner.
 */
export const QUERY_STALE_TIMES = {
    default: 0,
    static: 0,
    live: 0,
    badge: 0,
} as const;

const QUERY_GC_TIME = 1000 * 60 * 10;

export const listQueryDefaults = {
    placeholderData: keepPreviousData,
} as const;

export const detailQueryDefaults = {
    staleTime: QUERY_STALE_TIMES.live,
    refetchOnMount: 'always' as const,
} as const;

const QUERY_RETRY_LIMIT = 3;
const MUTATION_RETRY = false as const;

/** Query: không retry 4xx (trừ 408/429). Retry 5xx / mạng tối đa 3 lần. Mutation: không retry. */
const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
    const status = isAxiosError(error) ? error.response?.status : undefined;

    if (status != null) {
        if (status === 408 || status === 429) {
            return failureCount < QUERY_RETRY_LIMIT;
        }
        if (status >= 400 && status < 500) {
            return false;
        }
    }

    return failureCount < QUERY_RETRY_LIMIT;
};

/** QueryClient app + prefetch SSR. Default stale/retry ở đây. */
export const createAppQueryClient = (): QueryClient => {
    return new QueryClient({
        queryCache: createAbortAwareQueryCache(),
        defaultOptions: {
            queries: {
                staleTime: QUERY_STALE_TIMES.default,
                gcTime: QUERY_GC_TIME,
                refetchOnWindowFocus: true,
                throwOnError: false,
                retry: shouldRetryQuery,
            },
            mutations: {
                throwOnError: false,
                retry: MUTATION_RETRY,
            },
        },
    });
};
