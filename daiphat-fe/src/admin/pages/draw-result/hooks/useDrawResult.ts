import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getAllLotteryResults, getLotteryResultDetails, getLotteryResultsManagementBoard } from '../../../api/draw-result.api';
import { DrawResultFilter } from '../types/draw-result';
import { QUERY_KEYS } from '../../../../constants/queryKeys';

export const useLotteryResults = (filter: DrawResultFilter) => {
    return useQuery({
        queryKey: [QUERY_KEYS.LOTTERY_RESULTS, filter],
        queryFn: () => getAllLotteryResults(filter),
        placeholderData: keepPreviousData,
    });
};

export const useLotteryResultDetails = (id: number | null) => {
    return useQuery({
        queryKey: [QUERY_KEYS.LOTTERY_RESULT_DETAILS, id],
        queryFn: () => getLotteryResultDetails(id!),
        enabled: !!id,
    });
};

export const useLotteryResultsManagementBoard = (filter: DrawResultFilter) => {
    const query = useQuery({
        queryKey: [
            QUERY_KEYS.LOTTERY_RESULTS_LIVE,
            filter.region,
            filter.dateMode,
            filter.drawDate,
            filter.fromDate,
            filter.toDate,
            filter.source
        ],
        queryFn: () => getLotteryResultsManagementBoard(filter),
        enabled: !!filter.region && !!(filter.drawDate || filter.fromDate),
        placeholderData: keepPreviousData,
        refetchInterval: (query) => {
            const liveItems = query.state.data?.data?.results || [];
            const pollSeconds = liveItems
                .map((item) => item.pollAfterSeconds)
                .filter((seconds): seconds is number => typeof seconds === 'number' && seconds > 0)
                .reduce<number | null>((min, seconds) => {
                    if (min === null) {
                        return seconds;
                    }
                    return Math.min(min, seconds);
                }, null);

            return pollSeconds ? pollSeconds * 1000 : false;
        },
    });

    const flattenedRows = useMemo(() => {
        const liveItems = query.data?.data?.results || [];
        return liveItems.map((item) => ({
            ...item.result,
            liveStatus: item.status,
            pollAfterSeconds: item.pollAfterSeconds,
            detailCount: item.details?.length || 0,
            details: item.details || [],
        }));
    }, [query.data?.data?.results]);

    return {
        ...query,
        rows: flattenedRows,
        liveBoard: query.data?.data || null,
    };
};
