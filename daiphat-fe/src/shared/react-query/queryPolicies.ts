import { keepPreviousData } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

/**
 * default (2p) List/filter thường, trang client:
 *   GET orders, tickets, cart, buy-ticket list, stations-by-date,
 *   blogs, schedule, fortune (nếu không live), admin lists (user, supplier, station…).
 *
 * static (1h) Ít đổi trong session:
 *   GET system-config, password-policy, master data (region, bank list).
 *
 * live (0) Mở là phải mới (dùng kèm detailQueryDefaults):
 *   GET detail order/ticket/refund/payout/support/import-batch,
 *   GET /me, KQXS đang live, count “của tôi” khi đang thao tác.
 *
 * badge (30s) Số sidebar / banner, poll nhẹ:
 *   GET pending-count, open-ticket-count, chat waiting, draft-banner.
 *
 */
export const QUERY_STALE_TIMES = {
    default: 1000 * 60 * 2,
    static: 1000 * 60 * 60,
    live: 0,
    badge: 30_000,
} as const;

/** Cache còn trong RAM sau khi stale; hết thì xóa. */
export const QUERY_GC_TIME = 1000 * 60 * 10;

/** List / filter — giữ data cũ khi đổi page hoặc filter. */
export const listQueryDefaults = {
    placeholderData: keepPreviousData,
} as const;

/** Detail — luôn fetch mới khi mount. */
export const detailQueryDefaults = {
    staleTime: QUERY_STALE_TIMES.live,
    refetchOnMount: 'always' as const,
} as const;


const getQueryErrorStatus = (error: unknown): number | undefined => {
    if (isAxiosError(error)) {
        return error.response?.status;
    }
    return undefined;
};

/**
 * useQuery: không retry lỗi client (401/403/404/4xx).
 * Retry 5xx, 408, 429 và mất mạng — tối đa 3 lần.
 * 
 * useMutation: không retry
 */
const QUERY_RETRY_LIMIT = 3;

export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
    const status = getQueryErrorStatus(error);

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

export const MUTATION_RETRY = false as const;