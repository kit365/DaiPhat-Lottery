import { QUERY_KEYS } from '@/constants/queryKeys';

export { QUERY_KEYS };

export const drawResultQueryKeys = {
    all: () => [QUERY_KEYS.LOTTERY_RESULTS] as const,
    list: (filter?: unknown) => [QUERY_KEYS.LOTTERY_RESULTS, filter] as const,
    liveBoard: (filter: {
        region?: string;
        dateMode?: string;
        drawDate?: string;
        fromDate?: string;
        toDate?: string;
        source?: string;
    }) =>
        [
            QUERY_KEYS.LOTTERY_RESULTS_LIVE,
            filter.region,
            filter.dateMode,
            filter.drawDate,
            filter.fromDate,
            filter.toDate,
            filter.source,
        ] as const,
    detail: (id: number | null) => [QUERY_KEYS.LOTTERY_RESULT_DETAILS, id] as const,
    liveAll: () => [QUERY_KEYS.LOTTERY_RESULTS_LIVE] as const,
} as const;
