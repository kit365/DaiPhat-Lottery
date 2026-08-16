"use client";

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getAllLotteryResults, getLotteryResultDetails, getLotteryResultsManagementBoard, syncLotteryResults } from '../services/drawResultService';
import { DrawResultFilter, SyncDrawResultsRequest } from '../types/draw-result';
import { QUERY_KEYS, drawResultQueryKeys } from '../constants/queryKeys';
import { detailQueryDefaults, listQueryDefaults } from '@/shared/react-query';

export const useLotteryResults = (filter: DrawResultFilter) => {
    return useQuery({
        queryKey: drawResultQueryKeys.list(filter),
        queryFn: () => getAllLotteryResults(filter),
        ...listQueryDefaults,
    });
};

export const useLotteryResultDetails = (id: number | null) => {
    return useQuery({
        queryKey: drawResultQueryKeys.detail(id),
        queryFn: () => getLotteryResultDetails(id!),
        enabled: !!id,
        ...detailQueryDefaults,
    });
};

export const useLotteryResultsManagementBoard = (filter: DrawResultFilter) => {
    const query = useQuery({
        queryKey: drawResultQueryKeys.liveBoard({
            region: filter.region,
            dateMode: filter.dateMode,
            drawDate: filter.drawDate,
            fromDate: filter.fromDate,
            toDate: filter.toDate,
            source: filter.source || 'MINH_NGOC',
        }),
        queryFn: () => getLotteryResultsManagementBoard(filter),
        enabled: !!filter.region && !!(filter.drawDate || filter.fromDate),
        staleTime: 0,
        refetchOnMount: 'always',
        ...listQueryDefaults,
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

export const useSyncLotteryResults = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: SyncDrawResultsRequest) => syncLotteryResults(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: drawResultQueryKeys.liveAll() });
            queryClient.invalidateQueries({ queryKey: drawResultQueryKeys.all() });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LOTTERY_RESULT_DETAILS] });
        },
    });
};
