import { keepPreviousData } from '@tanstack/react-query';

export const QUERY_STALE_TIMES = {
    default: 1000 * 60 * 2,
    static: 1000 * 60 * 60,
    live: 0,
    badge: 30_000,
} as const;

/** List / filter — giữ data cũ khi đổi page hoặc filter. */
export const listQueryDefaults = {
    placeholderData: keepPreviousData,
} as const;

/** Detail — luôn fetch mới khi mount. */
export const detailQueryDefaults = {
    staleTime: QUERY_STALE_TIMES.live,
    refetchOnMount: 'always' as const,
} as const;
