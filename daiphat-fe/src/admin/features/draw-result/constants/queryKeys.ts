import { createQueryKeyScope } from '@/shared/react-query/createQueryKeys';

const scope = createQueryKeyScope('draw-result');

export const QUERY_KEYS = {
    LOTTERY_RESULTS: 'lottery-results',
    LOTTERY_RESULTS_LIVE: 'lottery-results-live',
    LOTTERY_RESULT_DETAILS: 'lottery-result-details',
} as const;

export const drawResultQueryKeys = {
    scope,
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
